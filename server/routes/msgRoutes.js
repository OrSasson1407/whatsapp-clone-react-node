const { addMessage, getMessages, deleteMessage } = require("../controllers/msgController");
const router = require("express").Router();

// Route to add a message (Supports text and audio)
router.post("/addmsg/", addMessage);

// Route to get all messages (Supports private and group)
router.post("/getmsg/", getMessages);

// NEW: Route to delete a message (Fixes the 404 error)
router.post("/delete/", deleteMessage);

module.exports = router;