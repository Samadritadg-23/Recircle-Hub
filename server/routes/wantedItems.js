
import express from "express";
import mongoose from "mongoose";
import WantedItem from "../models/WantedItem.js";
import Listing from "../models/Listing.js";
import WantedItemResponse from "../models/WantedItemResponse.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import {
  embedTexts,
  cosineSimilarity,
} from "../services/semanticMatcher.js";

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

    // Find existing listings that may match this new wanted post.
    try {
      const listings = await Listing.find({
        status: "available",
        owner: { $ne: req.user._id },
      })
        .sort({ createdAt: -1 })
        .limit(100);

      if (listings.length > 0) {
        const wantedText = [
          wantedItem.title,
          wantedItem.description,
          wantedItem.category !== "Other" ? wantedItem.category : "",
        ]
          .filter(Boolean)
          .join(". ");

        const listingTexts = listings.map((listing) =>
          [listing.title, listing.description, listing.category]
            .filter(Boolean)
            .join(". ")
        );

        const vectors = await embedTexts([wantedText, ...listingTexts]);
        const wantedVector = vectors[0];

        const matchingListings = [];

        for (let i = 0; i < listings.length; i++) {
          const listing = listings[i];
          const similarity = cosineSimilarity(
            wantedVector,
            vectors[i + 1]
          );

          if (similarity >= 0.60) {
            matchingListings.push({
              listing,
              similarity,
            });
          }
        }

        if (matchingListings.length > 0) {
          const bestMatch = matchingListings[0].listing;

          await Notification.create({
            recipient: req.user._id,
            actor: bestMatch.owner,
            type: "listing_match",
            title: "A listing may match your wanted item",
            message: `"${bestMatch.title}" may match your request "${wantedItem.title}".`,
            wantedItem: wantedItem._id,
            listing: bestMatch._id,
          });
        }
      }
    } catch (matchError) {
      console.error(
        "Wanted-item matching failed:",
        matchError.message
      );
    }


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


/**
 * Find available listings that may match a wanted item.
 * Only the requester can see matches for their own wanted post.
 */
router.get("/:id/matches", requireAuth, async (req, res) => {
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

    if (!wantedItem.requester.equals(req.user._id)) {
      return res.status(403).json({
        error: "Only the requester can view matches.",
      });
    }

    if (wantedItem.status !== "open") {
      return res.json({ matches: [] });
    }

    // Escape user input so it is treated as plain text in regex.

    const listings = await Listing.find({
      status: "available",
      owner: { $ne: wantedItem.requester },
    })
      .populate("owner", "name hostel hidePhoneUntilAccepted")
      .sort({ createdAt: -1 })
      .limit(100);

    if (listings.length === 0) {
      return res.json({ matches: [] });
    }

    const wantedText = [
      wantedItem.title,
      wantedItem.description,
      wantedItem.category !== "Other" ? wantedItem.category : "",
    ]
      .filter(Boolean)
      .join(". ");

    const listingTexts = listings.map((listing) =>
      [
        listing.title,
        listing.description,
        listing.category,
      ]
        .filter(Boolean)
        .join(". ")
    );

    const vectors = await embedTexts([wantedText, ...listingTexts]);
    const wantedVector = vectors[0];

    const wantedWords = new Set(
      wantedText.toLowerCase().match(/[a-z0-9]+/g) || []
    );

    const matches = listings
      .map((listing, index) => {
        const similarity = cosineSimilarity(
          wantedVector,
          vectors[index + 1]
        );

        const categoryMatch =
          wantedItem.category !== "Other" &&
          listing.category === wantedItem.category;

        const listingText =
          `${listing.title} ${listing.description}`.toLowerCase();

        const matchedKeywords = [...wantedWords].filter(
          (word) => word.length >= 3 && listingText.includes(word)
        );

        return {
          listing,
          similarity,
          categoryMatch,
          matchedKeywords,
        };
      })
      .filter((item) => item.similarity >= 0.60)
      .sort((a, b) => {
        const scoreA = a.similarity + (a.categoryMatch ? 0.03 : 0);
        const scoreB = b.similarity + (b.categoryMatch ? 0.03 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 50)
      .map(({ listing, similarity, matchedKeywords, categoryMatch }) => ({
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
        createdAt: listing.createdAt,
        matchScore: Math.round(similarity * 100),
        matchedKeywords,
        categoryMatch,
        owner: listing.owner
          ? {
            id: String(listing.owner._id),
            name:
              listing.owner.hidePhoneUntilAccepted === true
                ? null
                : listing.owner.name,
            hostel:
              listing.owner.hidePhoneUntilAccepted === true
                ? ""
                : listing.owner.hostel,
            hidePhoneUntilAccepted:
              listing.owner.hidePhoneUntilAccepted === true,
          }
          : null,
      }));

    return res.json({ matches });

  }
  catch (error) {
    console.error("Find wanted-item matches error:", error.message);
    return res.status(500).json({
      error: "Could not find matching listings.",
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
