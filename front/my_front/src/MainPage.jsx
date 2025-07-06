import React, { useEffect, useState } from 'react';
import './MainPage.css';
import Assignment from './Assignment';

function MainPage() {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('1'); // id статуса
  const [newTaskPriority, setNewTaskPriority] = useState('1'); // id приоритета

  // Тестовые данные для статусов и приоритетов
  const statuses = [
    { id: 1, name: 'Выполнена' },
    { id: 2, name: 'В процессе' },
    { id: 3, name: 'Ожидает' },
  ];

  const priorities = [
    { id: 1, name: 'Высокий' },
    { id: 2, name: 'Средний' },
    { id: 3, name: 'Низкий' },
  ];

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const response = await fetch('http://localhost:3000/api/assignments');
        if (!response.ok) {
          throw new Error('Ошибка при загрузке заданий');
        }
        const data = await response.json();
        setAssignments(data);
        if (data.length > 0) {
          setSelectedAssignment(data[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAssignments();
  }, []);

  const handleAssignmentSelect = (assignment) => {
    setSelectedAssignment(assignment);
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      alert('Введите название задачи');
      return;
    }
    try {
      const response = await fetch(`http://localhost:3000/api/assignments/${selectedAssignment.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          deadline: newTaskDeadline ? new Date(newTaskDeadline).toISOString() : null,
          creator_id: 1, // Замените на реальный ID пользователя
          assignee_id: 1, // Замените на реальный ID пользователя
          status_id: parseInt(newTaskStatus, 10),
          priority_id: parseInt(newTaskPriority, 10),
        }),
      });
      if (!response.ok) {
        throw new Error('Ошибка при создании задачи');
      }
      const createdTask = await response.json();
      // Обновляем список задач в выбранном задании
      setSelectedAssignment({
        ...selectedAssignment,
        tasks: [...(selectedAssignment.tasks || []), createdTask],
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDeadline('');
      setNewTaskStatus('1');
      setNewTaskPriority('1');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Ошибка при удалении задачи');
      }
      // Обновляем список задач в выбранном задании
      setSelectedAssignment({
        ...selectedAssignment,
        tasks: selectedAssignment.tasks.filter(task => task.id !== taskId),
      });
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <p>Загрузка заданий...</p>;
  }

  if (error) {
    return <p>Ошибка: {error}</p>;
  }

  return (
    <main className="dashboard">
      <header>
        <h1>Дашборд заданий</h1>
      </header>
      <section className="assignments-list">
        <ul>
          {assignments.map((assignment) => (
            <li
              key={assignment.id}
              style={{ cursor: 'pointer', fontWeight: selectedAssignment?.id === assignment.id ? 'bold' : 'normal' }}
              onClick={() => handleAssignmentSelect(assignment)}
            >
              {assignment.title}
            </li>
          ))}
        </ul>
      </section>
      {selectedAssignment && (
        <section className="selected-assignment">
          <h2>{selectedAssignment.title}</h2>
          <p>{selectedAssignment.description}</p>
          <div className="tasks-list">
            {selectedAssignment.tasks && selectedAssignment.tasks.length > 0 ? (
              selectedAssignment.tasks.map((task) => (
                <div key={task.id} className="task-card">
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  <p><strong>Статус:</strong> {task.status}</p>
                  <p><strong>Приоритет:</strong> {task.priority}</p>
                  <p><strong>Дедлайн:</strong> {task.deadline ? new Date(task.deadline).toLocaleString() : 'Нет'}</p>
                  <button onClick={() => handleDeleteTask(task.id)}>Удалить задачу</button>
                </div>
              ))
            ) : (
              <p>Задачи отсутствуют</p>
            )}
          </div>
          <form onSubmit={handleCreateTask}>
            <h3>Создать новую задачу</h3>
            <input
              type="text"
              placeholder="Название задачи"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
            />
            <textarea
              placeholder="Описание задачи"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
            />
            <label>
              Дедлайн:
              <input
                type="datetime-local"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
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
        </section>
      )}
    </main>
  );
}

export default MainPage;
