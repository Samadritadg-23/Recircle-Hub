import mongoose from "mongoose";
import { REQUEST_STATUSES } from "../constants.js";

const requestSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, trim: true, default: "", maxlength: 300 },
    status: { type: String, enum: REQUEST_STATUSES, default: "pending" },
  },
  { timestamps: true }
);

requestSchema.index({ listing: 1, requester: 1 });
requestSchema.index({ owner: 1, status: 1 });
requestSchema.index({ requester: 1, status: 1 });

export default mongoose.model("Request", requestSchema);
