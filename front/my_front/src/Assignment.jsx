import React from 'react';
import Task from './Task';

function Assignment({ assignment }) {
  return (
    <section className="assignment">
      <h2>{assignment.title}</h2>
      <p>{assignment.description}</p>
      <div className="tasks-list">
        {assignment.tasks && assignment.tasks.length > 0 ? (
          assignment.tasks.map(task => <Task key={task.id} task={task} />)
        ) : (
          <p>Задачи отсутствуют</p>
        )}
      </div>
    </section>
  );
}

export default Assignment;
