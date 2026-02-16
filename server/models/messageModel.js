const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema(
  {
    message: {
      text: { type: String, required: true }, // תוכן ההודעה
    },
    users: Array, // מערך שמכיל את ה-ID של השולח ושל המקבל [senderId, receiverId]
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // יוסיף אוטומטית שדות createdAt ו-updatedAt
  }
);

module.exports = mongoose.model("Messages", MessageSchema);