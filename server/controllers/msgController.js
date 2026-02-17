const Messages = require("../models/messageModel");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- File Upload Setup ---
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

module.exports.uploadMiddleware = upload.single("file");

module.exports.uploadFile = (req, res) => {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    return res.json({ 
        url: fileUrl, 
        mimeType: req.file.mimetype, 
        fileName: req.file.originalname 
    });
};

// --- Get Messages (Fixed for 500 Errors & Crashes) ---
module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to, isGroup } = req.body;

    // 1. Validate IDs to prevent immediate crash
    if (!from || !to) {
        return res.status(400).json({ msg: "Missing from/to IDs" });
    }

    // 2. Build Query
    let query = {};
    if (isGroup) {
        // Group: Get all messages sent TO this group
        query = { users: { $all: [to] } };
    } else {
        // DM: Get messages between these two users
        query = { users: { $all: [from, to] } };
    }

    // 3. Execute Query
    const messages = await Messages.find(query)
      .sort({ updatedAt: 1 })
      .populate('sender', 'username avatarImage _id') 
      .populate('replyTo', 'message sender'); 

    // 4. Safe Map (Prevents server crash on bad data)
    const projectedMessages = messages.map((msg) => {
      // If msg is somehow null, skip it
      if (!msg) return null;

      // Handle missing sender (e.g., deleted user)
      const sender = msg.sender || { 
          _id: "unknown", 
          username: "Unknown User", 
          avatarImage: "" 
      };
      
      const senderId = sender._id ? sender._id.toString() : "unknown";

      // Handle missing message content object
      const messageContent = msg.message || { text: "", attachment: null };

      return {
        fromSelf: senderId === from,
        sender: sender, 
        message: messageContent,
        messageStatus: msg.messageStatus || "sent",
        _id: msg._id,
        createdAt: msg.createdAt,
        deleted: msg.deleted || false,
        replyTo: msg.replyTo,
        reactions: msg.reactions || [],
        linkMetadata: msg.linkMetadata
      };
    }).filter(msg => msg !== null); // Remove any null entries
    
    res.json(projectedMessages);
  } catch (ex) {
    console.error("Server Error in getMessages:", ex);
    // Return empty array instead of 500 Error so frontend stays alive
    res.json([]); 
  }
};

// --- Add Message ---
module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message, audioUrl, attachment, replyTo, linkMetadata } = req.body;
    
    const data = await Messages.create({
      message: { 
        text: message || "", // Ensure text is never null
        audioUrl: audioUrl,
        attachment: attachment 
      },
      users: [from, to],
      sender: from,
      replyTo: replyTo || null,
      linkMetadata: linkMetadata || null,
      messageStatus: "sent"
    });

    if (data) return res.json({ msg: "Message added successfully.", data });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

// --- Search Messages ---
module.exports.searchMessages = async (req, res, next) => {
    try {
        const { from, to, query } = req.body;
        const messages = await Messages.find({
            users: { $all: [from, to] },
            "message.text": { $regex: query, $options: "i" }
        }).populate('replyTo').populate('sender', 'username');
        return res.json(messages);
    } catch (ex) {
        next(ex);
    }
};

// --- Add Reaction ---
module.exports.addReaction = async (req, res, next) => {
  try {
    const { messageId, userId, emoji } = req.body;
    const msg = await Messages.findById(messageId);
    if(!msg) return res.status(404).json({msg: "Message not found"});

    const existingIndex = msg.reactions.findIndex(r => r.user.toString() === userId);
    if (existingIndex !== -1) {
       msg.reactions.splice(existingIndex, 1);
    }
    msg.reactions.push({ user: userId, emoji });
    await msg.save();
    return res.json({ status: true, reactions: msg.reactions });
  } catch (ex) {
    next(ex);
  }
};

// --- Delete Message ---
module.exports.deleteMessage = async (req, res, next) => {
    try {
        const { messageId } = req.body;
        await Messages.findByIdAndUpdate(messageId, { deleted: true });
        return res.json({ status: true, msg: "Message deleted" });
    } catch (ex) {
        next(ex);
    }
};