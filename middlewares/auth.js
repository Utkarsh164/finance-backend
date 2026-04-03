const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const prisma = require("../config/prisma");

/**
 * authenticate — verifies JWT from cookie or Authorization header.
 * Attaches req.user with { id, email, role, status } for downstream use.
 */
exports.authenticate = async (req, res, next) => {
    try {
        // Accept token from cookie OR Authorization Bearer header
        let token = req?.cookies?.token;

        if (!token) {
            return res.status(401).json({ success: false, message: "Authentication required. Please login." });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, username: true, email: true, role: true, status: true },
        });

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found. Token may be stale." });
        }

        if (user.status === "INACTIVE") {
            return res.status(403).json({ success: false, message: "Your account has been deactivated." });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ success: false, message: "Token expired. Please login again." });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Invalid token." });
        }
        console.error("Auth middleware error:", error);
        res.status(500).json({ success: false, message: "Internal server error during authentication." });
    }
};

/**
 * requireAdmin — only users with ADMIN role can proceed.
 * Must be used after authenticate.
 */
exports.requireAdmin = (req, res, next) => {
    if (req.user?.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required.",
        });
    }
    next();
};

/**
 * requireAnalystOrAbove — ANALYST and ADMIN can proceed. VIEWERs are blocked.
 * Must be used after authenticate.
 */
exports.requireAnalystOrAbove = (req, res, next) => {
    const allowed = ["ANALYST", "ADMIN"];
    if (!allowed.includes(req.user?.role)) {
        return res.status(403).json({
            success: false,
            message: "Access denied. Analyst or Admin privileges required.",
        });
    }
    next();
};