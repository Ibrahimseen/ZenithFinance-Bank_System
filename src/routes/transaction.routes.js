import express from "express";
import { createInitialFundsTransaction, createTransaction } from "../controllers/transaction.controller.js"
import { authMiddleware, authSystemUserMiddleware } from "../middleware/auth.middleware.js";


const transactionRoutes = express.Router();

transactionRoutes.post("/", authMiddleware, createTransaction)
transactionRoutes.post("/system/initial-funds", authSystemUserMiddleware, createInitialFundsTransaction)

export default transactionRoutes;