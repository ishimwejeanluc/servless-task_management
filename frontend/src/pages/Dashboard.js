import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Production-grade Application Dashboard Page
 * 
 * Purpose: Main entry point for authenticated users. Connects UI Components to our Hooks and Contexts.
 * 
 * Why: 
 * 1. Strict separation of concerns (No APIs handled here, just UI logic mapped to hooks).
 * 2. Uses RBAC (hasRole) logic correctly to dynamically show/hide UI sections.
 * 3. Wrapped in an ErrorBoundary at a feature level (If Dashboard crashes, header still works).
 */

const DashboardContent = () => {
    // 1. Grab Global Auth Data (Tokens, Roles, Loading States)
    const { user, hasRole, logout } = useAuth();
    
    // 2. Grab Feature Specific Data (Tasks from Custom Hook)
    const { tasks, isLoading, error, fetchTasks, createTask, updateTaskStatus, assignTask } = useTasks();
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState(''); // For initial assignment
    const [assigneeInputs, setAssigneeInputs] = useState({}); // Track assignment inputs per task

    // On mount, fetch task data
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            await createTask({ 
                title: newTaskTitle, 
                description: 'Generated from UI',
                status: 'TODO',
                assigneeId: newTaskAssignee.trim() || 'UNASSIGNED'
            });
            setNewTaskTitle(''); // clear form on success
            setNewTaskAssignee(''); // clear form
        } catch (err) {
            alert('Failed to save task: ' + err.message); // Production would use a Toast component
        }
    };

    const handleAssignTask = async (taskId) => {
        const assignee = assigneeInputs[taskId];
        if (!assignee || !assignee.trim()) return;

        try {
            await assignTask(taskId, assignee.trim());
            // Clear input after success
            setAssigneeInputs(prev => ({...prev, [taskId]: ''}));
            alert('Task assigned successfully!');
        } catch (err) {
             alert('Failed to assign task: ' + err.message); 
        }
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
                <h1>Task Management Dashboard</h1>
                <div>
                    <p>Welcome, {user?.username} ({user?.roles.join(', ')})</p>
                    <button onClick={logout}>Sign Out</button>
                </div>
            </header>

            {/* Error Handling */}
            {error && <div style={{ color: 'red', margin: '1rem 0', padding: '1rem', background: '#ffe6e6' }}>{error}</div>}

            {/* Admin Only Section (RBAC Implementation) */}
            {hasRole('Admin') ? (
                <section style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
                    <h2>Admin Controls: Create Task</h2>
                    <form onSubmit={handleCreateTask} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="New Task Title..."
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            style={{ padding: '0.5rem', width: '250px' }}
                            disabled={isLoading}
                        />
                        <input
                            type="text"
                            placeholder="Assign To (Username)..."
                            value={newTaskAssignee}
                            onChange={(e) => setNewTaskAssignee(e.target.value)}
                            style={{ padding: '0.5rem', width: '200px' }}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !newTaskTitle.trim()}>
                            Add & Optionally Assign Task
                        </button>
                    </form>
                </section>
            ) : (
                <section style={{ marginTop: '2rem', padding: '1rem', background: '#e6f7ff', borderRadius: '4px', color: '#005bb5' }}>
                    <p>Member View: You can view and update task statuses, but cannot create new tasks.</p>
                </section>
            )}

            {/* Main Task List */}
            <section style={{ marginTop: '2rem' }}>
                <h2>Your Tasks {isLoading && <small>(Refreshing...)</small>}</h2>
                
                {tasks.length === 0 && !isLoading && <p>No tasks found for your tenant.</p>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {tasks.map(task => (
                        <div key={task.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <strong>{task.title}</strong>
                                <p style={{ margin: '0.5rem 0', color: '#666' }}>{task.description}</p>
                                <small style={{ color: '#005bb5', display: 'block', margin: '0.5rem 0' }}>Assignee: {task.assigneeId || 'Unassigned'} | ID: {task.id}</small>
                                
                                {/* Constraint: Admins can assign tasks to other users */}
                                {hasRole('Admin') && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                         <input 
                                             type="text" 
                                             placeholder="Re-assign to username..."
                                             value={assigneeInputs[task.id] || ''}
                                             onChange={(e) => setAssigneeInputs(prev => ({...prev, [task.id]: e.target.value}))}
                                             style={{ padding: '0.2rem' }}
                                         />
                                         <button onClick={() => handleAssignTask(task.id)} disabled={isLoading}>
                                             Assign
                                         </button>
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ textAlign: 'right' }}>
                                <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Status:</label>
                                {/* Both Admins and Members can change status */}
                                <select 
                                    value={task.status} 
                                    onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                    disabled={isLoading}
                                >
                                    <option value="TODO">To Do</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="DONE">Done</option>
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

        </div>
    );
};

// Wrap the actual Dashboard content in a specific ErrorBoundary
// so a crash here doesn't take down the sidebar/layout of the application
export default function Dashboard() {
    return (
        <ErrorBoundary>
            <DashboardContent />
        </ErrorBoundary>
    );
}