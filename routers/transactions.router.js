const { Router } = require("express");
const {
    createTransaction,
    getAllTransactions,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
    getDashboardSummary,
} = require("../controllers/transactions.controller");
const { authenticate, requireAdmin, requireAnalystOrAbove } = require("../middlewares/auth");

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard — must be before /:id to avoid route conflict
router.get("/dashboard", requireAnalystOrAbove, getDashboardSummary);

// CRUD
router.post("/", requireAnalystOrAbove, createTransaction);
router.get("/", getAllTransactions);                              // all roles (viewers read-only)
router.get("/:id", getTransactionById);                          // all roles (scoped to own)
router.put("/:id", requireAnalystOrAbove, updateTransaction);   // analyst+ 
router.delete("/:id", requireAdmin, deleteTransaction);          // admin only

module.exports = router;
