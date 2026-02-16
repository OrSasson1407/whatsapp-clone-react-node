const { addMessage, getMessages, deleteMessage, addReaction } = require("../controllers/msgController");
const router = require("express").Router();

router.post("/addmsg", addMessage);
router.post("/getmsg", getMessages);
router.post("/delete", deleteMessage);
router.post("/reaction", addReaction); // New Route

module.exports = router;