const { Router } = require("express");
const {
    register,
    login,
    logout,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} = require("../controllers/users.controller");

const { authenticate, requireAdmin } = require("../middlewares/auth");

const router = Router();

// ====================== PUBLIC ROUTES ======================
router.post("/register", register);
router.post("/login", login);

// ====================== AUTHENTICATED ROUTES ======================
// These require login (any role: Viewer, Analyst, Admin)

router.get("/logout", authenticate, logout);

// Get own profile (recommended way)
router.get("/me", authenticate, getUserById);

// Get any user by ID - Admin only (non-admins can only use /me)
router.get("/:id", authenticate, requireAdmin, getUserById);

// ====================== ADMIN ONLY ROUTES ======================
router.get("/", authenticate, requireAdmin, getAllUsers);        // GET /users
router.put("/:id", authenticate, requireAdmin, updateUser);
router.delete("/:id", authenticate, requireAdmin, deleteUser);

module.exports = router;