const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socket = require("socket.io");
const User = require("./models/userModel"); // Required for online status updates
require("dotenv").config();

// Import Routes
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/msgRoutes"); 

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---
app.use(cors());

// FIX: Increase the payload limit to 50mb (or higher) to handle images/videos
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

// --- Socket.io Setup ---
const io = socket(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
  // FIX: Increase socket message buffer size to 100MB to allow large uploads via socket
  maxHttpBufferSize: 1e8 
});

global.onlineUsers = new Map();

io.on("connection", (socket) => {
  global.chatSocket = socket;
  
  // Event: User joins/comes online
  socket.on("add-user", async (userId) => {
    onlineUsers.set(userId, socket.id);
    // Update persistent online status in DB
    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit("user-status-change", { userId, isOnline: true });
  });

  // Event: Send Message (Merged to support Text, Audio, and Groups)
  socket.on("send-msg", (data) => {
    // If it's a group message, broadcast to the room
    if (data.groupId) {
      socket.to(data.groupId).emit("msg-recieve", {
        msg: data.msg,
        messageType: data.messageType,
        sender: data.from,
        groupId: data.groupId,
        replyTo: data.replyTo,
        linkMetadata: data.linkMetadata
      });
    } else {
      // 1-on-1 private message
      const sendUserSocket = onlineUsers.get(data.to);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("msg-recieve", {
          msg: data.msg,
          messageType: data.messageType || "text",
          from: data.from,
          replyTo: data.replyTo,
          linkMetadata: data.linkMetadata
        });
      }
    }
  });

  // --- FEATURE: Group Chat Rooms ---
  socket.on("join-group", (groupId) => {
    socket.join(groupId);
    console.log(`User joined group: ${groupId}`);
  });

  // --- FEATURE: Typing Indicators ---
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

  // --- FEATURE: Message Deletion (Delete for Everyone) ---
  socket.on("delete-msg", (data) => {
    if (data.groupId) {
      socket.to(data.groupId).emit("msg-delete-recieve", data.messageId);
    } else {
      const sendUserSocket = onlineUsers.get(data.to);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("msg-delete-recieve", data.messageId);
      }
    }
  });
  
  // --- FEATURE: Reactions ---
  socket.on("send-reaction", (data) => {
    // data: { to, messageId, from, emoji }
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
        socket.to(sendUserSocket).emit("reaction-recieve", { 
            messageId: data.messageId, 
            from: data.from, 
            emoji: data.emoji 
        });
    }
  });

  // --- FEATURE: Read Receipts ---
  socket.on("msg-read", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-read-recieve", data.from);
    }
  });

  // Event: Disconnect logic with DB sync
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
      await User.findByIdAndUpdate(disconnectedUserId, { isOnline: false });
      socket.broadcast.emit("user-status-change", { userId: disconnectedUserId, isOnline: false });
    }
    console.log("User disconnected:", socket.id);
  });
});