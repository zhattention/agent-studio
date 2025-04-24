import React from 'react';
import styles from './NotificationStyles.module.css';
import { observer } from 'mobx-react-lite';
import { useStore } from '../stores/StoreContext';

const Notification: React.FC = observer(() => {
  const { uiStore } = useStore();
  
  if (!uiStore.notification) return null;
  
  const { type, message } = uiStore.notification;
  
  return (
    <div className={`${styles.notification} ${styles[type]}`}>
      {/* 通知图标 */}
      {type === 'success' && (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" className={styles.icon}>
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
      )}
      {type === 'error' && (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" className={styles.icon}>
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
        </svg>
      )}
      {type === 'info' && (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" className={styles.icon}>
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
      )}
      {type === 'warning' && (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" className={styles.icon}>
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path d="M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-6h-2v4h2v-4z"/>
        </svg>
      )}
      
      {/* 通知文本 */}
      <div className={styles.message}>{message}</div>
      
      {/* 关闭按钮 */}
      <div 
        className={styles.closeButton} 
        onClick={() => uiStore.clearNotification()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M0 0h24v24H0V0z" fill="none"/>
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
        </svg>
      </div>
    </div>
  );
});

export default Notification; 