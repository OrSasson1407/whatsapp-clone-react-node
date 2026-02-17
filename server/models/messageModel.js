const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema(
  {
    message: {
      text: { type: String, required: false },
      audioUrl: { type: String, required: false },
      // Generic attachment support (Images, Videos, PDFs)
      attachment: {
        url: { type: String }, 
        mimeType: { type: String }, // e.g., 'image/png', 'video/mp4'
        fileName: { type: String },
      },
    },
    users: Array,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // --- NEW: Advanced Message Status ---
    messageStatus: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent"
    },
    // Reference for threading/replies
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Messages", 
      default: null
    },
    // Reactions array
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      }
    ],
    // Link Preview Metadata
    linkMetadata: {
      title: String,
      description: String,
      image: String,
      url: String
    },
    deleted: { type: Boolean, default: false }
  },
  {
    timestamps: true,
  }
);

// --- NEW: Text Index for Search Functionality ---
// This allows you to search for strings inside the 'message.text' field
MessageSchema.index({ "message.text": "text" });

module.exports = mongoose.model("Messages", MessageSchema);