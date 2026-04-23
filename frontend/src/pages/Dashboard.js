import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import Layout from '../components/Layout/Layout';
import TaskCard from '../components/TaskCard/TaskCard';
import TaskModal from '../components/TaskModal/TaskModal';
import { TaskCardSkeleton } from '../components/Skeleton/Skeleton';
import styles from './Dashboard.module.css';



const DashboardContent = () => {
    const { hasRole } = useAuth();
    const { tasks, users, isLoading, error, fetchTasks, fetchUsers, createTask, updateTaskStatus } = useTasks();
    
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchTasks();
        if (hasRole('Admin')) {
            fetchUsers();
        }
    }, [fetchTasks, fetchUsers, hasRole]);

    const handleCreateTask = async (payload) => {
        try {
            await createTask({ 
                ...payload,
                status: 'TODO'
            });
        } catch (err) {
            alert('Failed to save task: ' + err.message);
        }
    };

    return (
        <Layout title="Tasks">
            <div className={styles.dashboardHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Project Tasks</h1>
                    <p className={styles.pageSubtitle}>Manage and track your team's progress</p>
                </div>
                {hasRole('Admin') && (
                    <button 
                        className={styles.primaryBtn}
                        onClick={() => setIsModalOpen(true)}
                    >
                        <span className={styles.plusIcon}>+</span>
                        New Task
                    </button>
                )}
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}

            <div className={styles.taskGrid}>
                {isLoading ? (
                    [...Array(6)].map((_, i) => <TaskCardSkeleton key={i} />)
                ) : tasks.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>No tasks found. Click "New Task" to get started.</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            onUpdateStatus={updateTaskStatus}
                            hasAdminRole={hasRole('Admin')}
                        />
                    ))
                )}
            </div>

            <TaskModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateTask}
                users={users}
                isLoading={isLoading}
            />
        </Layout>
    );
};

export default DashboardContent;