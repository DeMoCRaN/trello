import React, { useState } from 'react';
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
  formatTime,
  activeTasks = [],
  archivedTasks = [],
  failedTasks = []
}) {
  const [activeTab, setActiveTab] = useState('active');
  
  const statusTranslations = {
    'new': 'Новые',
    'in_progress': 'В работе',
    'done': 'Завершённые',
    'failed': 'Проваленные'
  };


  const handleStatusChange = async (taskId, newStatusId) => {
    try {
      await onStatusChange(taskId, newStatusId);
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
      alert(error.message);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await onDelete(taskId);
    } catch (error) {
      console.error('Ошибка удаления задачи:', error);
      alert(error.message);
    }
  };

  const handleCompleteWork = async (taskId) => {
    try {
      await onCompleteWork(taskId);
    } catch (error) {
      console.error('Ошибка завершения задачи:', error);
      alert(error.message);
    }
  };

  const groupTasksByStatus = (tasks) => {
    const grouped = {
      'new': [],
      'in_progress': [],
      'done': [],
    };
    
    tasks.forEach(task => {
      const statusKey = task.status || 'new';
      if (grouped[statusKey]) {
        grouped[statusKey].push(task);
      } else {
        // Неизвестный статус показывать как "other"
        if (!grouped['other']) grouped['other'] = [];
        grouped['other'].push(task);
      }
    });
    
    return grouped;
  };

  const currentTasks = activeTab === 'active' ? activeTasks : activeTab === 'archived' ? archivedTasks : failedTasks;
  const groupedTasks = groupTasksByStatus(currentTasks);
  const orderedStatuses = Object.keys(groupedTasks);

  return (
    <section className="selected-assignment">
      <h2>{selectedAssignment?.title || 'Название не указано'}</h2>
      <p>{selectedAssignment?.description || 'Описание отсутствует'}</p>
      
      <div className="task-tabs">
        <button 
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Активные задачи ({activeTasks.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'archived' ? 'active' : ''}`}
          onClick={() => setActiveTab('archived')}
        >
          Архивные задачи ({archivedTasks.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'failed' ? 'active' : ''}`}
          onClick={() => setActiveTab('failed')}
        >
          Проваленные задачи ({failedTasks?.length || 0})
        </button>
      </div>

      <div className="tasks-dashboard">
        {orderedStatuses.map(statusKey => (
          <div key={statusKey} className="tasks-column">
            <h3>
              {statusTranslations[statusKey] || statusKey}
{activeTab === 'archived' && ' (Архив)'}{activeTab === 'failed' && ' (Провалено)'}
            </h3>
            
            {groupedTasks[statusKey].length > 0 ? (
              groupedTasks[statusKey].map(task => (
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
onFail={async (taskId) => await handleStatusChange(taskId, 4)}
userId={1}
                  creatorName={task.creator_name || task.creator_id}
                  assigneeName={task.assignee_name || task.assignee_id}
                  createdAt={task.created_at}
                  loading={statusChangeLoading[task.id]}
                  timer={timers[task.id]}
                  formatTime={formatTime}
                  isArchived={activeTab === 'archived'}
                />
              ))
            ) : (
              <p className="no-tasks-message">
                {activeTab === 'archived' ? 'Нет архивных задач' : activeTab === 'failed' ? 'Нет проваленных задач' : 'Нет задач'}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default SelectedAssignmentDetails;