import React from 'react';
import { formatUsername } from '../../utils/formatters';
import styles from './TaskCard.module.css';

const AvatarStack = ({ assignees }) => {
  return (
    <div className={styles.avatarStack}>
      {assignees.slice(0, 3).map((name, i) => (
        <div 
          key={i} 
          className={styles.avatar} 
          title={formatUsername(name)}
          style={{ zIndex: 5 - i }}
        >
          {formatUsername(name).charAt(0).toUpperCase()}
        </div>
      ))}
      {assignees.length > 3 && (
        <div className={styles.avatarMore}>+{assignees.length - 3}</div>
      )}
    </div>
  );
};

const TaskCard = ({ task, onUpdateStatus, hasAdminRole }) => {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'DONE': return styles.statusDone;
      case 'IN_PROGRESS': return styles.statusProgress;
      case 'PENDING': return styles.statusPending;
      default: return styles.statusTodo;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={`${styles.statusPill} ${getStatusStyle(task.status)}`}>
          {task.status.replace('_', ' ')}
        </span>
        <div className={styles.cardId}>#{task.id.slice(0, 8)}</div>
      </div>
      
      <h3 className={styles.title}>{task.title}</h3>
      <p className={styles.description}>{task.description}</p>
      
      <div className={styles.cardFooter}>
        <AvatarStack assignees={task.assigneeIds || []} />
        
        <div className={styles.actions}>
            <select 
                value={task.status} 
                onChange={(e) => onUpdateStatus(task.id, e.target.value)}
                className={styles.statusSelect}
            >
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
            </select>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
