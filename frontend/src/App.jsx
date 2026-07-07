import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const socket = io(BACKEND_URL);

export default function App() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  
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

  // 3. Typing Indicator Sockets (Isolated so they don't break history fetching)
  useEffect(() => {
    socket.on('display-typing', () => setIsAiTyping(true));
    socket.on('hide-typing', () => setIsAiTyping(false));

    return () => {
      socket.off('display-typing');
      socket.off('hide-typing');
    };
  }, []);

  // 4. Load Chat History & Handle Instant Switching
  useEffect(() => {
    if (!activeChat || !user) return;

    // INSTANTLY clear old messages and hide typing when switching chats
    setMessages([]);
    setIsAiTyping(false);

    let isCurrentChat = true; // Race condition safety

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/messages?from=${user.username}&to=${activeChat.username}`);
        const data = await res.json();
        
        // Only render if we haven't clicked a different user while fetching
        if (isCurrentChat) {
          setMessages(data);
        }
      } catch (error) {
        console.error("Fetch messages error:", error);
      }
    };
    
    fetchMessages();

    // Send read receipts to the server since we just opened this chat
    socket.emit('mark-seen', { 
      sender: activeChat.username, 
      receiver: user.username 
    });

    // Cleanup when we click away from this user
    return () => {
      isCurrentChat = false; 
    };
  }, [activeChat, user]);

  // 5. Real-time Incoming Messages
  useEffect(() => {
    socket.on('receive-message', (newMessage) => {
      if (activeChat && newMessage.sender === activeChat.username) {
        setMessages((prev) => [...prev, newMessage]);
        
        // Instantly mark this new message as seen if the chat is open
        socket.emit('mark-seen', { 
          sender: activeChat.username, 
          receiver: user.username 
        });
      }
    });
    return () => socket.off('receive-message');
  }, [activeChat, user]);

  // 6. Listen for Read Receipts (Blue Ticks)
  useEffect(() => {
    const handleMessagesSeen = ({ receiver }) => {
      if (activeChat && activeChat.username === receiver) {
        setMessages((prevMessages) => 
          prevMessages.map((msg) => 
            msg.sender === user.username ? { ...msg, status: 'seen' } : msg
          )
        );
      }
    };

    socket.on('messages-seen', handleMessagesSeen);
    return () => socket.off('messages-seen', handleMessagesSeen);
  }, [activeChat, user]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  // 7. Send Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) return;

    const msgData = {
      sender: user.username,
      receiver: activeChat.username,
      text: messageText.trim(),
      status: 'sent'
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
      
      {/* Sidebar Component injected here */}
      <Sidebar 
        user={user}
        handleLogout={handleLogout}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        BACKEND_URL={BACKEND_URL}
      />

      {/* Main Chat Interface Panel */}
      <div className="chat-window">
        {activeChat ? (
          <>
            <div className="chat-header">Chatting with <strong>@{activeChat.username}</strong></div>
            <div className="message-list">
              {messages.map((msg, index) => (
                <div key={index} className={`message-wrapper ${msg.sender === user.username ? 'outgoing' : 'incoming'}`}>
                  
                  {/* Message Bubble with Read Receipt Ticks Included */}
                  <div className="message-bubble" style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                    <span>{msg.text}</span>
                    {msg.sender === user.username && (
                      <span className="tick-icon" style={{ fontSize: '11px', color: msg.status === 'seen' ? '#34B7F1' : '#a0a0a0', marginLeft: '4px', fontWeight: 'bold' }}>
                        {msg.status === 'seen' ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                  
                </div>
              ))}
              
              {/* The Typing Indicator Bubble */}
              {isAiTyping && activeChat?.username === 'yourgpt' && (
                <div className="message-wrapper incoming">
                  <div className="message-bubble" style={{ fontStyle: 'italic', color: 'gray', opacity: 0.8 }}>
                    typing...
                  </div>
                </div>
              )}

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