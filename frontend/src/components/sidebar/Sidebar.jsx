import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import ConversationList from './ConversationList';
import CreateGroupModal from './CreateGroupModal';
import FriendRequestsModal from './FriendRequestsModal';
import ProfileModal from '../common/ProfileModal';
import {
  Search,
  Plus,
  Users,
  UserCheck,
  Settings,
  LogOut,
  MessageSquare,
  UserPlus,
  ChevronDown,
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { setStatus, presenceMap } = useSocket();
  const { startDMWithUser, conversations } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'dms' | 'groups'
  const [pendingCount, setPendingCount] = useState(0);

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const searchRef = useRef(null);

  // Fetch pending friend requests counter
  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await api.getPendingFriendRequests();
        if (res.success && res.incoming) {
          setPendingCount(res.incoming.length);
        }
      } catch (e) {
        // silent catch
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, []);

  // Live user search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.searchUsers(searchQuery);
        setSearchResults(data || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setShowStatusMenu(false);
  };

  const handleStartChatFromSearch = async (targetUser) => {
    try {
      await startDMWithUser(targetUser._id);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  const handleSendFriendRequest = async (recipientId) => {
    try {
      await api.sendFriendRequest(recipientId);
      alert('Friend request sent!');
    } catch (err) {
      alert(err.message || 'Failed to send friend request');
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <aside className="app-sidebar">
      {/* 1. User Header & Status */}
      <div className="sidebar-user-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Avatar
              name={user?.displayName || user?.username}
              src={user?.avatarUrl}
              size={40}
              status={user?.status}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span className="user-card-name">{user?.displayName || user?.username}</span>
            <span className="user-card-handle">@{user?.username}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Status Picker Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className="icon-button"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              title="Change presence status"
            >
              <ChevronDown size={16} />
            </button>

            {showStatusMenu && (
              <div className="dropdown-menu">
                <button onClick={() => handleStatusChange('ONLINE')}>
                  🟢 Online
                </button>
                <button onClick={() => handleStatusChange('AWAY')}>
                  🟡 Away
                </button>
                <button onClick={() => handleStatusChange('OFFLINE')}>
                  ⚪ Invisible
                </button>
              </div>
            )}
          </div>

          <button
            className="icon-button"
            onClick={() => setShowProfileModal(true)}
            title="Edit Profile"
          >
            <Settings size={18} />
          </button>

          <button
            className="icon-button danger"
            onClick={logout}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* 2. Global Actions Row (Connections & New Group) */}
      <div className="sidebar-quick-actions">
        <button
          className="quick-action-pill"
          onClick={() => setShowFriendModal(true)}
          title="Friend Requests & Contacts"
        >
          <UserCheck size={16} />
          <span>Friends</span>
          {pendingCount > 0 && <span className="action-counter-badge">{pendingCount}</span>}
        </button>

        <button
          className="quick-action-pill primary"
          onClick={() => setShowCreateGroup(true)}
          title="Create New Group"
        >
          <Plus size={16} />
          <span>New Group</span>
        </button>
      </div>

      {/* 3. Search Bar */}
      <div className="sidebar-search-box" ref={searchRef}>
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search users or chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>

        {/* Live Search Results Popup */}
        {searchQuery.trim() !== '' && (
          <div className="search-results-dropdown">
            <div className="search-dropdown-header">USERS & CONTACTS</div>
            {isSearching ? (
              <div className="search-dropdown-loading">Searching...</div>
            ) : searchResults.length === 0 ? (
              <div className="search-dropdown-empty">No users found</div>
            ) : (
              searchResults.map((u) => (
                <div key={u._id} className="search-result-row">
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}
                    onClick={() => handleStartChatFromSearch(u)}
                  >
                    <Avatar name={u.displayName || u.username} src={u.avatarUrl} size={32} status={u.status} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {u.displayName || u.username}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>@{u.username}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn-icon-xs-primary"
                      onClick={() => handleStartChatFromSearch(u)}
                      title="Direct Message"
                    >
                      <MessageSquare size={14} />
                    </button>
                    <button
                      className="btn-icon-xs-secondary"
                      onClick={() => handleSendFriendRequest(u._id)}
                      title="Add Friend"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. Filter Tabs */}
      <div className="sidebar-tab-strip">
        <button
          className={`sidebar-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All
          {totalUnread > 0 && <span className="tab-badge">{totalUnread}</span>}
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'dms' ? 'active' : ''}`}
          onClick={() => setActiveTab('dms')}
        >
          Direct Messages
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
      </div>

      {/* 5. Scrollable Conversation List */}
      <div className="sidebar-conversation-viewport">
        <ConversationList filter={activeTab} />
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />

      <FriendRequestsModal
        isOpen={showFriendModal}
        onClose={() => setShowFriendModal(false)}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </aside>
  );
};

export default Sidebar;