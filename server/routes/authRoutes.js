const {
  login,
  register,
  getAllUsers,
  setAvatar,
  logOut,
  togglePin,
  toggleArchive,
  toggleMute,
  getRandomAvatar
} = require("../controllers/userController");

const router = require("express").Router();

// Auth Routes
router.post("/login", login);
router.post("/register", register);
router.get("/allusers/:id", getAllUsers);
router.post("/setavatar/:id", setAvatar);
router.get("/logout/:id", logOut);

// Organization Routes
router.post("/pin", togglePin);
router.post("/archive", toggleArchive);
router.post("/mute", toggleMute);

// Avatar Proxy Route
router.get("/avatar/:key", getRandomAvatar);

module.exports = router;