import React, { useEffect } from 'react';
import Task from '../Task';
import './Components.css';

function SelectedAssignmentDetails({ selectedAssignment, statuses, onStatusChange, onDelete, onDetails, onStartWork, onStopWork, onResumeWork, onCompleteWork }) {
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

  if (selectedAssignment && selectedAssignment.tasks) {
    selectedAssignment.tasks.forEach((task) => {
      if (tasksByStatus[task.status]) {
        tasksByStatus[task.status].push(task);
      }
    });
  }

  useEffect(() => {
    const handleTaskUpdate = () => {
      // Можно добавить логику обновления, если нужно
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, []);

  useEffect(() => {
    if (selectedAssignment?.tasks) {
      console.log('Task data structure:', selectedAssignment.tasks[0]);
    }
  }, [selectedAssignment]);

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
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  onDetails={onDetails}
                  onStartWork={onStartWork}
                  onStopWork={onStopWork}
                  onResumeWork={onResumeWork}
                  onCompleteWork={onCompleteWork}
                  creatorName={task.creator_name}
                  assigneeName={task.assignee_name}
                  createdAt={task.created_at}
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