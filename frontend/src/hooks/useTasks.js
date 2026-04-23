import { useState, useCallback } from 'react';
import { TaskService } from '../services/api';

/**
 * Production-grade Custom Hook for Task Data Fetching
 * 
 * Purpose: Encapsulates all data fetching logic, loading states, and error handling for Tasks.
 * 
 * Why:
 * 1. Keeps React Components pure. Components should just display data and dispatch events,
 *    they shouldn't manage `try/catch` and `axios` directly.
 * 2. Reusability: You can drop `useTasks` in the Dashboard, the Header, or a Modal.
 */

export const useTasks = () => {
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await TaskService.getTasks();
            const normalizedItems = Array.isArray(response)
                ? response
                : (response.items || response.tasks || []);
            setTasks(normalizedItems);
        } catch (err) {
            setError(err.message || 'Failed to fetch tasks');
            console.error('Task fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        setError(null);
        try {
            const response = await TaskService.getUsers();
            const normalizedUsers = Array.isArray(response)
                ? response
                : (response.users || []);
            setUsers(normalizedUsers);
        } catch (err) {
            setError(err.message || 'Failed to fetch users');
            console.error('User fetch error:', err);
        }
    }, []);

    const createTask = async (payload) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await TaskService.createTask(payload);
            // Optimistically add the new task to the UI list
            setTasks(prev => [...prev, response]);
            return response;
        } catch (err) {
            setError(err.message || 'Failed to create task');
            throw err; // Let the UI component decide if it wants to show a toast
        } finally {
            setIsLoading(false);
        }
    };

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            // Optimistic UI Update - assume success and revert if failed
            setTasks(prev => 
                prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
            );
            
            await TaskService.updateTask(taskId, { status: newStatus });
        } catch (err) {
            setError('Failed to update task status. Reverting change.');
            console.error('Task update error:', err);
            // Revert changes by refetching
            await fetchTasks();
        }
    };

    const assignTask = async (taskId, assigneeIds) => {
        try {
            const response = await TaskService.assignTask(taskId, assigneeIds);
            setTasks(prev => 
                prev.map(t => t.id === taskId
                    ? { ...t, assigneeIds: Array.from(new Set([...(t.assigneeIds || []), ...assigneeIds])) }
                    : t)
            );
            return response;
        } catch (err) {
            setError(err.message || 'Failed to assign task');
            throw err;
        }
    };

    return {
        tasks,
        users,
        isLoading,
        error,
        fetchTasks,
        fetchUsers,
        createTask,
        updateTaskStatus,
        assignTask
    };
};
