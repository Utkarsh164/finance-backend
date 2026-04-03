const prisma = require("../config/prisma");

// ─── CREATE TRANSACTION ───────────────────────────────────────────────────────

/**
 * POST /transactions/
 * Body: { amount, type, category, notes?, date? }
 * Requires: ANALYST or ADMIN
 */
exports.createTransaction = async (req, res) => {
    try {
        const { amount, type, category, notes, date } = req.body;

        // Validation
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
                date: date ? new Date(date) : new Date(),
                userId: req.user.id,
            },
        });

        res.status(201).json({ success: true, message: "Transaction created successfully.", data: transaction });
    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─── GET ALL TRANSACTIONS ─────────────────────────────────────────────────────

/**
 * GET /transactions/
 * Query: ?type=INCOME|EXPENSE&category=Food&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=10
 * Admins/Analysts see their own or optionally all (admin: ?all=true).
 * Viewers see their own only.
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const { type, category, startDate, endDate, page = 1, limit = 10, all } = req.query;

        const where = {};

        // Admins can view all transactions with ?all=true; others see their own
        if (req.user.role === "ADMIN" && all === "true") {
            // no userId filter — see everyone's
        } else {
            where.userId = req.user.id;
        }

        if (type) {
            const validTypes = ["INCOME", "EXPENSE"];
            if (!validTypes.includes(type.toUpperCase())) {
                return res.status(400).json({ success: false, message: "type must be INCOME or EXPENSE." });
            }
            where.type = type.toUpperCase();
        }

        if (category) {
            where.category = { contains: category, mode: "insensitive" };
        }

        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { date: "desc" },
                include: {
                    user: { select: { id: true, username: true, email: true } },
                },
            }),
            prisma.transaction.count({ where }),
        ]);

        res.status(200).json({
            success: true,
            message: "Transactions fetched successfully.",
            data: transactions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─── GET ONE TRANSACTION ──────────────────────────────────────────────────────

/**
 * GET /transactions/:id
 * Owners and Admins can view. Others get 403.
 */
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

        // Non-admins can only see their own transactions
        if (req.user.role !== "ADMIN" && transaction.userId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        res.status(200).json({ success: true, message: "Transaction fetched successfully.", data: transaction });
    } catch (error) {
        console.error("Error fetching transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─── UPDATE TRANSACTION ───────────────────────────────────────────────────────

/**
 * PUT /transactions/:id
 * Body: { amount?, type?, category?, notes?, date? }
 * Requires: ANALYST (own) or ADMIN (any)
 */
exports.updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type, category, notes, date } = req.body;

        const existing = await prisma.transaction.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Transaction not found." });
        }

        // Analysts can only edit their own; admins can edit any
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
                ...(date && { date: new Date(date) }),
            },
        });

        res.status(200).json({ success: true, message: "Transaction updated successfully.", data: updated });
    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─── DELETE TRANSACTION ───────────────────────────────────────────────────────

/**
 * DELETE /transactions/:id
 * Requires: ADMIN
 */
exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.transaction.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Transaction not found." });
        }

        await prisma.transaction.delete({ where: { id } });

        res.status(200).json({ success: true, message: "Transaction deleted successfully." });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ─── DASHBOARD SUMMARY ────────────────────────────────────────────────────────

/**
 * GET /transactions/dashboard
 * Query: ?userId=<id> (admin only — to view another user's dashboard)
 * Returns: totalIncome, totalExpenses, netBalance, categoryBreakdown, monthlyTrends, recentTransactions
 * Requires: ANALYST or ADMIN
 */
exports.getDashboardSummary = async (req, res) => {
    try {
        // Determine which user's data to summarise
        let targetUserId = req.user.id;
        if (req.user.role === "ADMIN" && req.query.userId) {
            targetUserId = req.query.userId;
        }

        const baseWhere = { userId: targetUserId };

        // ── 1. Total income & expenses ──────────────────────────────────────
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

        // ── 2. Category-wise breakdown ──────────────────────────────────────
        const categoryRaw = await prisma.transaction.groupBy({
            by: ["category", "type"],
            where: baseWhere,
            _sum: { amount: true },
            _count: { id: true },
            orderBy: { _sum: { amount: "desc" } },
        });

        // Group by category for cleaner response
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

        // ── 3. Monthly trends (last 12 months) ─────────────────────────────
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        twelveMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyRaw = await prisma.transaction.findMany({
            where: { ...baseWhere, date: { gte: twelveMonthsAgo } },
            select: { amount: true, type: true, date: true },
        });

        // Aggregate client-side by month (avoids DB-specific date_trunc)
        const monthlyMap = {};
        monthlyRaw.forEach(({ amount, type, date }) => {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            if (!monthlyMap[key]) {
                monthlyMap[key] = { month: key, income: 0, expenses: 0, net: 0 };
            }
            if (type === "INCOME") monthlyMap[key].income += amount;
            else monthlyMap[key].expenses += amount;
        });
        Object.values(monthlyMap).forEach((m) => { m.net = m.income - m.expenses; });
        const monthlyTrends = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

        // ── 4. Recent 5 transactions ────────────────────────────────────────
        const recentTransactions = await prisma.transaction.findMany({
            where: baseWhere,
            orderBy: { date: "desc" },
            take: 5,
            select: { id: true, amount: true, type: true, category: true, notes: true, date: true },
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
