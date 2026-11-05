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

    userAgent: {
      type: String,
      maxlength: 512,
      default: null,
    },

    classification: {
      type: String,
      enum: ["unclassified", "possible_proxy", "possible_scanner"],
      default: "unclassified",
    },
  },
  {
    timestamps: true,
  }
);

openEventSchema.index({ trackedEmail: 1, openedAt: -1 });

const OpenEvent = mongoose.model("OpenEvent", openEventSchema);

export default OpenEvent;
