
import mongoose from "mongoose";

const wantedItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      default: "Other",
      trim: true,
      maxlength: 50,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notifyAll: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["open", "fulfilled", "cancelled"],
      default: "open",
    },
  },
  { timestamps: true }
);

wantedItemSchema.index({ status: 1, createdAt: -1 });
wantedItemSchema.index({ requester: 1, status: 1 });

export default mongoose.model("WantedItem", wantedItemSchema);
