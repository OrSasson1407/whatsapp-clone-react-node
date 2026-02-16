const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema(
  {
    message: {
      text: { type: String, required: false },
      audioUrl: { type: String, required: false },
      // New: Generic attachment support (Images, Videos, PDFs)
      attachment: {
        url: { type: String }, // Base64 or URL
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
    // New: Reference for threading/replies
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Messages", 
      default: null
    },
    // New: Reactions array
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      }
    ],
    // New: Link Preview Metadata
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

module.exports = mongoose.model("Messages", MessageSchema);