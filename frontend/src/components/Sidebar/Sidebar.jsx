import React, { useState, useEffect } from 'react';
import useGetConversations from '../../hooks/useGetConversations';

const Sidebar = ({ user, handleLogout, activeChat, setActiveChat, BACKEND_URL }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Fetch active conversations using the hook we built
  const { loading, conversations } = useGetConversations(user.username);

  // Search Logic (Moved from App.jsx)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const searchUsers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/users/search?query=${searchQuery}`);
        const data = await res.json();
        // Filter out the currently logged-in user from search results
        setSearchResults(data.filter(u => u.username !== user.username));
      } catch (error) {
        console.error("Search error:", error);
      }
    };
    searchUsers();
  }, [searchQuery, user, BACKEND_URL]);

  return (
    <div className="sidebar">
      
      {/* 1. User Profile & Logout */}
      <div className="user-profile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Logged in as: <strong>@{user.username}</strong></span>
        <button 
          onClick={handleLogout} 
          style={{ background: 'transparent', color: '#ff4444', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Logout
        </button>
      </div>

      {/* 2. Search Bar */}
      <input 
        type="text" 
        placeholder="🔍 Search users to chat..." 
        value={searchQuery} 
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-bar"
      />

      {/* 3. Dynamic User List (Search Results OR Active Conversations) */}
      <div className="user-list">
        
        {/* Scenario A: User is typing in the search bar -> Show Search Results */}
        {searchQuery ? (
          <>
            <div style={{ fontSize: '11px', color: 'gray', margin: '10px 0 5px', fontWeight: 'bold' }}>SEARCH RESULTS</div>
            {searchResults.map((u) => (
              <div 
                key={u._id} 
                className={`user-item ${activeChat?.username === u.username ? 'active' : ''}`}
                onClick={() => setActiveChat(u)}
              >
                @{u.username}
              </div>
            ))}
            {searchResults.length === 0 && <p className="no-results">No users found</p>}
          </>
        ) : (
          
          /* Scenario B: Search bar is empty -> Show Active Conversations */
          <>
            <div style={{ fontSize: '11px', color: 'gray', margin: '10px 0 5px', fontWeight: 'bold' }}>RECENT CONVERSATIONS</div>
            {loading && <p style={{ color: 'gray', fontSize: '14px', textAlign: 'center' }}>Loading...</p>}
            
            {!loading && conversations.map((u) => (
              <div 
                key={u._id} 
                className={`user-item ${activeChat?.username === u.username ? 'active' : ''}`}
                onClick={() => setActiveChat(u)}
              >
                @{u.username}
              </div>
            ))}
            
            {!loading && conversations.length === 0 && (
              <p className="no-results">No recent conversations.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;