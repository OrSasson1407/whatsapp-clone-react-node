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

module.exports.addMember = async (req, res, next) => {
    try {
        const { groupId, userId } = req.body;

        const group = await Group.findByIdAndUpdate(
            groupId,
            { 
                $addToSet: { members: userId } // $addToSet prevents duplicates
            },
            { new: true }
        ).populate("members", "username avatarImage");

        if (!group) {
            return res.json({ status: false, msg: "Group not found" });
        }

        return res.json({ status: true, group });
    } catch (ex) {
        next(ex);
    }
};

module.exports.removeMember = async (req, res, next) => {
    try {
        const { groupId, userId } = req.body;

        const group = await Group.findByIdAndUpdate(
            groupId,
            { 
                $pull: { members: userId } // $pull removes the item from the array
            },
            { new: true }
        ).populate("members", "username avatarImage");

        if (!group) {
            return res.json({ status: false, msg: "Group not found" });
        }

        return res.json({ status: true, group });
    } catch (ex) {
        next(ex);
    }
};