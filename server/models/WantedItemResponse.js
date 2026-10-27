
import mongoose from "mongoose";

const wantedItemResponseSchema = new mongoose.Schema(
  {
    wantedItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WantedItem",
      required: true,
    },
    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shareContact: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);

wantedItemResponseSchema.index(
  { wantedItem: 1, volunteer: 1 },
  { unique: true }
);

export default mongoose.model(
  "WantedItemResponse",
  wantedItemResponseSchema
);
