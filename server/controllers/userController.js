const User = require("../models/userModel");
const bcrypt = require("bcrypt");

// --- Register Logic ---
module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if username already exists
    const usernameCheck = await User.findOne({ username });
    if (usernameCheck)
      return res.json({ msg: "Username already used", status: false });

    // Check if email already exists
    const emailCheck = await User.findOne({ email });
    if (emailCheck)
      return res.json({ msg: "Email already used", status: false });

    // Encrypt the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user in the database
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
    });

    // Remove password from the response object for security
    delete user.password;
    
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

// --- Login Logic ---
module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Incorrect Username or Password", status: false });

    // Compare the provided password with the encrypted password in DB
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Incorrect Username or Password", status: false });

    delete user.password;
    
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

// --- Set Avatar Logic ---
module.exports.setAvatar = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const avatarImage = req.body.image;
    
    // Update the user with the new avatar image
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

// --- Get All Users Logic ---
// We need this to show the list of contacts in the sidebar
module.exports.getAllUsers = async (req, res, next) => {
  try {
    // Find all users EXCEPT the current user (we don't want to chat with ourselves)
    // selecting only specific fields (email, username, avatar, id)
    const users = await User.find({ _id: { $ne: req.params.id } }).select([
      "email",
      "username",
      "avatarImage",
      "_id",
    ]);
    return res.json(users);
  } catch (ex) {
    next(ex);
  }
};