import React, { useEffect, useState } from 'react';
import './DeadlineProgressBar.css';
import { formatTimeDifference } from './utils/timeUtils';

function CountdownProgressBar({ createdAt, deadline }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date(new Date().getTime() + 3 * 60 * 60 * 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Adjust for 3-hour offset
  const createdDate = new Date(new Date(createdAt).getTime() + 3 * 60 * 60 * 1000);
  const deadlineDate = new Date(new Date(deadline).getTime() + 3 * 60 * 60 * 1000);

  const totalDuration = deadlineDate - createdDate;
  const elapsed = now - createdDate;
  const remaining = deadlineDate - now;

  const progressPercent = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

  return (
    <div className="deadline-progress-bar-container">
      <div className="deadline-progress-bar" style={{ width: `${progressPercent}%` }} />
      <div className="deadline-progress-text">
        {remaining > 0
          ? `Осталось: ${formatTimeDifference(remaining)}`
          : 'Срок истек'}
      </div>
    </div>
  );
}

export default CountdownProgressBar;
