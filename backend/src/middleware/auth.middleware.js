import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import User from "../models/User.js";
import RefreshSession from "../models/RefreshSession.js";
import asyncHandler from "../utils/asyncHandler.js";

const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  const token = authorization.slice(7);

  let decoded;

  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "email-tracker-api",
      audience: "email-tracker-extension",
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }

  const session = await RefreshSession.exists({
    _id: decoded.sid,
    user: decoded.sub,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return res.status(401).json({
      success: false,
      message: "Session expired or revoked.",
    });
  }

  const user = await User.findById(decoded.sub);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User account not found.",
    });
  }

  req.user = user;
  req.auth = {
    sessionId: decoded.sid,
  };

  next();
});

export default authenticate;
