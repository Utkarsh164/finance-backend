const express = require("express");
const cookieParser = require("cookie-parser");
const { PORT } = require("./config");

const userRouter = require("./routers/users.router");
const transactionRouter = require("./routers/transactions.router");

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Finance Backend API is running." });
});

// Routes
app.use("/users", userRouter);
app.use("/transactions", transactionRouter);

// 404 handler
app.use((req, res) => {
  res
    .status(404)
    .json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found.`,
    });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

app.listen(PORT, (err) => {
  if (err) console.error(err);
  console.log(`🚀 Server running on port ${PORT}`);
});
