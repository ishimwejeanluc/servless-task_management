import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Production-Grade API Abstraction Layer
 * 
 * Purpose: Centralizes all HTTP interactions. The UI components (Pages) should NEVER 
 * call `fetch` or `axios` directly. They should only call methods from this file.
 * 
 * Why: 
 * 1. Allows us to swap the fetching library later without touching UI code.
 * 2. Automates JWT token injection via Interceptors.
 * 3. Standardizes error handling and response formatting.
 */

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://api.yourdomain.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Automatically inject Cognito JWT into Authorization header
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Fetch the current session from AWS Amplify (Cognito)
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.warn('No active auth session found for API request');
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize error formatting and handle global 401s
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customError = {
      message: 'An unexpected error occurred.',
      status: error.response?.status,
      details: error.response?.data,
    };

    if (error.response?.status === 401) {
      customError.message = 'Session expired. Please log in again.';
      // Trigger global logout event or redirect to login
      window.dispatchEvent(new Event('auth:unauthorized'));
    } else if (error.response?.status === 403) {
      customError.message = 'You do not have permission to perform this action.';
    } else if (error.response?.status >= 500) {
      customError.message = 'Server is currently unavailable. Please try again later.';
    }

    return Promise.reject(customError);
  }
);

// -----------------------------------------------------------------------------
// Service Methods
// -----------------------------------------------------------------------------

export const TaskService = {
  /**
   * Fetch tasks for the current user/tenant
   */
  getTasks: () => apiClient.get('/tasks'),

  /**
   * Fetch users for admin dashboard assignment workflow
   */
  getUsers: () => apiClient.get('/users'),

  /**
   * Create a new task (Requires Admin Role)
   */
  createTask: (payload) => apiClient.post('/tasks', payload),

  /**
   * Update task status or details
   */
  updateTask: (id, payload) => apiClient.put(`/tasks/${id}`, payload),

  /**
   * Assign a task to a user (Requires Admin Role)
   */
  assignTask: (id, assigneeIds) => apiClient.post(`/tasks/${id}/assign`, { assigneeIds }),
};

export default apiClient;
