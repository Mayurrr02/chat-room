const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// --- MongoDB Atlas Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// --- Schemas & Models ---
const UserSchema = new mongoose.Schema({ username: { type: String, unique: true, required: true } });
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// --- REST API Endpoints ---

// Login or Register a user quickly
app.post('/api/auth', async (req, res) => {
  const { username } = req.body;
  try {
    let user = await User.findOne({ username });
    if (!user) {
      user = new User({ username });
      await user.save();
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search users by username
app.get('/api/users/search', async (req, res) => {
  const { query } = req.query;
  try {
    const users = await User.find({ username: { $regex: query, $options: 'i' } }).limit(10);
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch conversation history between two users
app.get('/api/messages', async (req, res) => {
  const { from, to } = req.query;
  try {
    const messages = await Message.find({
      $or: [
        { sender: from, receiver: to },
        { sender: to, receiver: from }
      ]
    }).sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Socket.io Real-Time Layer ---
let onlineUsers = new Map(); // Maps username -> socket.id

io.on('connection', (socket) => {
  
  socket.on('register-user', (username) => {
    onlineUsers.set(username, socket.id);
  });

  socket.on('send-message', async (data) => {
    const { sender, receiver, text } = data;
    
    // Save message to MongoDB Atlas
    const newMessage = new Message({ sender, receiver, text });
    await newMessage.save();

    // Emit to receiver if online
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive-message', data);
    }
  });

  socket.on('disconnect', () => {
    for (let [username, id] of onlineUsers.entries()) {
      if (id === socket.id) {
        onlineUsers.delete(username);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));