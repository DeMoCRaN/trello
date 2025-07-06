import React, { useEffect, useState } from 'react';
import './DeadlineProgressBar.css';

function DeadlineProgressBar({ createdAt, deadline }) {
  console.log('DeadlineProgressBar props:', { createdAt, deadline });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const createdDate = new Date(createdAt);
  const deadlineDate = new Date(deadline);

  console.log('Parsed dates:', { createdDate, deadlineDate });

  const isValidCreatedDate = !isNaN(createdDate.getTime());
  const isValidDeadlineDate = !isNaN(deadlineDate.getTime());

  let progressPercent = 0;

  if (isValidDeadlineDate) {
    if (isValidCreatedDate && createdDate.getTime() !== deadlineDate.getTime()) {
      const totalDuration = deadlineDate - createdDate;
      const elapsed = now - createdDate;
      progressPercent = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    } else {
      // If createdAt is invalid or equals deadline, assume start time is 24 hours before deadline or now minus 24 hours, whichever is earlier
      const defaultStart = new Date(Math.min(deadlineDate.getTime() - 24 * 60 * 60 * 1000, now.getTime() - 24 * 60 * 60 * 1000));
      const totalDuration = deadlineDate - defaultStart;
      const elapsed = now - defaultStart;
      progressPercent = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
    }
  }

  console.log('Progress percent:', progressPercent);

  let progressColor = 'green';
  if (progressPercent > 80) {
    progressColor = 'red';
  } else if (progressPercent > 50) {
    progressColor = 'yellow';
  }

  return (
    <div className="deadline-progress-bar-container" style={{ width: '100%', backgroundColor: '#ddd', borderRadius: '4px', height: '20px' }}>
      <div
        className="deadline-progress-bar"
        style={{
          width: progressPercent + '%',
          backgroundColor: progressColor,
          height: '100%',
          borderRadius: '4px 0 0 4px',
          transition: 'width 0.5s ease, background-color 0.5s ease',
          transformOrigin: 'left',
        }}
      />
    </div>
  );
}

export default DeadlineProgressBar;
