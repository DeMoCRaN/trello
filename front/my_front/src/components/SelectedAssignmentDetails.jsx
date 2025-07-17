import React, { useEffect, useState } from 'react';
import Task from '../Task';
import './Components.css';

function SelectedAssignmentDetails({ 
  selectedAssignment, 
  statuses, 
  onStatusChange, 
  onDelete, 
  onDetails, 
  onStartWork, 
  onStopWork, 
  onResumeWork, 
  onCompleteWork,
  statusChangeLoading,
  timers,
  formatTime
}) {
  // Состояние для локального хранения задач
  const [localTasks, setLocalTasks] = useState([]);
  
  // Группируем задачи по статусам (английские ключи)
  const tasksByStatus = {
    'new': [],
    'in_progress': [],
    'done': [],
  };

  // Перевод статусов на русский
  const statusTranslations = {
    'new': 'Новые',
    'in_progress': 'В работе',
    'done': 'Завершённые'
  };

  // Обновляем локальные задачи при изменении selectedAssignment
  useEffect(() => {
    if (selectedAssignment?.tasks) {
      setLocalTasks([...selectedAssignment.tasks]);
    }
  }, [selectedAssignment]);

  // Обработчик для обновления локальной задачи
  const updateLocalTask = (taskId, updates) => {
    setLocalTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
  };

  // Обработчик для удаления локальной задачи
  const deleteLocalTask = (taskId) => {
    setLocalTasks(prevTasks => 
      prevTasks.filter(task => task.id !== taskId)
    );
  };

  // Модифицированные обработчики, которые обновляют локальное состояние
  const handleStatusChange = async (taskId, newStatusId) => {
    try {
      await onStatusChange(taskId, newStatusId);
      updateLocalTask(taskId, { status: newStatusId });
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await onDelete(taskId);
      deleteLocalTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleCompleteWork = async (taskId) => {
    try {
      await onCompleteWork(taskId);
      updateLocalTask(taskId, { status: 'done' });
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  // Группировка задач для отображения
  if (localTasks.length > 0) {
    localTasks.forEach((task) => {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task);
      }
    });
  }

  // Получаем массив статусов в правильном порядке для отображения
  const orderedStatuses = Object.keys(tasksByStatus);

  return (
    <section className="selected-assignment">
      <h2>{selectedAssignment?.title || 'Название не указано'}</h2>
      <p>{selectedAssignment?.description || 'Описание отсутствует'}</p>
      <div className="tasks-dashboard">
        {orderedStatuses.map((statusKey) => (
          <div key={statusKey} className="tasks-column">
            <h3>{statusTranslations[statusKey] || statusKey}</h3>
            {tasksByStatus[statusKey].length > 0 ? (
              tasksByStatus[statusKey].map((task) => (
                <Task
                  key={task.id}
                  task={task}
                  statuses={statuses}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onDetails={onDetails}
                  onStartWork={onStartWork}
                  onStopWork={onStopWork}
                  onResumeWork={onResumeWork}
                  onCompleteWork={handleCompleteWork}
                  creatorName={task.creator_name}
                  assigneeName={task.assignee_name}
                  createdAt={task.created_at}
                  loading={statusChangeLoading[task.id]}
                  timer={timers[task.id]}
                  formatTime={formatTime}
                />
              ))
            ) : (
              <p>Задачи отсутствуют</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default SelectedAssignmentDetails;