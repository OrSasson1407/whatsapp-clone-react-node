const { addMessage, getMessages } = require("../controllers/msgController");
const router = require("express").Router();

// Route to add a message
router.post("/addmsg/", addMessage);

// Route to get all messages between two users
router.post("/getmsg/", getMessages);

module.exports = router;