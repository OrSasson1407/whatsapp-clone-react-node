const mongoose = require("mongoose");

const GroupSchema = mongoose.Schema({
  name: { type: String, required: true },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  ],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
  },
}, { timestamps: true });

module.exports = mongoose.model("Groups", GroupSchema);