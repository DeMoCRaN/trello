import React, { useState } from 'react';
import './Components.css';

function AssignmentCreationForm({
  onCreateAssignment,
  onClose,
  assignment = null,
  isDetailsView = false,
}) {
  const [newAssignmentTitle, setNewAssignmentTitle] = useState(assignment ? assignment.title : '');
  const [newAssignmentDescription, setNewAssignmentDescription] = useState(assignment ? assignment.description : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isDetailsView) {
      onClose();
      return;
    }
    
    const assignmentData = {
      title: newAssignmentTitle,
      description: newAssignmentDescription,
    };

    onCreateAssignment(assignmentData);

    // Emit event for immediate refresh
    import('./../utils/eventBus').then(({ default: eventBus }) => {
      eventBus.emit('assignmentCreated', assignmentData);
    });

    if (!assignment) {
      // Reset form only when creating new assignment
      setNewAssignmentTitle('');
      setNewAssignmentDescription('');
    }
  };

  return (
    <div className={`task-form-overlay ${isDetailsView ? 'details-form-overlay' : ''}`}>
      <form className="task-creation-form" onSubmit={handleSubmit}>
        <button type="button" className="close-button" onClick={onClose}>×</button>
        <h3>{isDetailsView ? 'Детали задания' : assignment ? 'Редактировать задание' : 'Создать новое задание'}</h3>
        
        <label>
          Название задания:
          <input
            type="text"
            placeholder="Введите название задания"
            value={newAssignmentTitle}
            onChange={(e) => setNewAssignmentTitle(e.target.value)}
            required
            readOnly={isDetailsView}
          />
        </label>

        <label>
          Описание задания:
          <textarea
            placeholder="Введите описание задания"
            value={newAssignmentDescription}
            onChange={(e) => setNewAssignmentDescription(e.target.value)}
            rows="4"
            readOnly={isDetailsView}
          />
        </label>

        <button type="submit" className="submit-button">
          {isDetailsView ? 'Закрыть' : assignment ? 'Обновить задание' : 'Создать задание'}
        </button>
      </form>
    </div>
  );
}

export default AssignmentCreationForm;
