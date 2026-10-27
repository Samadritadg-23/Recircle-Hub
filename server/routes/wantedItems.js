
import express from "express";
import mongoose from "mongoose";
import WantedItem from "../models/WantedItem.js";
import WantedItemResponse from "../models/WantedItemResponse.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Create a wanted-item request
router.post("/", requireAuth, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "Other").trim();
    const notifyAll = req.body.notifyAll === true;

    if (title.length < 3 || title.length > 100) {
      return res.status(400).json({
        error: "Title must be between 3 and 100 characters.",
      });
    }

    if (description.length > 500) {
      return res.status(400).json({
        error: "Description cannot exceed 500 characters.",
      });
    }

    const wantedItem = await WantedItem.create({
      title,
      description,
      category,
      requester: req.user._id,
      notifyAll,
    });

    let notifiedCount = 0;

    if (notifyAll) {
      const recipients = await User.find({
        _id: { $ne: req.user._id },
      }).select("_id");

      if (recipients.length > 0) {
        const notifications = recipients.map((user) => ({
          recipient: user._id,
          actor: req.user._id,
          type: "wanted_item",
          title: `Wanted: ${title}`,
          message: `${req.user.name} is looking for ${title}. Can you help?`,
          wantedItem: wantedItem._id,
        }));

        await Notification.insertMany(notifications);
        notifiedCount = notifications.length;
      }
    }

    return res.status(201).json({
      wantedItem,
      notifiedCount,
      message: notifyAll
        ? `Request posted. ${notifiedCount} users notified.`
        : "Wanted-item request posted.",
    });
  } catch (error) {
    console.error("Create wanted item error:", error.message);
    return res.status(500).json({
      error: "Could not create wanted-item request.",
    });
  }
});

// Browse open wanted-item requests
router.get("/", async (_req, res) => {
  try {
    const wantedItems = await WantedItem.find({ status: "open" })
      .populate("requester", "name hostel")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({ wantedItems });
  } catch (error) {
    console.error("Load wanted items error:", error.message);
    return res.status(500).json({
      error: "Could not load wanted-item requests.",
    });
  }
});

// View your own wanted-item requests
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const wantedItems = await WantedItem.find({
      requester: req.user._id,
    }).sort({ createdAt: -1 });

    return res.json({ wantedItems });
  } catch (error) {
    console.error("Load your wanted items error:", error.message);
    return res.status(500).json({
      error: "Could not load your wanted-item requests.",
    });
  }
});

// Volunteer to help with a wanted item.
// Contact details are shared only after explicit consent.
router.post("/:id/respond", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const shareContact = req.body.shareContact;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid wanted-item ID.",
      });
    }

    if (typeof shareContact !== "boolean") {
      return res.status(400).json({
        error: "Please choose whether to share your contact details.",
      });
    }

    const wantedItem = await WantedItem.findById(id);

    if (!wantedItem) {
      return res.status(404).json({
        error: "Wanted-item request not found.",
      });
    }

    if (wantedItem.status !== "open") {
      return res.status(400).json({
        error: "This wanted-item request is no longer open.",
      });
    }

    if (String(wantedItem.requester) === String(req.user._id)) {
      return res.status(400).json({
        error: "You cannot respond to your own wanted-item request.",
      });
    }

    const volunteer = await User.findById(req.user._id).select(
      "name phone hostel"
    );

    if (!volunteer) {
      return res.status(401).json({
        error: "Your user account could not be found.",
      });
    }

    if (shareContact && !volunteer.phone) {
      return res.status(400).json({
        error: "Add a phone number to your profile before sharing contact details.",
      });
    }

    let response;

    try {
      response = await WantedItemResponse.create({
        wantedItem: wantedItem._id,
        volunteer: volunteer._id,
        shareContact,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          error: "You have already responded to this wanted-item request.",
        });
      }
      throw error;
    }

    // Only notify the requester if the volunteer agreed to share contact details.
    if (shareContact) {
      await Notification.create({
        recipient: wantedItem.requester,
        actor: volunteer._id,
        type: "wanted_item_response",
        title: "Someone may have your item!",
        message: `${volunteer.name} has the item you're looking for and agreed to share their contact details.`,
        wantedItem: wantedItem._id,
      });
    }

    return res.status(201).json({
      message: shareContact
        ? "Your response was sent. Your contact details have been shared with the requester."
        : "Your response was recorded. Your contact details were not shared.",
      response: {
        _id: response._id,
        wantedItem: response.wantedItem,
        shareContact: response.shareContact,
      },
    });
  } catch (error) {
    console.error("Respond to wanted item error:", error.message);
    return res.status(500).json({
      error: "Could not submit your response.",
    });
  }
});

// View volunteers for your own wanted-item requests.
// Only volunteers who explicitly consented are included with contact details.
router.get("/:id/responses", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid wanted-item ID.",
      });
    }

    const wantedItem = await WantedItem.findById(id);

    if (!wantedItem) {
      return res.status(404).json({
        error: "Wanted-item request not found.",
      });
    }

    if (String(wantedItem.requester) !== String(req.user._id)) {
      return res.status(403).json({
        error: "Only the requester can view responses to this item.",
      });
    }

    const responses = await WantedItemResponse.find({
      wantedItem: wantedItem._id,
      shareContact: true,
    })
      .populate("volunteer", "name phone hostel")
      .sort({ createdAt: -1 });

    return res.json({
      responses: responses.map((response) => ({
        _id: response._id,
        createdAt: response.createdAt,
        volunteer: response.volunteer
          ? {
              name: response.volunteer.name,
              phone: response.volunteer.phone,
              hostel: response.volunteer.hostel,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Load wanted-item responses error:", error.message);
    return res.status(500).json({
      error: "Could not load responses.",
    });
  }
});

// Mark your request fulfilled or cancelled
router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["fulfilled", "cancelled"].includes(status)) {
      return res.status(400).json({
        error: "Status must be fulfilled or cancelled.",
      });
    }

    const wantedItem = await WantedItem.findOne({
      _id: req.params.id,
      requester: req.user._id,
      status: "open",
    });

    if (!wantedItem) {
      return res.status(404).json({
        error: "Open request not found, or you don't own it.",
      });
    }

    wantedItem.status = status;
    await wantedItem.save();

    return res.json({ wantedItem });
  } catch (error) {
    console.error("Update wanted item status error:", error.message);
    return res.status(400).json({
      error: "Could not update wanted-item request.",
    });
  }
});

export default router;
