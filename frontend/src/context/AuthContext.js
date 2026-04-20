import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth';

/**
 * Production-grade Authentication Context
 * 
 * Purpose: Manage global authentication state, user identity mapping, and Role-Based Access Control (RBAC).
 * Why:
 * 1. Global State Management: Prevents passing user props down 5 levels (Prop drilling).
 * 2. Caching Context: We fetch from Cognito once and distribute to the app.
 * 3. Security Boundaries: Exposes a `hasRole` helper directly from the Context to guard routes and buttons.
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check session on initial load
    checkcurrentSession();

    // Listen to global unauthorized event from api.js interceptor
    const handleUnauthorized = () => {
      // Constraint 4: "API calls without valid authentication tokens are rejected"
      // Frontend handling handles this redirect
      handleSignOut();
      window.location.href = '/login'; // Enforce authentication redirect
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const checkcurrentSession = async () => {
    setIsLoading(true);
    try {
      const { username, userId } = await getCurrentUser();
      const session = await fetchAuthSession();
      
      const idToken = session.tokens?.idToken;
      const groups = idToken?.payload['cognito:groups'] || [];
      const tenantId = idToken?.payload['custom:tenantId'] || null;

      setUser({
        username,
        userId,
        tenantId,
        roles: groups,
        isAuthenticated: true,
      });
      setError(null);
    } catch (err) {
      setUser(null);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  /**
   * Helper function to check RBAC permissions inside components
   */
  const hasRole = (role) => {
    if (!user || !user.roles.length) return false;
    return user.roles.includes(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        isAuthenticated: !!user,
        hasRole,
        checkcurrentSession,
        logout: handleSignOut,
      }}
    >
      {/* Show loader while checking initial auth state to avoid flashing content */}
      {isLoading ? <div className="spinner">Loading Session...</div> : children}
    </AuthContext.Provider>
  );
};

// Custom hook helper to avoid importing useContext and AuthContext separately everywhere
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
