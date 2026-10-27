
import express from "express";
import Listing from "../models/Listing.js";
import Request from "../models/Request.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

function serializeRequest(item, viewerIsRequester = false) {
  const listing = item.listing;
  const owner = item.owner;
  const requester = item.requester;

  const canRevealOwner =
    owner &&
    (
      !viewerIsRequester ||
      owner.hidePhoneUntilAccepted !== true ||
      item.status === "accepted"
    );

  return {
    id: String(item._id),
    status: item.status,
    message: item.message,
    createdAt: item.createdAt,

    listing: listing
      ? {
          id: String(listing._id || listing),
          title: listing.title,
          mode: listing.mode,
          price: listing.price,
          status: listing.status,
          imageUrl: listing.imageUrl,
          pickupLocation: listing.pickupLocation,
        }
      : null,

    requester: requester
      ? {
          id: String(requester._id || requester),
          name: requester.name,
          email: requester.email,
          hostel: requester.hostel,
        }
      : null,

    owner: owner
      ? {
          id: String(owner._id || owner),
          name: canRevealOwner ? owner.name : null,
          hostel: canRevealOwner ? owner.hostel : "",
          phone: canRevealOwner ? owner.phone : null,
        }
      : null,
  };
}

const ownerPopulate = {
  path: "owner",
  select: "name hostel phone hidePhoneUntilAccepted",
};

const requesterPopulate = {
  path: "requester",
  select: "name email hostel",
};

const requestPopulates = [
  { path: "listing" },
  requesterPopulate,
  ownerPopulate,
];

router.post("/", requireAuth, async (req, res) => {
  try {
    const listingId = String(req.body.listingId || "");
    const message = String(req.body.message || "").trim();

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    if (listing.owner.equals(req.user._id)) {
      return res.status(400).json({
        error: "You cannot request your own listing.",
      });
    }

    if (listing.status !== "available") {
      return res.status(400).json({
        error: "This item is no longer available.",
      });
    }

    const existing = await Request.findOne({
      listing: listing._id,
      requester: req.user._id,
      status: "pending",
    });

    if (existing) {
      return res.status(409).json({
        error: "You already have a pending request for this item.",
      });
    }

    const request = await Request.create({
      listing: listing._id,
      requester: req.user._id,
      owner: listing.owner,
      message,
    });

    await request.populate(requestPopulates);

    res.status(201).json({
      request: serializeRequest(request, true),
    });
  } catch (error) {
    console.error("Send request error:", error.message);
    res.status(400).json({ error: "Could not send request." });
  }
});

router.get("/outgoing", requireAuth, async (req, res) => {
  try {
    const requests = await Request.find({
      requester: req.user._id,
    })
      .populate("listing")
      .populate(requesterPopulate)
      .populate(ownerPopulate)
      .sort({ createdAt: -1 });

    res.json({
      requests: requests.map((item) => serializeRequest(item, true)),
    });
  } catch {
    res.status(500).json({
      error: "Could not load your requests.",
    });
  }
});

router.get("/incoming", requireAuth, async (req, res) => {
  try {
    const requests = await Request.find({
      owner: req.user._id,
    })
      .populate("listing")
      .populate(requesterPopulate)
      .populate(ownerPopulate)
      .sort({ createdAt: -1 });

    res.json({
      requests: requests.map((item) => serializeRequest(item, false)),
    });
  } catch {
    res.status(500).json({
      error: "Could not load incoming requests.",
    });
  }
});

router.patch("/:id/accept", requireAuth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    if (!request.owner.equals(req.user._id)) {
      return res.status(403).json({
        error: "Only the listing owner can accept this request.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        error: "This request is no longer pending.",
      });
    }

    const listing = await Listing.findById(request.listing);

    if (!listing || listing.status !== "available") {
      return res.status(400).json({
        error: "This item is no longer available.",
      });
    }

    request.status = "accepted";
    listing.status = "reserved";

    await request.save();
    await listing.save();

    await Request.updateMany(
      {
        listing: listing._id,
        status: "pending",
        _id: { $ne: request._id },
      },
      { $set: { status: "rejected" } }
    );

    await request.populate(requestPopulates);

    res.json({
      request: serializeRequest(request, false),
    });
  } catch (error) {
    console.error("Accept request error:", error.message);
    res.status(400).json({
      error: "Could not accept request.",
    });
  }
});

router.patch("/:id/reject", requireAuth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    if (!request.owner.equals(req.user._id)) {
      return res.status(403).json({
        error: "Only the listing owner can reject this request.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        error: "This request is no longer pending.",
      });
    }

    request.status = "rejected";
    await request.save();
    await request.populate(requestPopulates);

    res.json({
      request: serializeRequest(request, false),
    });
  } catch {
    res.status(400).json({
      error: "Could not reject request.",
    });
  }
});

router.patch("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    if (!request.requester.equals(req.user._id)) {
      return res.status(403).json({
        error: "Only the requester can cancel this request.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        error: "Only pending requests can be cancelled.",
      });
    }

    request.status = "cancelled";
    await request.save();
    await request.populate(requestPopulates);

    res.json({
      request: serializeRequest(request, true),
    });
  } catch {
    res.status(400).json({
      error: "Could not cancel request.",
    });
  }
});

export default router;
