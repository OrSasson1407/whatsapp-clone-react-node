const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socket = require("socket.io");
const User = require("./models/userModel"); // Required for online status updates
require("dotenv").config();

// --- Import Routes ---
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/msgRoutes"); 
const groupRoutes = require("./routes/groupRoutes"); // Added for Idea 3

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---
app.use(cors());
// Increased limits to fix "Payload Too Large" errors when sending images/videos
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- Routes Configuration ---
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes); 
app.use("/api/groups", groupRoutes); // Added for Idea 3

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
  // Increased buffer size for large file uploads via socket
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

  // Event: Send Message (Handles Text, Audio, Attachments, Replies, Link Metadata)
  socket.on("send-msg", (data) => {
    // data structure: { to, from, msg, messageType, groupId, replyTo, linkMetadata, ... }
    
    // 1. Group Message
    if (data.groupId) {
      socket.to(data.groupId).emit("msg-recieve", {
        msg: data.msg,
        messageType: data.messageType,
        sender: data.from,
        groupId: data.groupId,
        replyTo: data.replyTo,
        linkMetadata: data.linkMetadata
      });
    } 
    // 2. Direct (1-on-1) Message
    else {
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

  // Event: Join Group Room
  socket.on("join-group", (groupId) => {
    socket.join(groupId);
    console.log(`User joined group room: ${groupId}`);
  });

  // Event: Typing Indicators
  socket.on("typing", (data) => {
    if (data.groupId) {
        socket.to(data.groupId).emit("typing-recieve", { from: data.from, groupId: data.groupId });
    } else {
        const sendUserSocket = onlineUsers.get(data.to);
        if (sendUserSocket) {
          socket.to(sendUserSocket).emit("typing-recieve", data.from);
        }
    }
  });

  socket.on("stop-typing", (data) => {
    if (data.groupId) {
        socket.to(data.groupId).emit("stop-typing-recieve", { from: data.from, groupId: data.groupId });
    } else {
        const sendUserSocket = onlineUsers.get(data.to);
        if (sendUserSocket) {
          socket.to(sendUserSocket).emit("stop-typing-recieve", data.from);
        }
    }
  });

  // Event: Message Deletion
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

  // Event: Send Reaction (Emoji)
  socket.on("send-reaction", (data) => {
    // data: { to, messageId, from, emoji, groupId }
    if (data.groupId) {
         socket.to(data.groupId).emit("reaction-recieve", { 
            messageId: data.messageId, 
            from: data.from, 
            emoji: data.emoji 
        });
    } else {
        const sendUserSocket = onlineUsers.get(data.to);
        if (sendUserSocket) {
            socket.to(sendUserSocket).emit("reaction-recieve", { 
                messageId: data.messageId, 
                from: data.from, 
                emoji: data.emoji 
            });
        }
    }
  });

  // Event: Read Receipts
  socket.on("msg-read", (data) => {
    // Usually only relevant for 1-on-1, but could be adapted for groups
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