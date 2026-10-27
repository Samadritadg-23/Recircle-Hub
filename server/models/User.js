import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    hostel: { type: String, trim: true, default: "", maxlength: 80 },
    isDemo: { type: Boolean, default: false },
    phone: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 15,
    },
    hidePhoneUntilAccepted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    hostel: this.hostel,
    isDemo: this.isDemo,
    hidePhoneUntilAccepted: this.hidePhoneUntilAccepted,
  };
};

export default mongoose.model("User", userSchema);
