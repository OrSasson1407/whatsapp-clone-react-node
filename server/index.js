const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socket = require("socket.io");
require("dotenv").config(); // Load environment variables from .env file

// Import Routes
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/msgRoutes"); 

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---
app.use(cors());
app.use(express.json());

// --- Routes Configuration ---
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes); 

// --- Database Connection ---
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.log("DB Connection Error: ", err.message);
  });

// --- Server Startup ---
const server = app.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});

// --- Socket.io Setup (Real-Time Communication) ---
const io = socket(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Global Map to store online users (userId -> socketId)
global.onlineUsers = new Map();

// Listen for new connections from clients
io.on("connection", (socket) => {
  global.chatSocket = socket;
  
  // Event: User joins the chat
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  // Event: Send Message
  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
    }
  });

  // --- NEW: Typing Indicators ---
  socket.on("typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("typing-recieve", data.from);
    }
  });

  socket.on("stop-typing", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("stop-typing-recieve", data.from);
    }
  });

  // --- NEW: Read Receipts ---
  socket.on("msg-read", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      // Notify the original sender that their message was read
      socket.to(sendUserSocket).emit("msg-read-recieve", data.from);
    }
  });

  // Event: Disconnect
  socket.on("disconnect", () => {
    // You might want to remove the user from onlineUsers here
  });
});