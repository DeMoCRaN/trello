import React, { useState, useMemo } from 'react';
import './AssigmentsList.css';

function AssignmentsList({ assignments, selectedAssignment, onSelect, onDelete, onShowCreateForm }) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleKeyDown = (e, assignment) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (assignment) {
        onSelect(assignment);
      }
    }
  };

  const handleDeleteClick = (assignmentId, e) => {
    e.stopPropagation();
    setDeleteConfirmId(assignmentId);
  };

  const confirmDelete = (e) => {
    e.stopPropagation();
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const cancelDelete = (e) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  const filteredAssignments = useMemo(() => {
    if (!searchTerm.trim()) return assignments;
    
    return assignments.filter(assignment => 
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assignment.description && assignment.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [assignments, searchTerm]);

  return (
    <section className={`assignments-list ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">
          <div className="title-icon">
          </div>
          {!collapsed && <span>Мои задания</span>}
        </div>
        <button
          className="collapse-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
        >
          <div className="toggle-icon">
            <svg className="left-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <svg className="right-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </div>
      
      {!collapsed ? (
        <div className="assignments-content">
          <div className="assignments-header">
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Поиск заданий..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="search-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            
            <button
              className="create-assignment-btn"
              onClick={() => onShowCreateForm()}
              title="Создать новое задание"
            >
              <div className="btn-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <span>Создать</span>
            </button>
          </div>
          
          <ul className="assignments-ul">
            {filteredAssignments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <p>Заданий не найдено</p>
                <button className="create-empty-btn" onClick={() => onShowCreateForm()}>
                  Создать задание
                </button>
              </div>
            ) : (
              filteredAssignments.map((assignment) => (
                <li
                  key={assignment.id}
                  className={selectedAssignment?.id === assignment.id ? 'selected' : ''}
                  onClick={() => onSelect(assignment)}
                  tabIndex={0}
                  onKeyDown={(e) => handleKeyDown(e, assignment)}
                  role="button"
                  aria-pressed={selectedAssignment?.id === assignment.id}
                >
                  <div className="assignment-main-content">
                    <div className="assignment-info">
                      <div className="assignment-title">{assignment.title}</div>
                      {assignment.description && (
                        <div className="assignment-description">
                          {assignment.description}
                        </div>
                      )}
                    </div>
                    
                    {deleteConfirmId === assignment.id ? (
                      <div className="delete-confirmation" onClick={(e) => e.stopPropagation()}>
                        <span className="confirm-text">Удалить?</span>
                        <div className="confirmation-buttons">
                          <button
                            onClick={confirmDelete}
                            className="confirm-btn confirm-yes"
                            title="Подтвердить удаление"
                          >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button
                            onClick={cancelDelete}
                            className="confirm-btn confirm-no"
                            title="Отменить удаление"
                          >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                        <button
                          onClick={(e) => handleDeleteClick(assignment.id, e)}
                          className="delete-btn"
                          title="Удалить задание"
                        >
                          ❌
                        </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <div className="collapsed-placeholder">
          <div className="placeholder-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p>Мои задания</p>
        </div>
      )}
    </section>
  );
}

export default AssignmentsList;