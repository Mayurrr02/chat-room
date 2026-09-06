import React from 'react';

const Avatar = ({ name, src, size = 40, status, className = '' }) => {
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'User'
  )}&background=4F46E5&color=fff&rounded=true&bold=true`;

  const avatarSrc = src && src.trim() !== '' ? src : fallbackUrl;

  const getStatusColor = () => {
    switch (status) {
      case 'ONLINE':
        return '#10B981'; // Green
      case 'AWAY':
        return '#F59E0B'; // Amber
      case 'OFFLINE':
      default:
        return '#9CA3AF'; // Gray
    }
  };

  return (
    <div
      className={`avatar-container ${className}`}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
      }}
    >
      <img
        src={avatarSrc}
        alt={name || 'Avatar'}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
        }}
        onError={(e) => {
          e.target.src = fallbackUrl;
        }}
      />
      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: '0px',
            right: '0px',
            width: `${Math.max(size * 0.28, 8)}px`,
            height: `${Math.max(size * 0.28, 8)}px`,
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            border: '2px solid white',
            boxSizing: 'content-box',
          }}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};

export default Avatar;
