import TrackedEmail from "../models/TrackedEmail.js";
import OpenEvent from "../models/OpenEvent.js";

export const recordOpenEvent = async (trackingId, userAgent) => {
  const trackedEmail = await TrackedEmail.findOne({
    trackingId,
    status: "sent",
  }).select("_id sentAt selfViewUntil");

  if (!trackedEmail) return;

  const openedAt = new Date();

  let classification = "unclassified";

  if (trackedEmail.selfViewUntil && trackedEmail.selfViewUntil > openedAt) {
    classification = "sender"; // the sender is viewing it right now
  } else if (trackedEmail.sentAt && openedAt - trackedEmail.sentAt < 30_000) {
    classification = "early_open"; // Gmail prefetch / sender checking right after sending
  }

  await OpenEvent.create({
    trackedEmail: trackedEmail._id,
    openedAt,
    userAgent: userAgent?.slice(0, 512) || null,
    classification,
  });

  // Only genuine opens count
  if (classification !== "unclassified") return;

  await TrackedEmail.updateOne(
    { _id: trackedEmail._id },
    {
      $inc: { openCount: 1 },
      $max: { lastOpenedAt: openedAt },
    }
  );
};
