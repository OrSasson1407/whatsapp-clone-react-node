const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    min: 3,
    max: 20,
    unique: true, // שם המשתמש חייב להיות ייחודי
  },
  email: {
    type: String,
    required: true,
    unique: true, // האימייל חייב להיות ייחודי
    max: 50,
  },
  password: {
    type: String,
    required: true,
    min: 8,
  },
  isAvatarImageSet: {
    type: Boolean,
    default: false, // האם המשתמש כבר בחר תמונת פרופיל?
  },
  avatarImage: {
    type: String,
    default: "", // המחרוזת של התמונה (בדרך כלל Base64 או URL)
  },
});

module.exports = mongoose.model("Users", userSchema);