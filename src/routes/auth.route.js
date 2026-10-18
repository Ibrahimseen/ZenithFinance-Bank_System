import express from "express";
import { Login, Logout, Register, resendOTP, verifyOTP } from "../controllers/auth.controller.js";
import { loginLimiter, otpLimiter } from "../middleware/RatelimitMiddleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", loginLimiter, Register);
router.post("/login", loginLimiter, Login);
router.post("/resend-otp", otpLimiter, resendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/logout", Logout);
router.get("/me", authMiddleware, (req, res) => {
    res.status(200).json({
        success: true,
        user: {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            isVerified: req.user.isVerified,
        },
    });
});

export default router;
