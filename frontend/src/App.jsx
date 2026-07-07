import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const socket = io(BACKEND_URL);

export default function App() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  
  const messagesEndRef = useRef(null);

  // 1. Logout Handler
  const handleLogout = () => {
    setUser(null);
    setActiveChat(null);
    setMessages([]);
    setUsernameInput('');
    setPasswordInput('');
  };

  // 2. Authenticate or Create Profile
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput.trim()) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: usernameInput.trim(),
          password: passwordInput.trim() 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      setUser(data);
      socket.emit('register-user', data.username);
      
      if (data.isNew) {
        alert("New account created successfully!");
      }

    } catch (error) {
      console.error("Auth Error:", error);
      alert(`Login failed: ${error.message}`);
    }
  };

  // 3. Search for Users
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const searchUsers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/users/search?query=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data.filter(u => u.username !== user.username));
      } catch (error) {
        console.error("Search error:", error);
      }
    };
    searchUsers();
  }, [searchQuery, user]);

  // 4. Load Chat History
  useEffect(() => {
    if (!activeChat || !user) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/messages?from=${user.username}&to=${activeChat.username}`);
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        console.error("Fetch messages error:", error);
      }
    };
    fetchMessages();
  }, [activeChat, user]);

  // 5. Real-time incoming messages
  useEffect(() => {
    socket.on('receive-message', (newMessage) => {
      if (activeChat && newMessage.sender === activeChat.username) {
        setMessages((prev) => [...prev, newMessage]);
      }
    });
    return () => socket.off('receive-message');
  }, [activeChat]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 6. Send Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) return;

    const msgData = {
      sender: user.username,
      receiver: activeChat.username,
      text: messageText.trim()
    };

    socket.emit('send-message', msgData);
    setMessages((prev) => [...prev, msgData]);
    setMessageText('');
  };

  // ==========================================
  // LOGIN UI
  // ==========================================
  if (!user) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-form">
          <h2>Enter Chat Room</h2>
          <input 
            type="text" 
            placeholder="Username" 
            value={usernameInput} 
            onChange={(e) => setUsernameInput(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={passwordInput} 
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit">Join / Register</button>
        </form>
      </div>
    );
  }

  // ==========================================
  // MAIN CHAT UI
  // ==========================================
  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <div className="sidebar">
        
        <div className="user-profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Logged in as: <strong>@{user.username}</strong></span>
          <button 
            onClick={handleLogout} 
            style={{ background: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </div>

        <input 
          type="text" 
          placeholder="🔍 Search users to chat..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-bar"
        />
        <div className="user-list">
          {searchResults.map((u) => (
            <div 
              key={u._id} 
              className={`user-item ${activeChat?.username === u.username ? 'active' : ''}`}
              onClick={() => setActiveChat(u)}
            >
              @{u.username}
            </div>
          ))}
          {searchQuery && searchResults.length === 0 && <p className="no-results">No users found</p>}
        </div>
      </div>

      {/* Main Chat Interface Panel */}
      <div className="chat-window">
        {activeChat ? (
          <>
            <div className="chat-header">Chatting with <strong>@{activeChat.username}</strong></div>
            <div className="message-list">
              {messages.map((msg, index) => (
                <div key={index} className={`message-wrapper ${msg.sender === user.username ? 'outgoing' : 'incoming'}`}>
                  <div className="message-bubble">{msg.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="message-input-form">
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={messageText} 
                onChange={(e) => setMessageText(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="chat-placeholder">Select or search for a user to start chatting!</div>
        )}
      </div>
    </div>
  );
}