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

router.post("/register", register);
router.post("/login", login);

router.get("/logout", authenticate, logout);


router.get("/all", authenticate, requireAdmin, getAllUsers);
router.put("/update/:id", authenticate, requireAdmin, updateUser);

module.exports = router;