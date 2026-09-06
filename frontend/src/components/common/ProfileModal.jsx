import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from './Avatar';
import { X, Check, Camera, User, Mail, FileText, Activity } from 'lucide-react';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const { setStatus } = useSocket();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [email, setEmail] = useState(user?.email || '');
  const [status, setUserStatus] = useState(user?.status || 'ONLINE');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
        email: email.trim(),
        status,
      });

      setStatus(status);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 800);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>Edit Profile</h3>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errorMsg && <div className="alert-error">{errorMsg}</div>}
          {successMsg && <div className="alert-success">{successMsg}</div>}

          {/* Avatar Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Avatar name={displayName || user?.username} src={avatarUrl} size={70} status={status} />
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>@{user?.username}</span>
          </div>

          <div className="form-group">
            <label><User size={14} /> Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Mayur Jadhav"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label><Mail size={14} /> Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. mayur@example.com"
            />
          </div>

          <div className="form-group">
            <label><Camera size={14} /> Avatar Image URL</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label><FileText size={14} /> Bio / Status Message</label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Building the future of AI communication..."
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label><Activity size={14} /> Presence Status</label>
            <select value={status} onChange={(e) => setUserStatus(e.target.value)} className="select-input">
              <option value="ONLINE">🟢 Online</option>
              <option value="AWAY">🟡 Away</option>
              <option value="OFFLINE">⚪ Invisible / Offline</option>
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
