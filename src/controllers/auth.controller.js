import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import User from "../model/user.model.js";
import { OTP } from "../model/otp.js";
import { sendOTPEmail } from "../services/emailsender.js";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const COOKIE_MAX_AGE = 3 * 24 * 60 * 60 * 1000;

const normalizeEmail = (email) => email.trim().toLowerCase();

const generateOTP = () =>
    crypto.randomInt(100000, 1000000).toString();

const hashOTP = (otp) =>
    crypto.createHash("sha256").update(otp).digest("hex");

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
});

const issueAuthCookie = (res, userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
        { userId: userId.toString() },
        process.env.JWT_SECRET,
        { expiresIn: "3d" }
    );

    res.cookie("token", token, cookieOptions());
};

const publicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
});

export const Register = async (req, res) => {
    try {
        const { name, email, password } = req.body ?? {};

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        if (name.trim().length > 100 || email.trim().length > 254) {
            return res.status(400).json({
                success: false,
                message: "Name or email is too long",
            });
        }

        if (password.length < 8 || password.length > 20) {
            return res.status(400).json({
                success: false,
                message: "Password must be between 8 and 20 characters",
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const normalizedEmail = normalizeEmail(email);

        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: existingUser.isVerified
                    ? "An account with this email already exists"
                    : "Account exists but is not verified. Please request a new OTP.",
            });
        }

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,
            isVerified: false,
        });

        const otp = generateOTP();

        await OTP.deleteMany({
            email: normalizedEmail,
            action: "account_verification",
        });

        await OTP.create({
            email: normalizedEmail,
            otpHash: hashOTP(otp),
            action: "account_verification",
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
            attempts: 0,
        });

        try {
            await sendOTPEmail(
                normalizedEmail,
                otp,
                "account_verification"
            );
        } catch (emailError) {
            console.error("Registration OTP email failed:", emailError);

            await OTP.deleteMany({
                email: normalizedEmail,
                action: "account_verification",
            });

            return res.status(503).json({
                success: false,
                message:"Account created but verification email could not be sent. Please request a new OTP.",
            });
        }

        return res.status(201).json({
            success: true,
            message: "Registration successful. Please verify your email.",
            user: publicUser(user),
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists",
            });
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during registration",
        });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body ?? {};

        if (
            typeof email !== "string" ||
            typeof otp !== "string" ||
            !email.trim() ||
            !/^\d{6}$/.test(otp)
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid email and six-digit OTP are required",
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Account not found",
            });
        }

        if (user.isVerified) {
            await OTP.deleteMany({
                email: normalizedEmail,
                action: "account_verification",
            });

            return res.status(200).json({
                success: true,
                message: "Account is already verified. Please log in.",
            });
        }

        const otpRecord = await OTP.findOne({
            email: normalizedEmail,
            action: "account_verification",
            expiresAt: { $gt: new Date() },
            attempts: { $lt: MAX_OTP_ATTEMPTS },
        }).select("+otpHash");

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "OTP is invalid, expired, or attempts exceeded. Request a new OTP.",
            });
        }

        if (otpRecord.otpHash !== hashOTP(otp)) {
            otpRecord.attempts += 1;
            await otpRecord.save();

            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
                attemptsRemaining: Math.max(
                    0,
                    MAX_OTP_ATTEMPTS - otpRecord.attempts
                ),
            });
        }

        user.isVerified = true;
        await user.save();

        await OTP.deleteMany({
            email: normalizedEmail,
            action: "account_verification",
        });

        return res.status(200).json({
            success: true,
            message: "Email verified successfully. Please log in.",
            user: publicUser(user),
        });
    } catch (error) {
        console.error("OTP verification error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during OTP verification",
        });
    }
};

export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body ?? {};

        if (typeof email !== "string" || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Account not found",
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: "Account is already verified. Please log in.",
            });
        }

        const otp = generateOTP();

        await OTP.deleteMany({
            email: normalizedEmail,
            action: "account_verification",
        });

        await OTP.create({
            email: normalizedEmail,
            otpHash: hashOTP(otp),
            action: "account_verification",
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
            attempts: 0,
        });

        try {
            await sendOTPEmail(
                normalizedEmail,
                otp,
                "account_verification"
            );
        } catch (emailError) {
            console.error("Resend OTP email failed:", emailError);

            await OTP.deleteMany({
                email: normalizedEmail,
                action: "account_verification",
            });

            return res.status(503).json({
                success: false,
                message: "Could not send OTP. Please try again later.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "A new verification OTP has been sent",
        });
    } catch (error) {
        console.error("Resend OTP error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while resending OTP",
        });
    }
};

export const Login = async (req, res) => {
    try {
        const { email, password } = req.body ?? {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const normalizedEmail = normalizeEmail(email);

        const user = await User.findOne({
            email: normalizedEmail,
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                message: "Please verify your email before logging in",
            });
        }

        issueAuthCookie(res, user._id);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: publicUser(user),
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during login",
        });
    }
};

export const Logout = (req, res) => {
    res.clearCookie("token", {
        ...cookieOptions(),
        maxAge: undefined,
    });

    return res.status(200).json({
        success: true,
        message: "User logged out successfully",
    });
};