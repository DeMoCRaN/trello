import React, { useState } from 'react';
import './AssigmentsList.css';

function AssignmentsList({ assignments, selectedAssignment, onSelect, onDelete, onCreate }) {
  const [collapsed, setCollapsed] = useState(false);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');

  const handleKeyDown = (e, assignment) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (assignment) {
        onSelect(assignment);
      } else {
        handleCreate();
      }
    }
  };

  const handleCreate = async () => {
    if (newAssignmentTitle.trim()) {
      const assignmentData = { title: newAssignmentTitle };
      const success = await onCreate(assignmentData);
      if (success) {
        setNewAssignmentTitle('');
        // Additional success handling if needed
      }
    }
  };

  return (
    <section className={`assignments-list ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="collapse-toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
      >
        {collapsed ? '▶' : '◀'}
      </button>
      
      {!collapsed && (
        <div className="assignments-content">
          <div className="assignment-actions">
            <input
              type="text"
              value={newAssignmentTitle}
              onChange={(e) => setNewAssignmentTitle(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              placeholder="Название задания"
              className="assignment-input"
            />
            <button 
              onClick={handleCreate}
              className="assignment-action-btn create-btn"
              disabled={!newAssignmentTitle.trim()}
            >
              +
            </button>
          </div>
          
          <ul className="assignments-ul">
            {assignments.map((assignment) => (
              <li
                key={assignment.id}
                className={selectedAssignment?.id === assignment.id ? 'selected' : ''}
              >
                <div 
                  className="assignment-title"
                  onClick={() => onSelect(assignment)}
                  tabIndex={0}
                  onKeyDown={(e) => handleKeyDown(e, assignment)}
                  role="button"
                  aria-pressed={selectedAssignment?.id === assignment.id}
                >
                  {assignment.title}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(assignment.id);
                  }}
                  className="assignment-action-btn delete-btn"
                  title="Удалить задание"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default AssignmentsList;