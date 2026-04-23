import React from 'react';
import styles from './Skeleton.module.css';

export const TaskCardSkeleton = () => (
  <div className={styles.cardSkeleton}>
    <div className={`${styles.shimmer} ${styles.badge}`}></div>
    <div className={`${styles.shimmer} ${styles.title}`}></div>
    <div className={`${styles.shimmer} ${styles.desc}`}></div>
    <div className={styles.footer}>
      <div className={`${styles.shimmer} ${styles.avatar}`}></div>
      <div className={`${styles.shimmer} ${styles.action}`}></div>
    </div>
  </div>
);

export const UserCardSkeleton = () => (
  <div className={styles.userSkeleton}>
    <div className={`${styles.shimmer} ${styles.userAvatar}`}></div>
    <div className={styles.userInfo}>
      <div className={`${styles.shimmer} ${styles.userName}`}></div>
      <div className={`${styles.shimmer} ${styles.userEmail}`}></div>
    </div>
  </div>
);
