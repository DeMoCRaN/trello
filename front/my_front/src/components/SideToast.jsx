import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import './SideToast.css';

function SideToast({ message, type = 'error', onClose, duration = 60000 }) {
  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timeoutId);
  }, [message, duration, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className={`side-toast side-toast--${type}`} role="status" aria-live="polite">
      <div className="side-toast__message">{message}</div>
      <button type="button" className="side-toast__close" onClick={onClose} aria-label="Закрыть уведомление">
        Закрыть
      </button>
    </div>
  );
}

SideToast.propTypes = {
  message: PropTypes.string,
  type: PropTypes.oneOf(['success', 'error', 'info']),
  onClose: PropTypes.func.isRequired,
  duration: PropTypes.number,
};

SideToast.defaultProps = {
  message: '',
  type: 'error',
  duration: 60000,
};

export default SideToast;
