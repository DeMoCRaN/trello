import React, { useEffect, useState } from 'react';
import './MainPage.css';
import Assignment from './Assignment';
import Task from './Task';

function MainPage() {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('1'); // id статуса по умолчанию "new"
  const [newTaskPriority, setNewTaskPriority] = useState('1'); // id приоритета
  const [newTaskCreatorId, setNewTaskCreatorId] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');

  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);

  const fetchStatuses = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/task_statuses');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке статусов');
      }
      const data = await response.json();
      setStatuses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPriorities = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/task_priorities');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке приоритетов');
      }
      const data = await response.json();
      setPriorities(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/assignments');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке заданий');
      }
      const data = await response.json();
      console.log('Fetched assignments:', data);
      setAssignments(data);
      if (data.length > 0) {
        setSelectedAssignment(data[0]);
        console.log('Selected assignment set:', data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    fetchPriorities();
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
          deadline: newTaskDeadline ? (() => {
            const [datePart, timePart] = newTaskDeadline.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute] = timePart.split(':').map(Number);
            // Создаем дату в UTC, чтобы избежать смещения часового пояса
            const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
            return date.toISOString();
          })() : null,
          created_at: new Date().toISOString(), // Добавляем время создания
          creator_id: 1, // Замените на реальный ID пользователя
          assignee_id: 1, // Замените на реальный ID пользователя
          status_id: parseInt(newTaskStatus, 10),
          priority_id: parseInt(newTaskPriority, 10),
        }),
      });
      if (!response.ok) {
        throw new Error('Ошибка при создании задачи');
      }
      await response.json();
      await fetchAssignments();
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDeadline('');
      setNewTaskStatus('3');
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
      await fetchAssignments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (taskId, newStatusId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: newStatusId }),
      });
      if (!response.ok) {
        throw new Error('Ошибка при обновлении статуса задачи');
      }
      // Обновляем статус задачи в состоянии
      setSelectedAssignment((prev) => {
        const updatedTasks = prev.tasks.map((task) =>
          task.id === taskId ? { ...task, status: statuses.find(s => s.id === newStatusId).name } : task
        );
        return { ...prev, tasks: updatedTasks };
      });
    } catch (err) {
      console.error('Error updating task status:', err);
      alert(err.message);
    }
  };

  if (loading) {
    return <p>Загрузка заданий...</p>;
  }

  if (error) {
    return <p>Ошибка: {error}</p>;
  }

  // Группируем задачи по статусам
  const tasksByStatus = {
    'new': [],
    'in_progress': [],
    'done': [],
  };

  if (selectedAssignment && selectedAssignment.tasks) {
    console.log('Selected assignment tasks:', selectedAssignment.tasks);
    selectedAssignment.tasks.forEach((task) => {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task);
      }
    });
  }

  return (
    <main className="dashboard">
      <header>
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
          <div className="tasks-dashboard">
            {Object.entries(tasksByStatus).map(([statusName, tasks]) => (
              <div key={statusName} className="tasks-column">
                <h3>{statusName}</h3>
{tasks.length > 0 ? (
  tasks.map((task) => (
    <Task
      key={task.id}
      task={task}
      statuses={statuses}
      onStatusChange={handleStatusChange}
      onDelete={handleDeleteTask}
      creatorName={task.creator_name}
      assigneeName={task.assignee_name}
    />
  ))
) : (
  <p>Задачи отсутствуют</p>
)}
              </div>
            ))}
          </div>
          <form onSubmit={handleCreateTask}>
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
            Создатель (ID):
            <input
              type="number"
              value={newTaskCreatorId || ''}
              onChange={(e) => setNewTaskCreatorId(e.target.value)}
              placeholder="Введите ID создателя"
              required
            />
          </label>
          <label>
            Исполнитель (ID):
            <input
              type="number"
              value={newTaskAssigneeId || ''}
              onChange={(e) => setNewTaskAssigneeId(e.target.value)}
              placeholder="Введите ID исполнителя"
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
        </section>
      )}
    </main>
  );
}

export default MainPage;