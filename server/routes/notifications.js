
import express from "express";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Get notifications for the signed-in user
router.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .populate("actor", "name")
      .populate("wantedItem", "title status")
      .sort({ createdAt: -1 })
      .limit(100);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Load notifications error:", error.message);
    res.status(500).json({ error: "Could not load notifications." });
  }
});

// Get unread notification count
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ unreadCount });
  } catch {
    res.status(500).json({ error: "Could not load unread count." });
  }
});

// Mark one notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user._id,
      },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }

    res.json({ notification });
  } catch {
    res.status(400).json({ error: "Could not update notification." });
  }
});

// Mark all notifications as read
router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Could not mark notifications as read." });
  }
});

export default router;
