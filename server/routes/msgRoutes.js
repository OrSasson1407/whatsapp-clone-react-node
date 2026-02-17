const { 
    addMessage, 
    getMessages, 
    deleteMessage, 
    addReaction,
    searchMessages,
    uploadFile,
    uploadMiddleware 
} = require("../controllers/msgController");

const router = require("express").Router();

// Core Messaging
router.post("/addmsg", addMessage);
router.post("/getmsg", getMessages);
router.post("/delete", deleteMessage);

// Interactions
router.post("/reaction", addReaction);

// New Features
router.post("/search", searchMessages);             // Search functionality
router.post("/upload", uploadMiddleware, uploadFile); // File upload (Images/Docs)

module.exports = router;