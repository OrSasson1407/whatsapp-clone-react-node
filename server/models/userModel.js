const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    min: 3,
    max: 20,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    max: 50,
  },
  password: {
    type: String,
    required: true,
    min: 8,
  },
  isAvatarImageSet: {
    type: Boolean,
    default: false,
  },
  avatarImage: {
    type: String,
    default: "",
  },
  // --- NEW FEATURES ---
  about: {
    type: String,
    default: "Hey there! I am using Snappy.", // Default WhatsApp-style bio
    max: 50,
  },
  isOnline: {
    type: Boolean,
    default: false, // Helps track if user is currently connected
  }
});

module.exports = mongoose.model("Users", userSchema);