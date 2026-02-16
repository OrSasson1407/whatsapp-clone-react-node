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
  // --- UPGRADE FIELDS ---
  about: {
    type: String,
    default: "Hey there! I am using Snappy.", // Professional status message
    max: 50,
  },
  isOnline: {
    type: Boolean,
    default: false, // Tracks active socket connections in the DB
  },
});

module.exports = mongoose.model("Users", userSchema);