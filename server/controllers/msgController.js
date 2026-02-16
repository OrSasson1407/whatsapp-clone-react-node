const Messages = require("../models/messageModel");

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    if (data) return res.json({ msg: "Message added successfully." });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    // 1. Mark messages from the 'other' user (to) as read, 
    // because 'from' (current user) is requesting to see them now.
    await Messages.updateMany(
      { 
        users: { $all: [from, to] },
        sender: to, 
        read: false 
      },
      { $set: { read: true } }
    );

    // 2. Fetch the messages
    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
        read: msg.read, // Send the read status to frontend
        time: msg.createdAt, // Send time for display
      };
    });
    
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};