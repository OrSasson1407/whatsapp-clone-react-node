const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socket = require("socket.io");
require("dotenv").config(); // Load environment variables from .env file

// Import Routes
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/msgRoutes"); // <--- ADDED: Import message routes

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware Setup ---

// Enable CORS (Cross-Origin Resource Sharing)
// This allows our React frontend to talk to this server.
app.use(cors());

// Parse incoming JSON requests and put the parsed data in req.body
app.use(express.json());

// --- Routes Configuration ---

// All routes starting with /api/auth will be handled by authRoutes
// Example: POST /api/auth/register, POST /api/auth/login
app.use("/api/auth", authRoutes);

// All routes starting with /api/messages will be handled by messageRoutes
// Example: POST /api/messages/addmsg, POST /api/messages/getmsg
app.use("/api/messages", messageRoutes); // <--- ADDED: Use message routes

// --- Database Connection ---

// Connect to MongoDB using the URL from the .env file
// FIXED: Removed deprecated options (useNewUrlParser, useUnifiedTopology) 
// as Mongoose 8+ handles them automatically.
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.log("DB Connection Error: ", err.message);
  });

// --- Server Startup ---

// Start the HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server Started on Port ${PORT}`);
});

// --- Socket.io Setup (Real-Time Communication) ---

// Initialize Socket.io and attach it to the HTTP server
const io = socket(server, {
  cors: {
    // Allow connections from the frontend (Vite usually runs on port 5173)
    // IMPORTANT: If your React app runs on a different port, update this URL.
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Global Map to store online users (userId -> socketId)
// We will use this to send private messages later
global.onlineUsers = new Map();

// Listen for new connections from clients
io.on("connection", (socket) => {
  // This 'socket' object represents the unique connection to a specific client
  // Every time a user opens a new tab, a new socket connection is created.
  global.chatSocket = socket;
  
  console.log("A user connected:", socket.id);

  // Event: User joins the chat
  // 'userId' will be the unique username or DB ID sent from the client
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User added: ${userId} with socket ID: ${socket.id}`);
  });

  // Event: Send Message
  // 'data' contains { to, from, msg }
  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    
    // If the receiver is online, send the message to their specific socket
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
    }
  });

  // Event: Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});