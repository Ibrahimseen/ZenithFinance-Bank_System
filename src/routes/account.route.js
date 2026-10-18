import express from "express";
import { createAccountController, getAccountBalanceController, getUserAccountsController } from "../controllers/account.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createAccountController)
router.get("/", authMiddleware, getUserAccountsController)

router.get("/balance/:accountId", authMiddleware, getAccountBalanceController)


export default router;
