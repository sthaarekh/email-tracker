import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export const generateAccessToken = (userId, sessionId) => {
  return jwt.sign(
    {
      sid: sessionId,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId.toString(),
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: "email-tracker-api",
      audience: "email-tracker-extension",
    }
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(48).toString("hex");
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const getRefreshExpiry = () => {
  const expiry = new Date();

  expiry.setDate(expiry.getDate() + env.REFRESH_TOKEN_EXPIRES_DAYS);

  return expiry;
};
