import express from "express";
import Listing from "../models/Listing.js";
import Request from "../models/Request.js";
import { requireAuth } from "../middleware/auth.js";
import { CATEGORIES, CONDITIONS, MODES } from "../constants.js";
import WantedItem from "../models/WantedItem.js";
import Notification from "../models/Notification.js";
import { embedTexts, cosineSimilarity } from "../services/semanticMatcher.js";

const router = express.Router();

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}


function serializeListing(listing, extra = {}, revealOwner = false) {
  const owner = listing.owner;

  const hideOwnerDetails =
    owner &&
    owner.hidePhoneUntilAccepted === true &&
    !revealOwner;

  return {
    id: String(listing._id),
    title: listing.title,
    description: listing.description,
    category: listing.category,
    imageUrl: listing.imageUrl,
    condition: listing.condition,
    mode: listing.mode,
    price: listing.price,
    pickupLocation: listing.pickupLocation,
    status: listing.status,
    isSample: listing.isSample,
    createdAt: listing.createdAt,
    owner: owner
      ? {
        id: String(owner._id || owner),
        name: hideOwnerDetails ? null : owner.name,
        hostel: hideOwnerDetails ? "" : owner.hostel,
        hidePhoneUntilAccepted:
          owner.hidePhoneUntilAccepted === true,
      }
      : null,
    ...extra,
  };
}


router.get("/meta", (_req, res) => {
  res.json({ categories: CATEGORIES, conditions: CONDITIONS, modes: MODES });
});

router.get("/", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    const mode = String(req.query.mode || "").trim();
    const status = String(req.query.status || "").trim();

    const filter = {};
    if (category && CATEGORIES.includes(category)) filter.category = category;
    if (mode && MODES.includes(mode)) filter.mode = mode;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { pickupLocation: { $regex: search, $options: "i" } },
      ];
    }

    const listings = await Listing.find(filter)
      .populate("owner", "name hostel hidePhoneUntilAccepted")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ listings: listings.map((item) => serializeListing(item)) });
  } catch {
    res.status(500).json({ error: "Could not load listings." });
  }
});

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.user._id })
      .populate("owner", "name hostel hidePhoneUntilAccepted")
      .sort({ createdAt: -1 });
    res.json({
      listings: listings.map((item) => serializeListing(item, {}, true)),
    });
  } catch {
    res.status(500).json({ error: "Could not load your listings." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate("owner", "name hostel hidePhoneUntilAccepted");
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }
    res.json({
      listing: serializeListing(listing),
    });
  } catch {
    res.status(400).json({ error: "Invalid listing id." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim();
    const category = String(req.body.category || "").trim();
    const imageUrl = String(req.body.imageUrl || "").trim();
    const condition = String(req.body.condition || "").trim();
    const mode = String(req.body.mode || "").trim();
    const pickupLocation = String(req.body.pickupLocation || "").trim();
    const price = Number(req.body.price);

    if (title.length < 3) {
      return res.status(400).json({ error: "Title must be at least 3 characters." });
    }
    if (description.length < 10) {
      return res.status(400).json({ error: "Description must be at least 10 characters." });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Choose a valid category." });
    }
    if (!CONDITIONS.includes(condition)) {
      return res.status(400).json({ error: "Choose a valid condition." });
    }
    if (!MODES.includes(mode)) {
      return res.status(400).json({ error: "Choose sell, rent, or free lend." });
    }
    if (!pickupLocation) {
      return res.status(400).json({ error: "Pickup location is required." });
    }
    if (imageUrl && !isHttpUrl(imageUrl)) {
      return res.status(400).json({ error: "Image URL must start with http:// or https://." });
    }
    if (mode !== "lend" && (!Number.isFinite(price) || price <= 0)) {
      return res.status(400).json({ error: "Enter a price greater than 0 for sell or rent listings." });
    }

    const listing = await Listing.create({
      title,
      description,
      category,
      imageUrl,
      condition,
      mode,
      price: mode === "lend" ? 0 : price,
      pickupLocation,
      owner: req.user._id,
    });


    // Notify owners of open wanted posts that semantically match this listing.
    try {
      const wantedItems = await WantedItem.find({
        status: "open",
        requester: { $ne: req.user._id },
      })
        .sort({ createdAt: -1 })
        .limit(100);

      if (wantedItems.length > 0) {
        const listingText = [
          listing.title,
          listing.description,
          listing.category,
        ].filter(Boolean).join(". ");

        const wantedTexts = wantedItems.map((item) =>
          [
            item.title,
            item.description,
            item.category !== "Other" ? item.category : "",
          ].filter(Boolean).join(". ")
        );

        const vectors = await embedTexts([listingText, ...wantedTexts]);
        const listingVector = vectors[0];

        const notifications = [];

        for (let i = 0; i < wantedItems.length; i++) {
          const item = wantedItems[i];
          const similarity = cosineSimilarity(listingVector, vectors[i + 1]);

          const categoryMatch =
            item.category !== "Other" && item.category === listing.category;

          if (similarity < 0.60) continue;

          // Prevent duplicate notifications for this listing–wanted-item pair.
          const alreadyNotified = await Notification.exists({
            recipient: item.requester,
            type: "listing_match",
            wantedItem: item._id,
            listing: listing._id,
          });

          if (alreadyNotified) continue;

          notifications.push({
            recipient: item.requester,
            actor: req.user._id,
            type: "listing_match",
            title: "A listing may match your wanted item",
            message: `"${listing.title}" may match your request "${item.title}".`,
            wantedItem: item._id,
            listing: listing._id,
          });
        }

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      }
    } catch (matchError) {
      // Matching must not prevent a valid listing from being created.
      console.error("Automatic listing match notifications failed:", matchError.message);
    }


    await listing.populate("owner", "name hostel hidePhoneUntilAccepted");
    res.status(201).json({
      listing: serializeListing(listing, {}, true),
    });
  } catch {
    res.status(500).json({ error: "Could not create listing." });
  }
});

router.patch("/:id/complete", requireAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }
    if (!listing.owner.equals(req.user._id)) {
      return res.status(403).json({ error: "Only the owner can mark this listing complete." });
    }
    listing.status = "completed";
    await listing.save();
    await listing.populate("owner", "name hostel hidePhoneUntilAccepted");
    res.json({
      listing: serializeListing(listing, {}, true),
    });
  } catch {
    res.status(400).json({ error: "Could not update listing." });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }
    if (!listing.owner.equals(req.user._id)) {
      return res.status(403).json({ error: "Only the owner can remove this listing." });
    }

    await Request.deleteMany({ listing: listing._id });
    await listing.deleteOne();
    res.json({ ok: true });
  } catch {
    res.status(400).json({ error: "Could not remove listing." });
  }
});

export default router;
