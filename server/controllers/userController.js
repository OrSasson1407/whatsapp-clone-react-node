const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const axios = require("axios"); 

module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    
    const userObj = user.toObject();
    delete userObj.password;
    return res.json({ status: true, user: userObj });
  } catch (ex) {
    next(ex);
  }
};

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Username already used", status: false });
    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Email already used", status: false });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
    });
    
    const userObj = user.toObject();
    delete userObj.password;
    return res.json({ status: true, user: userObj });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    // FIXED: Added .limit(50) so the app doesn't crash when user count gets large.
    const users = await User.find({ _id: { $ne: req.params.id } })
      .select([
        "email",
        "username",
        "avatarImage",
        "_id",
        "about",
        "isOnline",
      ])
      .limit(50);
    return res.json(users);
  } catch (ex) {
    next(ex);
  }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    const userData = await User.findByIdAndUpdate(
      userId,
      {
        isAvatarImageSet: true,
        avatarImage,
      },
      { new: true }
    );
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,
    });
  } catch (ex) {
    next(ex);
  }
};

module.exports.logOut = (req, res, next) => {
  try {
    if (!req.params.id) return res.json({ msg: "User id is required " });
    return res.status(200).send();
  } catch (ex) {
    next(ex);
  }
};

const toggleList = async (req, res, field, next) => {
    try {
        const { userId, targetId } = req.body;
        const user = await User.findById(userId);
        if(!user) return res.json({status: false, msg: "User not found"});

        const list = user[field];
        const index = list.indexOf(targetId);
        
        if(index === -1) {
            list.push(targetId);
        } else {
            list.splice(index, 1);
        }
        
        await user.save();
        return res.json({ status: true, [field]: user[field] });
    } catch(ex) {
        next(ex);
    }
};

module.exports.togglePin = (req, res, next) => toggleList(req, res, 'pinnedChats', next);
module.exports.toggleArchive = (req, res, next) => toggleList(req, res, 'archivedChats', next);
module.exports.toggleMute = (req, res, next) => toggleList(req, res, 'mutedChats', next);

module.exports.getRandomAvatar = async (req, res, next) => {
  try {
    const key = req.params.key;
    const response = await axios.get(`https://api.dicebear.com/9.x/avataaars/svg?seed=${key}`);
    return res.send(response.data);
  } catch (ex) {
    next(ex);
  }
};