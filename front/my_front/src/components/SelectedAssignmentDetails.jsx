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
  reviewTasks = [],
  archivedTasks = [],
  failedTasks = [],
  onRefresh // Добавляем пропс для обновления данных
}) {
  const [activeTab, setActiveTab] = useState('active');
  
  const statusTranslations = {
    'new': 'Новые',
    'in_progress': 'В работе',
    'done': 'Завершённые',
    'failed': 'Проваленные',
    'rew': 'На ревью',
    'other': 'Прочее',
  };

  // Обработчики событий
  const handleStatusChange = async (taskId, newStatusId) => {
    try {
      await onStatusChange(taskId, newStatusId);
      // Обновляем данные после изменения статуса
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
      alert(error.message);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await onDelete(taskId);
      // Обновляем данные после удаления
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Ошибка удаления задачи:', error);
      alert(error.message);
    }
  };

  const handleCompleteWork = async (taskId) => {
    try {
      await onCompleteWork(taskId);
      // Обновляем данные после завершения работы
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Ошибка завершения задачи:', error);
      alert(error.message);
    }
  };

  const handleFailTask = async (taskId, reason) => {
    try {
      await onStatusChange(taskId, {
        status_id: 4,
        failed_reason: reason,
      });
      // Обновляем данные после провала задачи
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Ошибка провала задачи:', error);
      alert(error.message);
    }
  };

  const handleRestoreTask = async (taskId, restoreData) => {
    try {
      await onStatusChange(taskId, {
        status_id: 1,
        title: restoreData.title,
        deadline: restoreData.deadline,
      });
      // Обновляем данные после восстановления
      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Ошибка восстановления задачи:', error);
      alert(error.message);
    }
  };

  // Группировка задач в зависимости от вкладки
  const groupTasksByStatus = (tasks, tab) => {
    if (tab === 'active') {
      // Для активных задач - 3 статуса
      const grouped = {
        'new': [],
        'in_progress': [],
        'done': [],
      };
      
      tasks.forEach(task => {
        if (grouped[task.status]) {
          grouped[task.status].push(task);
        }
      });
      
      return grouped;
    } else if (tab === 'review') {
      // Для ревью - один статус
      return {
        'review': tasks
      };
    } else if (tab === 'archived') {
      // Для архива - группировка по оригинальным статусам
      const archivedByStatus = {};
      tasks.forEach(task => {
        const statusKey = task.status || 'other';
        if (!archivedByStatus[statusKey]) {
          archivedByStatus[statusKey] = [];
        }
        archivedByStatus[statusKey].push(task);
      });
      return archivedByStatus;
    } else if (tab === 'failed') {
      // Для проваленных - один статус
      return {
        'failed': tasks
      };
    }
    
    return {};
  };

  // Получение задач для текущей вкладки
  const getTasksForCurrentTab = () => {
    switch(activeTab) {
      case 'active':
        return activeTasks.filter(task => task.status !== 'rew');
      case 'review':
        return reviewTasks;
      case 'archived':
        return archivedTasks.filter(task => task.status !== 'rew');
      case 'failed':
        return failedTasks;
      default:
        return [];
    }
  };

  const currentTasks = getTasksForCurrentTab();
  const groupedTasks = groupTasksByStatus(currentTasks, activeTab);
  
  // Получаем порядок отображения колонок
  const getColumnOrder = () => {
    if (activeTab === 'active') {
      return ['new', 'in_progress', 'done'];
    } else if (activeTab === 'review') {
      return ['review'];
    } else if (activeTab === 'archived') {
      return Object.keys(groupedTasks).sort();
    } else if (activeTab === 'failed') {
      return ['failed'];
    }
    return [];
  };

  const orderedStatuses = getColumnOrder();

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
          className={`tab-button ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          На ревью ({reviewTasks?.length || 0})
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

      <div className={`tasks-dashboard tasks-dashboard-${activeTab}`}>
        {orderedStatuses.map(statusKey => (
          <div key={statusKey} className="tasks-column">
            <h3>
              {activeTab === 'active' 
                ? (statusTranslations[statusKey] || statusKey)
                : activeTab === 'review' 
                  ? 'Задачи на ревью'
                  : activeTab === 'archived'
                    ? `${statusTranslations[statusKey] || statusKey} (Архив)`
                    : 'Проваленные задачи'
              }
            </h3>
            
            {groupedTasks[statusKey]?.length > 0 ? (
              <div className="tasks-grid">
                {groupedTasks[statusKey].map(task => (
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
                    onFail={handleFailTask}
                    onRestore={handleRestoreTask}
                    isProjectAuthor={true}
                    creatorName={task.creator_name || task.creator_id}
                    assigneeName={task.assignee_name || task.assignee_id}
                    createdAt={task.created_at}
                    loading={statusChangeLoading[task.id]}
                    timer={timers[task.id]}
                    formatTime={formatTime}
                    isArchived={activeTab === 'archived'}
                    activeTab={activeTab}
                  />
                ))}
              </div>
            ) : (
              <p className="no-tasks-message">
                {activeTab === 'archived' ? 'Нет архивных задач' : 
                 activeTab === 'failed' ? 'Нет проваленных задач' : 
                 activeTab === 'review' ? 'Нет задач на ревью' : 
                 `Нет задач в статусе ${statusTranslations[statusKey] || statusKey}`}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default SelectedAssignmentDetails;