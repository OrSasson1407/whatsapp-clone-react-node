const Messages = require("../models/messageModel");
const multer = require("multer");
const path = require("path");

// --- Multer Setup for File Uploads ---
// Configures where to store uploaded files and their filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the 'uploads' folder exists in your server root
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    // Unique filename: Timestamp + Original Extension
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Export middleware for use in routes
module.exports.uploadMiddleware = upload.single("file");

// --- Controller Methods ---

// 1. Upload File
module.exports.uploadFile = (req, res) => {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });
    
    // Construct the public URL for the file
    // NOTE: In production, replace 'localhost' with your actual domain or use S3/Cloudinary
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    
    return res.json({ 
        url: fileUrl, 
        mimeType: req.file.mimetype, 
        fileName: req.file.originalname 
    });
};

// 2. Get Messages
module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    })
    .sort({ updatedAt: 1 }) // Oldest first
    .populate('replyTo', 'message sender'); 

    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: msg.message,
        messageStatus: msg.messageStatus, // Included for ticks (sent/delivered/read)
        _id: msg._id,
        createdAt: msg.createdAt,
        deleted: msg.deleted,
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

// 3. Add Message
module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message, audioUrl, attachment, replyTo, linkMetadata } = req.body;
    
    const data = await Messages.create({
      message: { 
        text: message, 
        audioUrl: audioUrl,
        attachment: attachment 
      },
      users: [from, to],
      sender: from,
      replyTo: replyTo || null,
      linkMetadata: linkMetadata || null,
      messageStatus: "sent" // Default status
    });

    if (data) return res.json({ msg: "Message added successfully.", data });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};

// 4. Search Messages
module.exports.searchMessages = async (req, res, next) => {
    try {
        const { from, to, query } = req.body;
        
        // Use the Text Index created in the model
        // Or simple regex for partial matching
        const messages = await Messages.find({
            users: { $all: [from, to] },
            "message.text": { $regex: query, $options: "i" } // Case-insensitive search
        }).populate('replyTo');
        
        return res.json(messages);
    } catch (ex) {
        next(ex);
    }
};

// 5. Add Reaction
module.exports.addReaction = async (req, res, next) => {
  try {
    const { messageId, userId, emoji } = req.body;
    
    const msg = await Messages.findById(messageId);
    if(!msg) return res.status(404).json({msg: "Message not found"});

    // Remove existing reaction from this user if it exists (toggle logic)
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

// 6. Delete Message
module.exports.deleteMessage = async (req, res, next) => {
    try {
        const { messageId } = req.body;
        // Soft delete: just mark as deleted
        await Messages.findByIdAndUpdate(messageId, { deleted: true });
        return res.json({ status: true, msg: "Message deleted" });
    } catch (ex) {
        next(ex);
    }
};