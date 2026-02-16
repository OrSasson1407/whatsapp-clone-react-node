const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema(
  {
    message: {
      text: { type: String }, // Plain text content
      fileUrl: { type: String, default: null }, // URL for uploaded images/files
      messageType: { type: String, default: "text" }, // Options: "text", "image", "file"
    },
    users: Array, // [senderId, receiverId]
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    read: {
      type: Boolean,
      default: false, // Tracks if the receiver has opened the chat
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt for message timing
  }
);

module.exports = mongoose.model("Messages", MessageSchema);