import { useState, useEffect } from 'react';
import '../styles/Notification.css';

const Notification = ({
  message = 'Waiting for another user...',
  type = 'info',
  isVisible = true,
  onDismiss = null,
  autoHide = false,
  autoHideDelay = 5000
}) => {
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    setShow(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (autoHide && show) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, show]);

  const handleDismiss = () => {
    setShow(false);
    if (onDismiss) {
      setTimeout(() => onDismiss(), 300);
    }
  };

  if (!show) return null;

  return (
    <div className="notification-container">
      <div className={`notification ${type}`}>
        <div className="notification-content">
          <span className="notification-icon">
            {type === 'success' && '✓'}
            {type === 'error' && '!'}
            {type === 'warning' && '⚠'}
            {type === 'info' && 'ⓘ'}
          </span>
          <span className="notification-message">{message}</span>
        </div>
        {onDismiss && (
          <button
            className="dismiss-button"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Notification;
