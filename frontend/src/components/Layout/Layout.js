import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatUsername } from '../../utils/formatters';
import styles from './Layout.module.css';

const Sidebar = () => {
  const { user } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>Z</div>
        <span>Zenith-Task</span>
      </div>

      <nav className={styles.nav}>
        <NavLink
          to="/tasks"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>📋</span>
          Tasks
        </NavLink>
        <NavLink
          to="/team"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>👥</span>
          Team
        </NavLink>
        <div className={styles.navItem}>
          <span className={styles.icon}>⚙️</span>
          Settings
        </div>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.userBadge}>
          <div className={styles.avatar}>{user?.username?.charAt(0).toUpperCase()}</div>
          <div className={styles.userMeta}>
            <div className={styles.username}>{formatUsername(user?.username)}</div>
            <div className={styles.role}>{user?.roles?.[0]}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({ title }) => {
  const { logout } = useAuth();

  return (
    <header className={styles.topBar}>
      <div className={styles.search}>
        <span className={styles.searchIcon}>🔍</span>
        <input type="text" placeholder="Search tasks..." />
      </div>
      <div className={styles.actions}>
        <button className={styles.logoutBtn} onClick={logout}>Sign Out</button>
      </div>
    </header>
  );
};

export default function Layout({ children, title }) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.mainContainer}>
        <TopBar title={title} />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
