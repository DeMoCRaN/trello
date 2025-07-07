import React from 'react';
import './Components.css';

function FloatingButton({ onClick }) {
  return (
    <button className="floating-button" onClick={onClick} aria-label="Создать задачу">
      +
    </button>
  );
}

export default FloatingButton;
