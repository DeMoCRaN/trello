import React, { useState } from 'react';
import './Components.css';

function TaskCreationForm({
  onCreateTask,
  statuses,
  priorities,
  onClose,
  initialCreatorEmail = '',
  initialAssigneeEmail = '',
  task = null,
  isDetailsView = false,
}) {
  const [newTaskTitle, setNewTaskTitle] = useState(task ? task.title : '');
  const [newTaskDescription, setNewTaskDescription] = useState(task ? task.description : '');
  const [newTaskDeadline, setNewTaskDeadline] = useState(task ? (task.deadline ? task.deadline.substring(0, 16) : '') : '');
  const [newTaskStatus, setNewTaskStatus] = useState(task ? String(task.status_id || '1') : '1');
  const [newTaskPriority, setNewTaskPriority] = useState(task ? String(task.priority_id || '1') : '1');
  const [newTaskCreatorEmail, setNewTaskCreatorEmail] = useState(task ? task.creator_email || initialCreatorEmail : initialCreatorEmail);
  const [newTaskAssigneeEmail, setNewTaskAssigneeEmail] = useState(task ? task.assignee_email || initialAssigneeEmail : initialAssigneeEmail);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDetailsView) {
      onClose();
      return;
    }
    onCreateTask({
      title: newTaskTitle,
      description: newTaskDescription,
      deadline: newTaskDeadline,
      statusId: newTaskStatus,
      priorityId: newTaskPriority,
      creatorEmail: newTaskCreatorEmail,
      assigneeEmail: newTaskAssigneeEmail,
    });
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskDeadline('');
    setNewTaskStatus('1');
    setNewTaskPriority('1');
    setNewTaskCreatorEmail('');
    setNewTaskAssigneeEmail('');
  };

  return (
    <div className={`task-form-overlay ${isDetailsView ? 'details-form-overlay' : ''}`}>
      <form className="task-creation-form" onSubmit={handleSubmit}>
        <button type="button" className="close-button" onClick={onClose}>×</button>
        <h3>{isDetailsView ? 'Детали задачи' : 'Создать новую задачу'}</h3>
        <label>
          Название задачи:
          <input
            type="text"
            placeholder="Название задачи"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            required
            readOnly={isDetailsView}
          />
        </label>
        <label>
          Описание задачи:
          <textarea
            placeholder="Описание задачи"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            required
            readOnly={isDetailsView}
          />
        </label>
        <label>
          Дедлайн:
          <input
            type="datetime-local"
            value={newTaskDeadline}
            onChange={(e) => setNewTaskDeadline(e.target.value)}
            readOnly={isDetailsView}
          />
        </label>
        <label>
          Создатель (Email):
          <input
            type="email"
            value={newTaskCreatorEmail}
            onChange={(e) => setNewTaskCreatorEmail(e.target.value)}
            placeholder="Введите email создателя"
            required
            readOnly
          />
        </label>
        <label>
          Исполнитель (Email):
          <input
            type="email"
            value={newTaskAssigneeEmail}
            onChange={(e) => setNewTaskAssigneeEmail(e.target.value)}
            placeholder="Введите email исполнителя"
            required
            readOnly={isDetailsView}
          />
        </label>
        <label>
          Статус:
          <select
            value={newTaskStatus}
            onChange={(e) => setNewTaskStatus(e.target.value)}
            disabled={isDetailsView}
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Приоритет:
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value)}
            disabled={isDetailsView}
          >
            {priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={isDetailsView}>{isDetailsView ? 'Закрыть' : 'Создать задачу'}</button>
      </form>
    </div>
  );
}

export default TaskCreationForm;
