const Messages = require("../models/messageModel");

// --- Add Message ---
// This function saves a new message to the database
module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    
    const data = await Messages.create({
      message: { text: message },
      users: [from, to], // We store both users in an array to easily find the conversation later
      sender: from,
    });

    if (data) return res.json({ msg: "Message added successfully." });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

// --- Get Messages ---
// This function retrieves the chat history between two users
module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    // Find messages where the 'users' array contains BOTH 'from' and 'to' IDs
    // We sort by 'updatedAt' so messages appear in chronological order (1 = ascending)
    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });

    // Format the messages for the frontend
    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from, // True if I sent it, False if I received it
        message: msg.message.text,
      };
    });
    
    return res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};