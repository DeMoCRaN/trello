import React, { useState } from 'react';
import BaseModal from './BaseModal';
import './Components.css';

function TaskCreationForm({
  onCreateTask,
  priorities,
  onClose,
  initialCreatorEmail = '',
  initialAssigneeEmail = '',
  task = null,
  isDetailsView = false,
  teamMembers = [],
}) {
  const [newTaskTitle, setNewTaskTitle] = useState(task ? task.title : '');
  const [newTaskDescription, setNewTaskDescription] = useState(task ? task.description : '');
  const [newTaskDeadline, setNewTaskDeadline] = useState(task ? (task.deadline ? formatDateTimeForInput(task.deadline) : '') : '');
  const [newTaskPriority, setNewTaskPriority] = useState(task ? String(task.priority_id || '1') : '1');
  const [newTaskCreatorEmail, setNewTaskCreatorEmail] = useState(task ? task.creator_email || initialCreatorEmail : initialCreatorEmail);
  const [newTaskAssigneeEmail, setNewTaskAssigneeEmail] = useState(task ? task.assignee_email || initialAssigneeEmail : initialAssigneeEmail);

  const russianPriorities = priorities.map((priority) => {
    let russianName = priority.name;

    switch (priority.name.toLowerCase()) {
      case 'low':
        russianName = 'Низкий';
        break;
      case 'medium':
        russianName = 'Средний';
        break;
      case 'high':
        russianName = 'Высокий';
        break;
      case 'critical':
        russianName = 'Критический';
        break;
      default:
        russianName = priority.name;
    }

    return { ...priority, name: russianName };
  });

  function formatDateTimeForInput(dbDateTime) {
    if (!dbDateTime) return '';
    const date = new Date(dbDateTime);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function formatDateTimeForBackend(datetimeLocal) {
    if (!datetimeLocal) return null;

    const date = new Date(datetimeLocal);
    date.setHours(date.getHours() + 3);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isDetailsView) {
      onClose();
      return;
    }

    const taskData = {
      title: newTaskTitle,
      description: newTaskDescription,
      deadline: formatDateTimeForBackend(newTaskDeadline),
      priorityId: newTaskPriority,
      creatorEmail: newTaskCreatorEmail,
      assigneeEmail: newTaskAssigneeEmail,
      statusId: '1',
    };

    onCreateTask(taskData);

    import('./../utils/eventBus').then(({ default: eventBus }) => {
      eventBus.emit('taskCreated', taskData);
    });

    if (!task) {
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDeadline('');
      setNewTaskPriority('1');
      setNewTaskCreatorEmail('');
      setNewTaskAssigneeEmail('');
    }
  };

  const modalTitle = isDetailsView ? 'Детали задачи' : task ? 'Редактировать задачу' : 'Создать новую задачу';

  return (
    <BaseModal
      onClose={onClose}
      title={modalTitle}
      size="md"
      panelClassName="task-creation-form"
      bodyClassName="task-creation-form__body"
    >
      <form onSubmit={handleSubmit}>
        <label>
          Название задачи:
          <input
            type="text"
            placeholder="Название задачи"
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            required
            readOnly={isDetailsView}
          />
        </label>

        <label>
          Описание задачи:
          <textarea
            placeholder="Описание задачи"
            value={newTaskDescription}
            onChange={(event) => setNewTaskDescription(event.target.value)}
            required
            readOnly={isDetailsView}
          />
        </label>

        <label>
          Дедлайн:
          <input
            type="datetime-local"
            value={newTaskDeadline}
            onChange={(event) => setNewTaskDeadline(event.target.value)}
            readOnly={isDetailsView}
          />
        </label>

        <label>
          Создатель (Email):
          <input
            type="email"
            value={newTaskCreatorEmail}
            onChange={(event) => setNewTaskCreatorEmail(event.target.value)}
            placeholder="Введите email создателя"
            required
            readOnly={!!task}
          />
        </label>

        <label>
          Исполнитель:
          <select
            value={newTaskAssigneeEmail}
            onChange={(event) => setNewTaskAssigneeEmail(event.target.value)}
            required
            disabled={isDetailsView}
          >
            <option value="">Выберите исполнителя</option>
            {teamMembers
              .filter((member) => member.status === 'accepted')
              .map((member) => (
                <option key={member.id} value={member.user_email}>
                  {member.user_name || member.user_email}
                </option>
              ))}
          </select>
        </label>

        <label>
          Приоритет:
          <select
            value={newTaskPriority}
            onChange={(event) => setNewTaskPriority(event.target.value)}
            disabled={isDetailsView}
          >
            {russianPriorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="submit-button">
          {isDetailsView ? 'Закрыть' : task ? 'Обновить задачу' : 'Создать задачу'}
        </button>
      </form>
    </BaseModal>
  );
}

export default TaskCreationForm;
