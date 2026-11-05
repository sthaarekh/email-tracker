import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
} from "../controllers/auth.controller.js";

import authenticate from "../middleware/auth.middleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later.",
  },
});

router.post("/register", authLimiter, asyncHandler(register));
router.post("/login", authLimiter, asyncHandler(login));
router.post("/refresh", authLimiter, asyncHandler(refresh));

router.post("/logout", authenticate, asyncHandler(logout));
router.get("/me", authenticate, asyncHandler(getCurrentUser));

export default router;
