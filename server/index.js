const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socket = require("socket.io");
const path = require("path");
const User = require("./models/userModel");
const Messages = require("./models/messageModel"); // Required for status updates
require("dotenv").config();

// --- Import Routes ---
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/msgRoutes"); 
const groupRoutes = require("./routes/groupRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---
app.use(cors());
app.use(express.json({ limit: "5mb" })); // Limit payload to prevent DoS
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// --- Serve Uploaded Files ---
// This allows the frontend to access uploaded media via http://localhost:5000/uploads/filename
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Routes Configuration ---
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes); 
app.use("/api/groups", groupRoutes);

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
    origin: "http://localhost:5173", // Replace with your frontend URL in production
    credentials: true,
  },
  // 5MB limit for socket payloads (we use HTTP for larger files now)
  maxHttpBufferSize: 5e6 
});

global.onlineUsers = new Map();

io.on("connection", (socket) => {
  
  // Event: User joins/comes online
  socket.on("add-user", async (userId) => {
    onlineUsers.set(userId, socket.id);
    // Update persistent online status in DB
    await User.findByIdAndUpdate(userId, { isOnline: true });
    // Broadcast to others that this user is online
    socket.broadcast.emit("user-status-change", { userId, isOnline: true });
  });

  // Event: Send Message (Handles Text, Attachments, Replies)
  socket.on("send-msg", (data) => {
    // data: { to, from, msg, messageType, groupId, replyTo, linkMetadata, attachment }
    
    // 1. Group Message
    if (data.groupId) {
      socket.to(data.groupId).emit("msg-recieve", {
        msg: data.msg,
        messageType: data.messageType,
        sender: data.from,
        groupId: data.groupId,
        replyTo: data.replyTo,
        linkMetadata: data.linkMetadata,
        attachment: data.attachment
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
          linkMetadata: data.linkMetadata,
          attachment: data.attachment,
          messageStatus: "sent" 
        });
      }
    }
  });

  // --- NEW: Advanced Status (Delivered) ---
  // Triggered when the recipient receives the message via socket
  socket.on("msg-delivered", async (data) => {
    // data: { messageId, from } -> 'from' is the original SENDER id
    
    if(data.messageId) {
       await Messages.findByIdAndUpdate(data.messageId, { messageStatus: "delivered" });
    }

    // Notify the original sender that their message was delivered
    const senderSocket = onlineUsers.get(data.from);
    if (senderSocket) {
      socket.to(senderSocket).emit("msg-status-update", { 
        messageId: data.messageId, 
        status: "delivered" 
      });
    }
  });

  // --- NEW: Advanced Status (Read) ---
  // Triggered when the recipient opens the chat
  socket.on("msg-read", async (data) => {
    // data: { to, from } -> 'to' is the user whose messages were just read
    
    // Mark all unread messages from that user as read in DB
    await Messages.updateMany(
      { sender: data.to, users: { $all: [data.from, data.to] }, messageStatus: { $ne: "read" } },
      { messageStatus: "read" }
    );
    
    // Notify the other user (if online)
    const senderSocket = onlineUsers.get(data.to); 
    if (senderSocket) {
        socket.to(senderSocket).emit("msg-read-recieve", data.from); 
    }
  });

  // Event: Join Group Room
  socket.on("join-group", (groupId) => {
    socket.join(groupId);
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

  // Event: Send Reaction
  socket.on("send-reaction", (data) => {
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

  // Event: Disconnect logic
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
      // Update Last Seen time
      const lastSeen = new Date();
      await User.findByIdAndUpdate(disconnectedUserId, { isOnline: false, lastSeen: lastSeen });
      
      socket.broadcast.emit("user-status-change", { 
        userId: disconnectedUserId, 
        isOnline: false,
        lastSeen: lastSeen 
      });
    }
    console.log("User disconnected:", socket.id);
  });
});