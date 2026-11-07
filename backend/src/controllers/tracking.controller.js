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
    gmailThreadId !== null &&
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
    status: "sent",
  })
    .sort({ sentAt: -1 })
    .limit(100)
    .select(
      "_id subject gmailThreadId status openCount lastOpenedAt sentAt createdAt"
    )
    .lean();

  return res.status(200).json({
    success: true,
    data: {
      emails,
    },
  });
};

export const markSelfView = async (req, res) => {
  const { trackingId } = req.body;

  if (
    typeof trackingId !== "string" ||
    !/^[A-Za-z0-9_-]{32}$/.test(trackingId)
  ) {
    return res.status(400).json({ success: false, message: "Invalid tracking ID." });
  }

  // Only the owner can mark their own email, so a recipient with the extension has no effect
  const email = await TrackedEmail.findOneAndUpdate(
    { trackingId, user: req.user._id, status: "sent" },
    { $set: { selfViewUntil: new Date(Date.now() + 20_000) } },
    { new: true }
  ).select("_id");

  if (!email) {
    return res.status(404).json({ success: false, message: "Tracked email not found." });
  }

  // If the pixel hit arrived before this call, reclassify it and undo the count
  const result = await OpenEvent.updateMany(
    {
      trackedEmail: email._id,
      classification: "unclassified",
      openedAt: { $gte: new Date(Date.now() - 10_000) },
    },
    { $set: { classification: "sender" } }
  );

  if (result.modifiedCount > 0) {
    await TrackedEmail.updateOne(
      { _id: email._id, openCount: { $gte: result.modifiedCount } },
      { $inc: { openCount: -result.modifiedCount } }
    );
  }

  return res.status(200).json({ success: true });
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

export const getTrackingActivity = async (req, res) => {
  const userId = req.user._id;

  const [emails, events, totalTracked, openedEmails, totals] =
    await Promise.all([
      TrackedEmail.find({
        user: userId,
        status: "sent",
      })
        .sort({ sentAt: -1 })
        .limit(20)
        .select(
          "_id subject recipientEmail openCount lastOpenedAt sentAt gmailThreadId"
        )
        .lean(),

      OpenEvent.find()
        .sort({ openedAt: -1 })
        .limit(50)
        .select("trackedEmail openedAt classification")
        .populate({
          path: "trackedEmail",
          match: { user: userId, status: "sent" },
          select: "_id subject",
        })
        .lean(),

      TrackedEmail.countDocuments({
        user: userId,
        status: "sent",
      }),

      TrackedEmail.countDocuments({
        user: userId,
        status: "sent",
        openCount: { $gt: 0 },
      }),

      TrackedEmail.aggregate([
        {
          $match: {
            user: userId,
            status: "sent",
          },
        },
        {
          $group: {
            _id: null,
            totalOpens: { $sum: "$openCount" },
          },
        },
      ]),
    ]);

  const activity = events
    .filter((event) => event.trackedEmail)
    .map((event) => ({
      email: event.trackedEmail,
      openedAt: event.openedAt,
      classification: event.classification,
    }));

  return res.status(200).json({
    success: true,
    data: {
      emails,
      activity,
      summary: {
        totalTracked,
        openedEmails,
        totalOpens: totals[0]?.totalOpens || 0,
      },
    },
  });
};

export const linkGmailThread = async (req, res) => {
  const { id } = req.params;
  const { gmailThreadId } = req.body;

  if (
    typeof gmailThreadId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,256}$/.test(gmailThreadId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid Gmail thread ID.",
    });
  }

  const email = await TrackedEmail.findOneAndUpdate(
    {
      _id: id,
      user: req.user._id,
      status: "sent",
    },
    {
      $set: { gmailThreadId },
    },
    {
      new: true,
    }
  );

  if (!email) {
    return res.status(404).json({
      success: false,
      message: "Tracked email not found.",
    });
  }

  return res.json({
    success: true,
    data: {
      id: email._id,
      gmailThreadId: email.gmailThreadId,
    },
  });
};
