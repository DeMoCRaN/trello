import React, { useState, useMemo } from 'react';
import BaseModal from './BaseModal';
import './AssigmentsList.css';

function AssignmentsList({ assignments, selectedAssignment, onSelect, onDelete, onShowCreateForm }) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteUnlocked, setDeleteUnlocked] = useState(false);

  const handleKeyDown = (event, assignment) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (assignment) {
        onSelect(assignment);
      }
    }
  };

  const handleDeleteClick = (assignment, event) => {
    event.stopPropagation();
    setDeleteTarget(assignment);
    setDeleteUnlocked(false);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteUnlocked(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    closeDeleteModal();
  };

  const filteredAssignments = useMemo(() => {
    if (!searchTerm.trim()) return assignments;

    return assignments.filter((assignment) => (
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase())
      || (assignment.description && assignment.description.toLowerCase().includes(searchTerm.toLowerCase()))
    ));
  }, [assignments, searchTerm]);

  return (
    <>
      <section className={`assignments-list ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <div className="title-icon" />
            {!collapsed && <span>Проекты</span>}
          </div>
          <button
            className="collapse-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
            title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          >
            <div className="toggle-icon">
              <svg className="left-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg className="right-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <div className="search-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <button
                className="create-assignment-btn"
                onClick={() => onShowCreateForm()}
                title="Создать новый проект"
              >
                <div className="btn-icon">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
                      <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p>Заданий не найдено</p>
                  <button className="create-empty-btn" onClick={() => onShowCreateForm()}>
                    Создать проект
                  </button>
                </div>
              ) : (
                filteredAssignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className={selectedAssignment?.id === assignment.id ? 'selected' : ''}
                    onClick={() => onSelect(assignment)}
                    tabIndex={0}
                    onKeyDown={(event) => handleKeyDown(event, assignment)}
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

                      <button
                        onClick={(event) => handleDeleteClick(assignment, event)}
                        className="delete-btn"
                        title="Удалить задание"
                        type="button"
                      >
                        X
                      </button>
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
                <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p>Проекты</p>
          </div>
        )}
      </section>

      {deleteTarget && (
        <BaseModal
          onClose={closeDeleteModal}
          title={`Удаление проекта${deleteTarget.title ? `: ${deleteTarget.title}` : ''}`}
          size="sm"
          panelClassName="assignment-delete-modal"
          bodyClassName="assignment-delete-modal__body"
        >
          <div className="assignment-delete-modal__content">
            <p className="assignment-delete-modal__text">
              Чтобы удалить проект, сначала нужно удалить все задачи из этого проекта во всех вкладках:
              активные, на ревью, архивные и проваленные.
            </p>
            <p className="assignment-delete-modal__hint">
              После того как убедишься, что проект пустой, подтверди это ниже.
            </p>

            {!deleteUnlocked ? (
              <button
                type="button"
                className="assignment-delete-modal__acknowledge"
                onClick={() => setDeleteUnlocked(true)}
              >
                Подтверждаю, что проверю все вкладки
              </button>
            ) : (
              <div className="assignment-delete-modal__actions">
                <button
                  type="button"
                  className="assignment-delete-modal__cancel"
                  onClick={closeDeleteModal}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="assignment-delete-modal__delete"
                  onClick={confirmDelete}
                >
                  Удалить проект
                </button>
              </div>
            )}
          </div>
        </BaseModal>
      )}
    </>
  );
}

export default AssignmentsList;
