import { Router } from "express";

import authenticate from "../middleware/auth.middleware.js";
import asyncHandler from "../utils/asyncHandler.js";

import {
  createTrackedEmail,
  markEmailSent,
  getTrackedEmails,
  getTrackingEvents,
  trackingPixel,
  getTrackingActivity,
  linkGmailThread,
  markSelfView
} from "../controllers/tracking.controller.js";

const router = Router();

// Public endpoint: email clients request this image.
router.get("/t/:trackingId.gif", trackingPixel);

// Protected endpoints: extension must authenticate.
router.post("/emails", authenticate, asyncHandler(createTrackedEmail));

router.post("/emails/self-view", authenticate, asyncHandler(markSelfView));

router.patch("/emails/:id/sent", authenticate, asyncHandler(markEmailSent));

router.get("/emails", authenticate, asyncHandler(getTrackedEmails));

router.get("/emails/:id/events", authenticate, asyncHandler(getTrackingEvents));

router.get("/activity", authenticate, asyncHandler(getTrackingActivity));

router.patch("/emails/:id/thread", authenticate, asyncHandler(linkGmailThread));

export default router;
