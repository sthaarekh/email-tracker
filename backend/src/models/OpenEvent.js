import mongoose from "mongoose";

const openEventSchema = new mongoose.Schema(
  {
    trackedEmail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrackedEmail",
      required: true,
      index: true,
    },

    openedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

openEventSchema.index({ trackedEmail: 1, openedAt: -1 });

const OpenEvent = mongoose.model("OpenEvent", openEventSchema);

export default OpenEvent;
