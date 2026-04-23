import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatUsername } from '../../utils/formatters';
import styles from './TaskModal.module.css';

const TaskModal = ({ isOpen, onClose, onSubmit, users, isLoading }) => {
  const { user: currentUser } = useAuth();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [assigneeIds, setAssigneeIds] = React.useState([]);

  if (!isOpen) return null;

  // Filter out the current user and format the list
  const assignableUsers = users.filter(u => u.username !== currentUser?.username);

  const toggleAssignee = (userId) => {
    setAssigneeIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ title, description, assigneeIds });
    setTitle('');
    setDescription('');
    setAssigneeIds([]);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className={styles.modalHeader}>
          <h2>Create New Task</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Title</label>
            <input 
              type="text" 
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.field}>
            <label>Description</label>
            <textarea 
              placeholder="Add more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div className={styles.field}>
            <label>Assign Team Members</label>
            <div className={styles.userListScroll}>
              {assignableUsers.map(u => (
                <label key={u.username} className={styles.userCheckboxRow}>
                  <input 
                    type="checkbox"
                    checked={assigneeIds.includes(u.username)}
                    onChange={() => toggleAssignee(u.username)}
                  />
                  <span>{formatUsername(u.email || u.username)}</span>
                </label>
              ))}
              {assignableUsers.length === 0 && <p className={styles.emptyUsers}>No other team members found.</p>}
            </div>
          </div>
          
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={isLoading || !title.trim()}>
              {isLoading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
