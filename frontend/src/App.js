import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import TeamPage from './pages/TeamPage';
import AuthPage from './pages/AuthPage';
import { Amplify } from 'aws-amplify';

/**
 * Production-grade Application Root
 * 
 * Purpose: Top-level App component wrapping everything in Providers.
 */

// Simulated manual Amplify config for context
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID,
      userPoolClientId: process.env.REACT_APP_APP_CLIENT_ID,
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
      }
    }
  }
});

const AppRoutes = () => {
  const { isAuthenticated, checkcurrentSession } = useAuth();

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={checkcurrentSession} />;
  }

  return (
    <Routes>
      <Route path="/tasks" element={<Dashboard />} />
      <Route path="/team" element={<TeamPage />} />
      <Route path="/" element={<Navigate to="/tasks" replace />} />
      <Route path="*" element={<Navigate to="/tasks" replace />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;