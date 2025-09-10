import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: { type: String, trim: true, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default model("AuthUser", userSchema);
