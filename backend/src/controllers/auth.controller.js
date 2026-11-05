import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import RefreshSession from "../models/RefreshSession.js";

import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshExpiry,
} from "../utils/authToken.js";

const createSession = async (user, res, statusCode = 200) => {
  const secret = generateRefreshToken();

  const session = await RefreshSession.create({
    user: user._id,
    tokenHash: hashToken(secret),
    expiresAt: getRefreshExpiry(),
  });

  const accessToken = generateAccessToken(user._id, session._id);

  return res.status(statusCode).json({
    success: true,
    data: {
      accessToken,
      refreshToken: `${session._id}.${secret}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    },
  });
};

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 100 ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide valid registration details.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  });

  return createSession(user, res, 201);
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  return createSession(user, res);
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (typeof refreshToken !== "string") {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required.",
    });
  }

  const [sessionId, secret, ...extra] = refreshToken.split(".");

  if (
    !sessionId ||
    !secret ||
    extra.length > 0 ||
    !mongoose.isValidObjectId(sessionId)
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token.",
    });
  }

  const session = await RefreshSession.findById(sessionId).select("+tokenHash");

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return res.status(401).json({
      success: false,
      message: "Refresh session is expired or revoked.",
    });
  }

  const currentHash = hashToken(secret);

  if (currentHash !== session.tokenHash) {
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token.",
    });
  }

  const newSecret = generateRefreshToken();
  const newExpiry = getRefreshExpiry();

  // Atomic update prevents two concurrent refresh requests
  // from successfully rotating the same token.
  const updatedSession = await RefreshSession.findOneAndUpdate(
    {
      _id: session._id,
      tokenHash: currentHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        tokenHash: hashToken(newSecret),
        expiresAt: newExpiry,
        lastUsedAt: new Date(),
      },
    },
    {
      new: true,
    }
  );

  if (!updatedSession) {
    return res.status(401).json({
      success: false,
      message: "Refresh token has already been used or expired.",
    });
  }

  const accessToken = generateAccessToken(session.user, session._id);

  return res.status(200).json({
    success: true,
    data: {
      accessToken,
      refreshToken: `${session._id}.${newSecret}`,
    },
  });
};

export const logout = async (req, res) => {
  await RefreshSession.updateOne(
    {
      _id: req.auth.sessionId,
      user: req.user._id,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    }
  );

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
    },
  });
};
