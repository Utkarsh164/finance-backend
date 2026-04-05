const prisma = require("../config/prisma");

exports.createTransaction = async (req, res) => {
    try {
        const { amount, type, category, notes } = req.body;

        if (amount === undefined || amount === null) {
            return res.status(400).json({ success: false, message: "amount is required." });
        }
        if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, message: "amount must be a positive number." });
        }
        if (!type) {
            return res.status(400).json({ success: false, message: "type is required (INCOME or EXPENSE)." });
        }
        const validTypes = ["INCOME", "EXPENSE"];
        if (!validTypes.includes(type.toUpperCase())) {
            return res.status(400).json({ success: false, message: "type must be INCOME or EXPENSE." });
        }
        if (!category || category.trim() === "") {
            return res.status(400).json({ success: false, message: "category is required." });
        }

        const transaction = await prisma.transaction.create({
            data: {
                amount: parseFloat(amount),
                type: type.toUpperCase(),
                category: category.trim(),
                notes: notes?.trim() || null,
                transactionDate : new Date(),
                userId: req.user.id,
            },
        });

        res.status(201).json({ success: true, message: "Transaction created successfully.", data: transaction });
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const {type,category,startDate,endDate,page = 1,limit = 10,sort = "desc" } = req.query;

        const where = {};

        if (type) {
            const validTypes = ["INCOME", "EXPENSE"];
            if (!validTypes.includes(type.toUpperCase())) {
                return res.status(400).json({
                    success: false,
                    message: "type must be INCOME or EXPENSE."
                });
            }
            where.type = type.toUpperCase();
        }

        if (category) {
            where.category = {
                contains: category,
                mode: "insensitive"
            };
        }

        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate) where.transactionDate.gte = new Date(startDate);
            if (endDate) where.transactionDate.lte = new Date(endDate);
        }

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const skip = (pageNumber - 1) * limitNumber;

        const order = sort === "asc" ? "asc" : "desc";

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: limitNumber,
                orderBy: { transactionDate: order },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true
                        }
                    }
                }
            }),
            prisma.transaction.count({ where })
        ]);

        return res.status(200).json({
            success: true,
            message: "Transactions fetched successfully.",
            data: transactions,
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                pages: Math.ceil(total / limitNumber)
            }
        });

    } catch (error) {
        console.error("Error fetching transactions:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};

exports.getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { user: { select: { id: true, username: true, email: true } } },
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: "Transaction not found." });
        }

        res.status(200).json({ success: true, message: "Transaction fetched successfully.", data: transaction });
    } catch (error) {
        console.error("Error fetching transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

exports.updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type, category, notes  } = req.body;

        const existing = await prisma.transaction.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Transaction not found." });
        }

        if (req.user.role === "ANALYST" && existing.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: "You can only edit your own transactions." });
        }

        const validTypes = ["INCOME", "EXPENSE"];
        if (type && !validTypes.includes(type.toUpperCase())) {
            return res.status(400).json({ success: false, message: "type must be INCOME or EXPENSE." });
        }
        if (amount !== undefined && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
            return res.status(400).json({ success: false, message: "amount must be a positive number." });
        }

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(type && { type: type.toUpperCase() }),
                ...(category && { category: category.trim() }),
                ...(notes !== undefined && { notes: notes?.trim() || null }),
            },
        });

        res.status(200).json({ success: true, message: "Transaction updated successfully.", data: updated });
    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.transaction.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Transaction not found." });
        }
        if(existing.userId !== req.user.id && req.user.role !== "ADMIN") {
            return res.status(403).json({ success: false, message: "You can only delete your own transactions." });
        }

        await prisma.transaction.delete({ where: { id } });

        res.status(200).json({ success: true, message: "Transaction deleted successfully." });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


exports.getDashboardSummary = async (req, res) => {
    try {
        let targetUserId = req.user.id;
        if (req.user.role === "ADMIN" && req.query.userId) {
            targetUserId = req.query.userId;
        }

        const baseWhere = { userId: targetUserId };

        const [incomeAgg, expenseAgg] = await Promise.all([
            prisma.transaction.aggregate({
                where: { ...baseWhere, type: "INCOME" },
                _sum: { amount: true },
                _count: { id: true },
            }),
            prisma.transaction.aggregate({
                where: { ...baseWhere, type: "EXPENSE" },
                _sum: { amount: true },
                _count: { id: true },
            }),
        ]);

        const totalIncome = incomeAgg._sum.amount || 0;
        const totalExpenses = expenseAgg._sum.amount || 0;
        const netBalance = totalIncome - totalExpenses;

        const categoryRaw = await prisma.transaction.groupBy({
            by: ["category", "type"],
            where: baseWhere,
            _sum: { amount: true },
            _count: { id: true },
            orderBy: { _sum: { amount: "desc" } },
        });

        const categoryMap = {};
        categoryRaw.forEach(({ category, type, _sum, _count }) => {
            if (!categoryMap[category]) {
                categoryMap[category] = { category, totalIncome: 0, totalExpenses: 0, count: 0 };
            }
            categoryMap[category].count += _count.id;
            if (type === "INCOME") categoryMap[category].totalIncome += _sum.amount || 0;
            else categoryMap[category].totalExpenses += _sum.amount || 0;
        });
        const categoryBreakdown = Object.values(categoryMap);

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyRaw = await prisma.transaction.findMany({
            where: { ...baseWhere, transactionDate : { gte: twelveMonthsAgo } },
            select: { amount: true, type: true, transactionDate : true },
        });

        const monthlyMap = {};
        monthlyRaw.forEach(({ amount, type, transactionDate  }) => {
            const key = `${transactionDate .getFullYear()}-${String(transactionDate .getMonth() + 1).padStart(2, "0")}`;
            if (!monthlyMap[key]) {
                monthlyMap[key] = { month: key, income: 0, expenses: 0, net: 0 };
            }
            if (type === "INCOME") monthlyMap[key].income += amount;
            else monthlyMap[key].expenses += amount;
        });
        Object.values(monthlyMap).forEach((m) => { m.net = m.income - m.expenses; });
        const monthlyTrends = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

        const recentTransactions = await prisma.transaction.findMany({
            where: baseWhere,
            orderBy: { transactionDate : "desc" },
            take: 5,
            select: { id: true, amount: true, type: true, category: true, notes: true, transactionDate : true },
        });

        res.status(200).json({
            success: true,
            message: "Dashboard summary fetched successfully.",
            data: {
                summary: {
                    totalIncome,
                    totalExpenses,
                    netBalance,
                    totalTransactions: (incomeAgg._count.id || 0) + (expenseAgg._count.id || 0),
                },
                categoryBreakdown,
                monthlyTrends,
                recentTransactions,
            },
        });
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
