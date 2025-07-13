import React, { useEffect, useState } from 'react';
import Task from './Task.jsx';

function AssignedTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/task_statuses');
        if (!response.ok) throw new Error('Ошибка при загрузке статусов');
        const data = await response.json();
        setStatuses(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStatuses();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/tasks/assigned', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error('Ошибка при загрузке задач');
        const data = await response.json();
        setTasks(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId, newStatusId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_id: newStatusId }),
      });
      if (!response.ok) throw new Error('Ошибка при обновлении статуса задачи');
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, status: statuses.find(s => s.id === newStatusId)?.name } : task
        )
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Ошибка при удалении задачи');
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Загрузка задач...</p>;
  if (error) return <p>Ошибка: {error}</p>;

  return (
    <section>
      <button onClick={() => window.history.back()}>Вернуться на главную</button>
      <h1>Мои задачи</h1>
      {tasks.length === 0 ? (
        <p>Нет назначенных задач</p>
      ) : (
        tasks.map((task) => (
          <Task
            key={task.id}
            task={task}
            statuses={statuses}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            creatorName={task.creator_name || 'Неизвестно'}
            assigneeName={task.assignee_name || 'Неизвестно'}
          />
        ))
      )}
    </section>
  );
}

export default AssignedTasksPage;
