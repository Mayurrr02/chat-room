const { Server } = require('socket.io');
require('dotenv').config();
// 🚀 NEW: Import the AI SDK
const { GoogleGenerativeAI } = require('@google/generative-ai'); 
require('dotenv').config();

// 🚀 NEW: Initialize the AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define your personalized instructions
const personalizedInstructions = 
  "Your name is 'yourgpt', and you were developed by Mayur Jadhav. " +
  "You are a helpful, friendly, and smart AI chatbot living inside a custom chat application. " +
  "You must never refer to yourself as Gemini, a Google AI, or a large language model. Always maintain your persona as yourgpt. " +
  "CRITICAL FORMATTING RULE: Never generate responses as a single, unbroken block of paragraph text. " +
  "Always format your text beautifully using clean Markdown: use clear headers (###) to separate ideas, " +
  "bullet points (-) or numbered lists for steps, and bold text (**word**) to highlight important terms. Keep it highly readable and scannable.";

const aiModel = genAI.getGenerativeModel({ 
  model: "gemini-3.5-flash",
  systemInstruction: personalizedInstructions
});


const bcrypt = require('bcryptjs'); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
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
const UserSchema = new mongoose.Schema({ 
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true } 
});
const User = mongoose.model('User', UserSchema);

const MessageSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

app.get('/', (req, res) => {
  res.send('Chat Application Backend Server is running successfully!');
});

// --- REST API Endpoints ---

// Login or Register securely
app.post('/api/auth', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  try {
    let user = await User.findOne({ username });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      user = new User({ username, password: hashedPassword });
      await user.save();
      return res.status(200).json({ username: user.username, isNew: true });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Incorrect password" });
    res.status(200).json({ username: user.username, isNew: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch active conversations for the sidebar
app.get('/api/conversations/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const messages = await Message.find({
      $or: [{ sender: username }, { receiver: username }]
    });

    const contacts = new Set();
    messages.forEach(msg => {
      if (msg.sender !== username) contacts.add(msg.sender);
      if (msg.receiver !== username) contacts.add(msg.receiver);
    });

    const activeConversations = await User.find({
      username: { $in: Array.from(contacts) }
    }).select('-password');

    res.status(200).json(activeConversations);
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
let onlineUsers = new Map(); 

io.on('connection', (socket) => {
  socket.on('register-user', (username) => {
    onlineUsers.set(username, socket.id);
  });

  socket.on('send-message', async (data) => {
    const { sender, receiver, text } = data;
    
    // 1. Save the user's message to MongoDB
    const newMessage = new Message({ sender, receiver, text, status: 'sent' });
    await newMessage.save();

    // 2. Emit to the receiver (if they are a normal human user and online)
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive-message', data);
    }

    // ==========================================
    // 🚀 NEW: AI CHATBOT INTERCEPTION
    // ==========================================
    if (receiver === 'yourgpt') {
      try {
        // 🚀 1. INSTANTLY tell the user the AI is typing
        const senderSocketId = onlineUsers.get(sender);
        if (senderSocketId) {
          io.to(senderSocketId).emit('display-typing', { username: 'yourgpt' });
        }

        // 2. Now, wait for the AI to generate the full response
        const result = await aiModel.generateContent(text);
        const aiResponseText = result.response.text();

        // 3. Create the AI's reply data
        const aiReplyData = {
          sender: 'yourgpt',
          receiver: sender, // Send it back to the person who asked
          text: aiResponseText,
          status: 'sent'
        };

        // 4. Save the AI's reply to MongoDB so it shows in chat history
        const aiMessage = new Message(aiReplyData);
        await aiMessage.save();

        // 🚀 5. Tell the user to STOP showing the typing indicator
        if (senderSocketId) {
          io.to(senderSocketId).emit('hide-typing');
        }

        // 6. Emit the AI's reply directly back to the user in real-time
        socket.emit('receive-message', aiReplyData);

      } catch (error) {
        console.error("AI Generation Error:", error);
        
        // 🚀 Hide typing if there is an error so it doesn't spin forever!
        const senderSocketId = onlineUsers.get(sender);
        if (senderSocketId) io.to(senderSocketId).emit('hide-typing');
        
        // Send a fallback message if the AI fails
        socket.emit('receive-message', {
          sender: 'yourgpt',
          receiver: sender,
          text: "Sorry, my AI brain is currently offline!",
          status: 'sent'
        });
      }
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