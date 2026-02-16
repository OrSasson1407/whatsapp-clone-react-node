const {
  register,
  login,
  setAvatar,
  getAllUsers,
} = require("../controllers/userController");

const router = require("express").Router();

// Define the routes
router.post("/register", register);
router.post("/login", login);
router.post("/setavatar/:id", setAvatar); // :id is a dynamic parameter
router.get("/allusers/:id", getAllUsers); // We pass the current user ID to exclude it

module.exports = router;