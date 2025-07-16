import React from 'react';
import '../components/Components.css';

function UserProfileForm({ userEmail, onClose }) {
  if (!userEmail) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Профиль пользователя</h2>
        <div className="task-details-grid">
          <div className="detail-item">
            <span className="detail-label">Email:</span>
            <span className="detail-value email">{userEmail}</span>
          </div>
          {/* Additional user profile fields can be added here */}
        </div>
      </div>
    </div>
  );
}

export default UserProfileForm;
