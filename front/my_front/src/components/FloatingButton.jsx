import React from 'react';
import './Components.css';

function FloatingButton({ onClick, children = '+', ariaLabel = 'Создать задачу' }) {
  return (
    <button className="floating-button" onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export default FloatingButton;
