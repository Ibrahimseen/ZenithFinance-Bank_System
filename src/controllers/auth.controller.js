
import User from '../model/user.model.js';
import jwt from 'jsonwebtoken';
import { sendRegistrationEmail } from '../services/emailsender.js';


export const Register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Name & email are required',
            });
        }
        const normalizedEmail = email.trim().toLowerCase();

        const userExist = await User.findOne({
            email: normalizedEmail,
        });

        if (userExist) {
            return res.status(409).json({
                success: false,
                message: 'User already exists',
            });
        }

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,
        });

        const token = jwt.sign(
            { userId: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: '3d' }
        );

        res.cookie('token', token);

        try {
            await sendRegistrationEmail(user.email, user.name);
        } catch (emailError) {
            console.error(
                "Registration email failed:",
                    emailError.message
            );
        }
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'User already exists',
            });
        }
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong during registration',
        });
    }
};


export const Login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }

        const normalizedEmail = email.trim().toLowerCase();

        const verifyUser = await User.findOne({ email: normalizedEmail })
            .select('+password');

        if (!verifyUser) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        const isValidPassword = await verifyUser.comparePassword(password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        const token = jwt.sign(
            { userId: verifyUser._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: '3d' }
        );
        res.cookie('token', token);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                _id: verifyUser._id,
                name: verifyUser.name,
                email: verifyUser.email,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong during login',
        });
    }
};



export const Logout = (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "User logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong during logout",
        });
    }
};
