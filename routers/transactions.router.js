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

router.use(authenticate);

router.get("/dashboard", requireAnalystOrAbove, getDashboardSummary);

router.post("/", requireAnalystOrAbove, createTransaction);
router.get("/", getAllTransactions);
router.get("/:id", getTransactionById);
router.put("/:id", requireAnalystOrAbove, updateTransaction);
router.delete("/:id", requireAnalystOrAbove, deleteTransaction);

module.exports = router;
