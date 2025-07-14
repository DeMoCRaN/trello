import React, { useEffect } from 'react';
import Task from '../Task';
import './Components.css';

function SelectedAssignmentDetails({ selectedAssignment, statuses, onStatusChange, onDelete, onDetails, onStartWork, onStopWork, onResumeWork, onCompleteWork }) {
  // Группируем задачи по статусам
  const tasksByStatus = {
    'new': [],
    'in_progress': [],
    'done': [],
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

  return (
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
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                  onDetails={onDetails}
                  onStartWork={onStartWork}
                  onStopWork={onStopWork}
                  onResumeWork={onResumeWork}
                  onCompleteWork={onCompleteWork}
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
    </section>
  );
}

export default SelectedAssignmentDetails;
