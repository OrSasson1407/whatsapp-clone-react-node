const Messages = require("../models/messageModel");

// --- Add Message ---
module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message, messageType, audioUrl, groupId } = req.body;
    
    const data = await Messages.create({
      message: { 
        text: message, 
        audioUrl: audioUrl || null 
      },
      messageType: messageType || "text",
      users: groupId ? [] : [from, to], 
      sender: from,
      groupId: groupId || null,
    });

    if (data) return res.json({ msg: "Message added successfully.", data });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

// --- NEW: Delete Message (Delete for Everyone) ---
module.exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.body;
    const updatedMessage = await Messages.findByIdAndUpdate(
      messageId,
      { 
        deleted: true, 
        "message.text": "This message was deleted",
        "message.audioUrl": null 
      },
      { new: true }
    );
    res.json({ status: true, updatedMessage });
  } catch (ex) {
    next(ex);
  }
};

// --- Get Messages ---
module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to, groupId } = req.body;

    const query = groupId 
      ? { groupId } 
      : { users: { $all: [from, to] } };

    const messages = await Messages.find(query).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        _id: msg._id,
        fromSelf: msg.sender.toString() === from,
        message: msg.message,
        messageType: msg.messageType,
        deleted: msg.deleted,
        read: msg.read,
        createdAt: msg.createdAt,
      };
    });
    
    return res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};