const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socket = require("socket.io");
const User = require("./models/userModel"); // Added for online status updates
require("dotenv").config(); // Load environment variables from .env file

// Import Routes
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/msgRoutes"); 

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---

// Enable CORS (Cross-Origin Resource Sharing)
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// --- Routes Configuration ---

// Auth and Message routes
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

io.on("connection", (socket) => {
  global.chatSocket = socket;
  
  // Event: User joins the chat
  socket.on("add-user", async (userId) => {
    onlineUsers.set(userId, socket.id);
    // Persist online status to the database
    await User.findByIdAndUpdate(userId, { isOnline: true });
    // Notify others that this user is online
    socket.broadcast.emit("user-status-change", { userId, isOnline: true });
  });

  // Event: Send Message (Handles text and multimedia payloads)
  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", {
        msg: data.msg,
        fileUrl: data.fileUrl,
        messageType: data.messageType,
      });
    }
  });

  // --- UPGRADE: Typing Indicators ---
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

  // --- UPGRADE: Read Receipts ---
  socket.on("msg-read", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      // Notify the sender that their specific messages were viewed
      socket.to(sendUserSocket).emit("msg-read-recieve", data.from);
    }
  });

  // Event: Disconnect logic with database sync
  socket.on("disconnect", async () => {
    let disconnectedUserId;
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }
    if (disconnectedUserId) {
      // Mark user offline in DB and notify peers
      await User.findByIdAndUpdate(disconnectedUserId, { isOnline: false });
      socket.broadcast.emit("user-status-change", { userId: disconnectedUserId, isOnline: false });
    }
    console.log("User disconnected:", socket.id);
  });
});