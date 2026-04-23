import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import Layout from '../components/Layout/Layout';
import { formatUsername } from '../utils/formatters';
import { UserCardSkeleton } from '../components/Skeleton/Skeleton';
import styles from './TeamPage.module.css';

const TeamPage = () => {
    const { users, isLoading, fetchUsers } = useTasks();
    const { user: currentUser } = useAuth();

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return (
        <Layout title="Team Members">
            <div className={styles.header}>
                <h1 className={styles.title}>Team Members</h1>
                <p className={styles.subtitle}>View and manage your organization's members</p>
            </div>

            <div className={styles.userGrid}>
                {isLoading ? (
                    [...Array(4)].map((_, i) => <UserCardSkeleton key={i} />)
                ) : (
                    users.map((u) => (
                        <div key={u.username} className={`${styles.userCard} ${u.username === currentUser?.username ? styles.selfCard : ''}`}>
                            <div className={styles.avatar}>
                                {formatUsername(u.email || u.username).charAt(0).toUpperCase()}
                            </div>
                            <div className={styles.userInfo}>
                                <h3 className={styles.userName}>
                                    {formatUsername(u.email || u.username)}
                                    {u.username === currentUser?.username && <span className={styles.meBadge}>You</span>}
                                </h3>
                                <p className={styles.userEmail}>{u.email || u.username}</p>
                                <div className={styles.badgeRow}>
                                    <span className={`${styles.statusBadge} ${u.enabled ? styles.enabled : styles.disabled}`}>
                                        {u.enabled ? 'Active' : 'Disabled'}
                                    </span>
                                    <span className={styles.roleBadge}>{u.status}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Layout>
    );
};

export default TeamPage;
