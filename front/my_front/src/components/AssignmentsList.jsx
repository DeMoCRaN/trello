import React, { useState } from 'react';
import './Components.css';

function AssignmentsList({ assignments, selectedAssignment, onSelect }) {
  const [collapsed, setCollapsed] = useState(false);

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
        <ul>
          {assignments.map((assignment) => (
            <li
              key={assignment.id}
              className={selectedAssignment?.id === assignment.id ? 'selected' : ''}
              onClick={() => onSelect(assignment)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelect(assignment);
                }
              }}
              role="button"
              aria-pressed={selectedAssignment?.id === assignment.id}
            >
              {assignment.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AssignmentsList;
