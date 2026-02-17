const { createGroup, getUserGroups } = require("../controllers/groupController");
const router = require("express").Router();

router.post("/create", createGroup);
router.get("/getgroups/:userId", getUserGroups);

module.exports = router;