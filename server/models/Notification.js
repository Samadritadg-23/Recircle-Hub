
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        type: {
            type: String,
            enum: [
                "wanted_item",
                "wanted_item_fulfilled",
                "wanted_item_response",
                "listing_match",
            ],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 300,
        },
        wantedItem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "WantedItem",
            default: null,
        },
        listing: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Listing",
            default: null,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
