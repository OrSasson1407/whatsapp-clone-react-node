const { 
    createGroup, 
    getUserGroups, 
    addMember, 
    removeMember 
} = require("../controllers/groupController");
const router = require("express").Router();

router.post("/create", createGroup);
router.get("/getgroups/:userId", getUserGroups);
router.post("/addmember", addMember);
router.post("/removemember", removeMember);

module.exports = router;