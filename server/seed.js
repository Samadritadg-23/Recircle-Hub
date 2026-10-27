import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Listing from "./models/Listing.js";

const DEMO_EMAIL = "demo@recirclehub.campus";
const DEMO_PASSWORD = "demo1234";

const SAMPLE_LISTINGS = [
  {
    title: "First-year calculus textbook",
    description:
      "Barely used Thomas' Calculus. Highlighted a few chapters from last semester. Perfect if you want to skip the bookstore markup.",
    category: "Books",
    imageUrl: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=800&q=80",
    condition: "Good",
    mode: "sell",
    price: 350,
    pickupLocation: "Library foyer",
    isSample: true,
  },
  {
    title: "Mini fridge for hostel room",
    description:
      "Compact 45L fridge. Quiet, works well. Looking to rent it out for the rest of the term while I am in a different hostel.",
    category: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80",
    condition: "Like New",
    mode: "rent",
    price: 400,
    pickupLocation: "Hostel B, Block 2",
    isSample: true,
  },
  {
    title: "Scientific calculator (Casio fx-991)",
    description:
      "Lending this out for midterms. Please return after your exam week. No scratches on the screen.",
    category: "Stationery",
    imageUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=80",
    condition: "Good",
    mode: "lend",
    price: 0,
    pickupLocation: "Engineering building lobby",
    isSample: true,
  },
  {
    title: "Study lamp with USB port",
    description:
      "Warm-light desk lamp. Selling because I upgraded. Pickup from the girls' hostel common room.",
    category: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
    condition: "New",
    mode: "sell",
    price: 250,
    pickupLocation: "Hostel C common room",
    isSample: true,
  },
];

export async function seedIfEmpty() {
  const listingCount = await Listing.countDocuments();
  if (listingCount > 0) {
    return { seeded: false };
  }

  let demoUser = await User.findOne({ email: DEMO_EMAIL });
  if (!demoUser) {
    demoUser = await User.create({
      name: "Campus Demo",
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      hostel: "Campus Hub",
      isDemo: true,
    });
  }

  await Listing.insertMany(
    SAMPLE_LISTINGS.map((item) => ({ ...item, owner: demoUser._id }))
  );

  console.log("Seeded labelled sample listings (did not overwrite existing data).");
  return { seeded: true };
}
