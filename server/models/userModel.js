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
  about: {
    type: String,
    default: "Hey there! I am using Snappy.",
    max: 50,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  // --- NEW: Organization Fields ---
  // Storing IDs of users/groups
  pinnedChats: { 
    type: [String], 
    default: [] 
  }, 
  archivedChats: { 
    type: [String], 
    default: [] 
  },
  mutedChats: { 
    type: [String], // List of IDs that are muted
    default: [] 
  }
});

module.exports = mongoose.model("Users", userSchema);