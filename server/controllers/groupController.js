const Group = require("../models/groupModel");
const User = require("../models/userModel");

module.exports.createGroup = async (req, res, next) => {
    try {
        const { name, members, admin } = req.body;
        // members is an array of user IDs. Always include admin in members.
        const allMembers = [...members, admin];
        
        const group = await Group.create({
            name,
            members: allMembers,
            admin
        });
        
        return res.json({ status: true, group });
    } catch (ex) {
        next(ex);
    }
};

module.exports.getUserGroups = async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Find groups where members array contains userId
        const groups = await Group.find({ members: userId }).populate("members", "username avatarImage");
        return res.json(groups);
    } catch (ex) {
        next(ex);
    }
};