import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useChat } from '../../context/ChatContext';
import Avatar from '../common/Avatar';
import { X, UserPlus, Check, Trash2, MessageSquare, Clock } from 'lucide-react';

const FriendRequestsModal = ({ isOpen, onClose }) => {
  const { startDMWithUser } = useChat();
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'friends' | 'outgoing'
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [pendingRes, friendsRes] = await Promise.all([
        api.getPendingFriendRequests(),
        api.getFriends(),
      ]);

      if (pendingRes.success) {
        setIncoming(pendingRes.incoming || []);
        setOutgoing(pendingRes.outgoing || []);
      }
      if (friendsRes.success) {
        setFriends(friendsRes.friends || []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = async (requestId) => {
    try {
      await api.acceptFriendRequest(requestId);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await api.rejectFriendRequest(requestId);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await api.removeFriend(friendId);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleStartChat = async (friendId) => {
    try {
      await startDMWithUser(friendId);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-large">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="#4F46E5" />
            <h3>Connections & Friend Requests</h3>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tab-pill-bar">
          <button
            className={`tab-pill-btn ${activeTab === 'incoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('incoming')}
          >
            Incoming ({incoming.length})
          </button>
          <button
            className={`tab-pill-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button
            className={`tab-pill-btn ${activeTab === 'outgoing' ? 'active' : ''}`}
            onClick={() => setActiveTab('outgoing')}
          >
            Sent ({outgoing.length})
          </button>
        </div>

        <div className="modal-body" style={{ minHeight: '260px' }}>
          {errorMsg && <div className="alert-error">{errorMsg}</div>}
          {loading && <div className="loading-spinner-box">Loading connections...</div>}

          {!loading && activeTab === 'incoming' && (
            <div>
              {incoming.length === 0 ? (
                <div className="empty-state-box">
                  <Clock size={32} color="#94a3b8" />
                  <p>No incoming friend requests right now.</p>
                </div>
              ) : (
                incoming.map((req) => (
                  <div key={req._id} className="connection-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar name={req.sender.displayName || req.sender.username} src={req.sender.avatarUrl} size={38} status={req.sender.status} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                          {req.sender.displayName || req.sender.username}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>@{req.sender.username}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon-success" onClick={() => handleAccept(req._id)} title="Accept Request">
                        <Check size={16} /> Accept
                      </button>
                      <button className="btn-icon-danger" onClick={() => handleReject(req._id)} title="Decline Request">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && activeTab === 'friends' && (
            <div>
              {friends.length === 0 ? (
                <div className="empty-state-box">
                  <UserPlus size={32} color="#94a3b8" />
                  <p>You haven't added any friends yet. Search for users to connect!</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div key={friend._id} className="connection-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar name={friend.displayName || friend.username} src={friend.avatarUrl} size={38} status={friend.status} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                          {friend.displayName || friend.username}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          @{friend.username} • {friend.status === 'ONLINE' ? '🟢 Online' : '⚪ Offline'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon-primary" onClick={() => handleStartChat(friend._id)} title="Send Message">
                        <MessageSquare size={16} /> Chat
                      </button>
                      <button className="btn-icon-danger" onClick={() => handleRemoveFriend(friend._id)} title="Remove Friend">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && activeTab === 'outgoing' && (
            <div>
              {outgoing.length === 0 ? (
                <div className="empty-state-box">
                  <p>No pending sent requests.</p>
                </div>
              ) : (
                outgoing.map((req) => (
                  <div key={req._id} className="connection-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar name={req.recipient.displayName || req.recipient.username} src={req.recipient.avatarUrl} size={38} status={req.recipient.status} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                          {req.recipient.displayName || req.recipient.username}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>@{req.recipient.username}</div>
                      </div>
                    </div>
                    <span className="badge-pending">Pending</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestsModal;
