import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';
import AuthPage from './components/auth/AuthPage';
import AppLayout from './components/layout/AppLayout';
import './App.css';
import { Loader2 } from 'lucide-react';

const RootContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          gap: '12px',
        }}
      >
        <Loader2 size={36} className="spin-icon" color="#4F46E5" />
        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
          Connecting to AI Chat Platform...
        </span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <SocketProvider>
      <ChatProvider>
        <AppLayout />
      </ChatProvider>
    </SocketProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RootContent />
    </AuthProvider>
  );
}