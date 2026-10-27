
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s()-]{10,20}$/;

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const hostel = String(req.body.hostel || "").trim();
    const phone = String(req.body.phone || "").trim();
    const hidePhoneUntilAccepted =
      req.body.hidePhoneUntilAccepted === true;

    if (name.length < 2) {
      return res.status(400).json({
        error: "Name must be at least 2 characters.",
      });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({
        error: "Enter a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters.",
      });
    }

    if (!PHONE_RE.test(phone) || phone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({
        error: "Enter a valid phone number.",
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      hostel,
      phone,
      hidePhoneUntilAccepted,
    });

    res.status(201).json({
      token: signToken(user),
      user: user.toPublic(),
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({
      error: "Could not create account.",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    res.json({
      token: signToken(user),
      user: user.toPublic(),
    });
  } catch {
    res.status(500).json({
      error: "Could not sign in.",
    });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

export default router;
