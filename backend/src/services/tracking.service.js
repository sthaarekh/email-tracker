import TrackedEmail from "../models/TrackedEmail.js";
import OpenEvent from "../models/OpenEvent.js";

export const recordOpenEvent = async (trackingId, userAgent) => {
  const trackedEmail = await TrackedEmail.findOne({
    trackingId,
    status: "sent",
  }).select("_id");

  if (!trackedEmail) {
    return;
  }

  const openedAt = new Date();

  await OpenEvent.create({
    trackedEmail: trackedEmail._id,
    openedAt,
    userAgent: userAgent?.slice(0, 512) || null,
    classification: "unclassified",
  });

  await TrackedEmail.updateOne(
    { _id: trackedEmail._id },
    {
      $inc: { openCount: 1 },
      $max: { lastOpenedAt: openedAt },
    }
  );
};
