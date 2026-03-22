import React, { useState } from 'react';
import BaseModal from './BaseModal';
import './Components.css';

function AssignmentCreationForm({
  onCreateAssignment,
  onClose,
  assignment = null,
  isDetailsView = false,
}) {
  const [newAssignmentTitle, setNewAssignmentTitle] = useState(assignment ? assignment.title : '');
  const [newAssignmentDescription, setNewAssignmentDescription] = useState(assignment ? assignment.description : '');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isDetailsView) {
      onClose();
      return;
    }

    const assignmentData = {
      title: newAssignmentTitle,
      description: newAssignmentDescription,
    };

    onCreateAssignment(assignmentData);

    import('./../utils/eventBus').then(({ default: eventBus }) => {
      eventBus.emit('assignmentCreated', assignmentData);
    });

    if (!assignment) {
      setNewAssignmentTitle('');
      setNewAssignmentDescription('');
    }
  };

  const modalTitle = isDetailsView ? 'Детали задания' : assignment ? 'Редактировать задание' : 'Создать новый проект';

  return (
    <BaseModal
      onClose={onClose}
      title={modalTitle}
      size="sm"
      panelClassName="task-creation-form"
      bodyClassName="task-creation-form__body"
    >
      <form onSubmit={handleSubmit}>
        <label>
          Название проекта:
          <input
            type="text"
            placeholder="Введите название проекта"
            value={newAssignmentTitle}
            onChange={(event) => setNewAssignmentTitle(event.target.value)}
            required
            readOnly={isDetailsView}
          />
        </label>

        <label>
          Описание проекта:
          <textarea
            placeholder="Введите описание проекта"
            value={newAssignmentDescription}
            onChange={(event) => setNewAssignmentDescription(event.target.value)}
            rows="4"
            readOnly={isDetailsView}
          />
        </label>

        <button type="submit" className="submit-button">
          {isDetailsView ? 'Закрыть' : assignment ? 'Обновить задание' : 'Создать проект'}
        </button>
      </form>
    </BaseModal>
  );
}

export default AssignmentCreationForm;
