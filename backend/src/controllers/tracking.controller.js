import mongoose from "mongoose";
import { nanoid } from "nanoid";

import TrackedEmail from "../models/TrackedEmail.js";
import OpenEvent from "../models/OpenEvent.js";

import { recordOpenEvent } from "../services/tracking.service.js";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
  "base64"
);

export const createTrackedEmail = async (req, res) => {
  const { recipientEmail, subject } = req.body;

  if (
    typeof recipientEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid recipient email is required.",
    });
  }

  if (
    subject !== undefined &&
    (typeof subject !== "string" || subject.length > 998)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid email subject.",
    });
  }

  const trackingId = nanoid(32);

  const trackedEmail = await TrackedEmail.create({
    user: req.user._id,
    trackingId,
    recipientEmail: recipientEmail.trim().toLowerCase(),
    subject: subject?.trim() || "",
  });

  return res.status(201).json({
    success: true,
    data: {
      id: trackedEmail._id,
      trackingId,
      status: trackedEmail.status,
    },
  });
};

export const markEmailSent = async (req, res) => {
  const { id } = req.params;
  const { gmailThreadId } = req.body;

  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({
      success: false,
      message: "A valid tracked email ID is required.",
    });
  }

  if (
    gmailThreadId !== undefined &&
    (typeof gmailThreadId !== "string" || gmailThreadId.length > 256)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid Gmail thread ID.",
    });
  }

  const trackedEmail = await TrackedEmail.findOneAndUpdate(
    {
      _id: id,
      user: req.user._id,
      status: "draft",
    },
    {
      $set: {
        status: "sent",
        sentAt: new Date(),
        ...(gmailThreadId ? { gmailThreadId } : {}),
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!trackedEmail) {
    return res.status(404).json({
      success: false,
      message: "Tracked email not found or already sent.",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      id: trackedEmail._id,
      status: trackedEmail.status,
      sentAt: trackedEmail.sentAt,
    },
  });
};

export const getTrackedEmails = async (req, res) => {
  const emails = await TrackedEmail.find({
    user: req.user._id,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("-trackingId -recipientEmail");

  return res.status(200).json({
    success: true,
    data: {
      emails,
    },
  });
};

export const getTrackingEvents = async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "A valid tracked email ID is required.",
    });
  }

  const trackedEmail = await TrackedEmail.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("_id");

  if (!trackedEmail) {
    return res.status(404).json({
      success: false,
      message: "Tracked email not found.",
    });
  }

  const events = await OpenEvent.find({
    trackedEmail: trackedEmail._id,
  })
    .sort({ openedAt: -1 })
    .limit(100)
    .select("openedAt userAgent classification");

  return res.status(200).json({
    success: true,
    data: {
      events,
    },
  });
};

export const trackingPixel = (req, res) => {
  const { trackingId } = req.params;

  res.set({
    "Content-Type": "image/gif",
    "Content-Length": TRANSPARENT_GIF.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Content-Type-Options": "nosniff",
  });

  // Return the image without waiting for database operations.
  res.status(200).end(TRANSPARENT_GIF);

  setImmediate(() => {
    recordOpenEvent(trackingId, req.get("user-agent") || null).catch(
      (error) => {
        console.error("Tracking event recording failed:", error);
      }
    );
  });
};
