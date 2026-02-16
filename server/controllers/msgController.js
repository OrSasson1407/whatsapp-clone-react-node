const Messages = require("../models/messageModel");

// Get Messages
module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    })
    .sort({ updatedAt: 1 })
    // Populate the replyTo field to get the original message text
    .populate('replyTo', 'message sender'); 

    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: msg.message,
        _id: msg._id,
        createdAt: msg.createdAt,
        deleted: msg.deleted,
        // Include new fields in response
        replyTo: msg.replyTo,
        reactions: msg.reactions,
        linkMetadata: msg.linkMetadata
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

// Add Message
module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message, audioUrl, attachment, replyTo, linkMetadata } = req.body;
    
    const data = await Messages.create({
      message: { 
        text: message, 
        audioUrl: audioUrl,
        attachment: attachment // Save attachment data
      },
      users: [from, to],
      sender: from,
      replyTo: replyTo || null, // Save reply reference
      linkMetadata: linkMetadata || null
    });

    if (data) return res.json({ msg: "Message added successfully.", data });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

// New: Add Reaction
module.exports.addReaction = async (req, res, next) => {
  try {
    const { messageId, userId, emoji } = req.body;
    
    const msg = await Messages.findById(messageId);
    if(!msg) return res.status(404).json({msg: "Message not found"});

    // Remove existing reaction from this user if it exists
    const existingIndex = msg.reactions.findIndex(r => r.user.toString() === userId);
    if (existingIndex !== -1) {
       msg.reactions.splice(existingIndex, 1);
    }

    // Add new reaction
    msg.reactions.push({ user: userId, emoji });
    await msg.save();

    return res.json({ status: true, reactions: msg.reactions });
  } catch (ex) {
    next(ex);
  }
};

// Delete Message (Existing functionality kept for safety)
module.exports.deleteMessage = async (req, res, next) => {
    try {
        const { messageId } = req.body;
        await Messages.findByIdAndUpdate(messageId, { deleted: true });
        return res.json({ status: true, msg: "Message deleted" });
    } catch (ex) {
        next(ex);
    }
};