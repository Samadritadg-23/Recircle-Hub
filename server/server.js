import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listings.js";
import requestRoutes from "./routes/requests.js";
import { seedIfEmpty } from "./seed.js";
import wantedItemRoutes from "./routes/wantedItems.js";
import notificationRoutes from "./routes/notifications.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env"), quiet: true });

const app = express();

app.use(
  cors({
    origin: [
      "https://recircle-hub-xi.vercel.app",
      "https://recircle-8cwi4apkw-samadritadg-23.vercel.app",
    ],
  })
);
app.use(express.json({ limit: "200kb" }));

app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to ReCircle Hub API!",
    status: "running",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ReCircle Hub" });
});

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/wanted-items", wantedItemRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from server/.env");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from server/.env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");

    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`ReCircle Hub server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
