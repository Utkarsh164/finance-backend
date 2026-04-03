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



// ====================== ADMIN ONLY ROUTES ======================
router.get("/all", authenticate, requireAdmin, getAllUsers);        // GET /users
router.put("/update/:id", authenticate, requireAdmin, updateUser);

module.exports = router;