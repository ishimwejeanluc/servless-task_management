import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';

import { Amplify } from 'aws-amplify';

/**
 * Production-grade Application Root (No React Router configured to keep example simple,
 * but shows where Providers sit in the tree)
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

// Basic Router Component
const AppRoutes = () => {
  const { isAuthenticated, error, checkcurrentSession } = useAuth();
  
  // Constraint 2: "Frontend access without login redirects to authentication flow"
  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={checkcurrentSession} />;
  }

  // If authenticated, show the dashboard
  return <Dashboard />;
};


function App() {
  return (
    // 1. Wrap the entire app in the Auth Context so any component can `useAuth()`
    <AuthProvider>
        <AppRoutes />
    </AuthProvider>
  );
}

export default App;