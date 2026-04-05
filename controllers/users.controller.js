const bcrypt = require("bcrypt");
const prisma = require("../config/prisma");
const { generateToken } = require("../utils/generate.Token");

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: "Username, email, and password are required." });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format." });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "Email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userCount = await prisma.user.count();
        const assignedRole = userCount === 0 ? "ADMIN" : "VIEWER";

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role: assignedRole,
                status: "ACTIVE",
            },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                status: true,
                createdAt: true
            },
        });

        res.status(201).json({
            success: true,
            message: `User registered successfully as ${assignedRole}.`,
            data: newUser
        });

    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                username: true,
                email: true,
                password: true,
                role: true,
                status: true
            }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        if (user.status === "INACTIVE") {
            return res.status(403).json({ success: false, message: "Account has been deactivated." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const token = generateToken(user.id);

        res.cookie("token", token, {   
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, 
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        res.status(200).json({
            success: true,
            message: "Logged in successfully.",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

exports.logout = async (req, res) => {
    res.clearCookie("token", "", {
        maxAge: 0,
    });
    res.status(200).json({ success: true, message: "user logged out" });
}

exports.getAllUsers = async (req, res) => {
    try {
        const { status, role, page = 1, limit = 10 } = req.query;

        const where = {};
        if (status) where.status = status.toUpperCase();
        if (role) where.role = role.toUpperCase();

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: parseInt(limit),
                select: { id: true, username: true, email: true, role: true, status: true, createdAt: true },
                orderBy: { createdAt: "desc" },
            }),
            prisma.user.count({ where }),
        ]);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, role, status } = req.body;

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const validRoles = ["ADMIN", "ANALYST", "VIEWER"];
        const validStatuses = ["ACTIVE", "INACTIVE"];

        if (role && !validRoles.includes(role.toUpperCase())) {
            return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
        }
        if (status && !validStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        }

        if (id === req.user.id && role && role.toUpperCase() !== "ADMIN") {
            return res.status(400).json({ success: false, message: "You cannot change your own role." });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: {
                ...(username && { username }),
                ...(role && { role: role.toUpperCase() }),
                ...(status && { status: status.toUpperCase() }),
            },
            select: { id: true, username: true, email: true, role: true, status: true, updatedAt: true },
        });

        res.status(200).json({ success: true, message: "User updated successfully.", data: updated });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
