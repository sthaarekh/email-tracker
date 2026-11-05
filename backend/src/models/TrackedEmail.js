import mongoose from "mongoose";

const trackedEmailSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    trackingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    subject: {
      type: String,
      trim: true,
      maxlength: 998,
      default: "",
    },

    gmailThreadId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "sent"],
      default: "draft",
    },

    sentAt: {
      type: Date,
      default: null,
    },

    lastOpenedAt: {
      type: Date,
      default: null,
    },

    openCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

trackedEmailSchema.index({ user: 1, createdAt: -1 });

const TrackedEmail = mongoose.model("TrackedEmail", trackedEmailSchema);

export default TrackedEmail;
