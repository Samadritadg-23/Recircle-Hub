import mongoose from "mongoose";
import { CATEGORIES, CONDITIONS, MODES, LISTING_STATUSES } from "../constants.js";

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    category: { type: String, required: true, enum: CATEGORIES },
    imageUrl: { type: String, trim: true, default: "" },
    condition: { type: String, required: true, enum: CONDITIONS },
    mode: { type: String, required: true, enum: MODES },
    price: { type: Number, default: 0, min: 0 },
    pickupLocation: { type: String, required: true, trim: true, maxlength: 120 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: LISTING_STATUSES, default: "available" },
    isSample: { type: Boolean, default: false },
  },
  { timestamps: true }
);

listingSchema.index({ title: "text", description: "text", pickupLocation: "text" });
listingSchema.index({ category: 1, mode: 1, status: 1 });

export default mongoose.model("Listing", listingSchema);
