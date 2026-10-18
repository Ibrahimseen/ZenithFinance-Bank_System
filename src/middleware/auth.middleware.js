import tokenBlackListModel from "../model/blackList.model.js";
import userModel from "../model/user.model.js"
import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, token is missing",
      });
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token });

    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, token is invalid",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, user not found",
      });
    }

    if (user.isVerified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    req.user = user;

    return next();
  } catch (err) {
    if (
      err.name === "TokenExpiredError" ||
      err.name === "JsonWebTokenError" ||
      err.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, token is invalid or expired",
      });
    }

    return next(err);
  }
};

export const authSystemUserMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, token is missing",
      });
    }

    const isBlacklisted = await tokenBlackListModel.findOne({ token });

    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, token is invalid",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel
      .findById(decoded.userId)
      .select("+systemUser");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, user not found",
      });
    }

    if (user.isVerified === false) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    if (!user.systemUser) {
      return res.status(403).json({
        success: false,
        message: "Forbidden access, not a system user",
      });
    }

    req.user = user;

    return next();
  } catch (err) {
    if (
      err.name === "TokenExpiredError" ||
      err.name === "JsonWebTokenError" ||
      err.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access, token is invalid or expired",
      });
    }

    return next(err);
  }
};