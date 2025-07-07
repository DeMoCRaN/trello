import React, { useState } from 'react';
import './Components.css';

function TaskCreationForm({
  onCreateTask,
  statuses,
  priorities,
  onClose,
  initialCreatorEmail = '',
  initialAssigneeEmail = '',
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('1');
  const [newTaskPriority, setNewTaskPriority] = useState('1');
  const [newTaskCreatorEmail, setNewTaskCreatorEmail] = useState(initialCreatorEmail);
  const [newTaskAssigneeEmail, setNewTaskAssigneeEmail] = useState(initialAssigneeEmail);

  const handleSubmit = (e) => {
    e.preventDefault();
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
    <div className="task-form-overlay">
      <form className="task-creation-form" onSubmit={handleSubmit}>
        <button type="button" className="close-button" onClick={onClose}>×</button>
        <h3>Создать новую задачу</h3>
        <label>
          Название задачи:
          <input
            type="text"
            placeholder="Название задачи"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            required
          />
        </label>
        <label>
          Описание задачи:
          <textarea
            placeholder="Описание задачи"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            required
          />
        </label>
        <label>
          Дедлайн:
          <input
            type="datetime-local"
            value={newTaskDeadline}
            onChange={(e) => setNewTaskDeadline(e.target.value)}
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
          />
        </label>
        <label>
          Статус:
          <select
            value={newTaskStatus}
            onChange={(e) => setNewTaskStatus(e.target.value)}
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
          >
            {priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Создать задачу</button>
      </form>
    </div>
  );
}

export default TaskCreationForm;
