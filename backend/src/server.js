require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const socketAuthMiddleware = require('./sockets/socketAuth.middleware');
const socketManager = require('./sockets/socketManager');

const app = express();

// Database initialization
connectDB();

// Core middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/', (req, res) => {
  res.send('AI-Native Real-Time Communication Platform API is running.');
});

// Mount modular API routes
app.use('/api', routes);

// Central error handler
app.use(errorHandler);

// Create HTTP server & Socket.io server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket.io JWT authentication & connection management
io.use(socketAuthMiddleware);
socketManager.init(io);

const PORT = process.env.PORT || 5001;

module.exports = { app, server, io, PORT };

