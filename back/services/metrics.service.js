const DELETED_FAILED_FULL_PENALTY_DAYS = 30;
const DELETED_FAILED_DECAY_STEP_DAYS = 3;
const DELETED_FAILED_DECAY_STEP = 0.05;

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value)));

const toInt = (value) => parseInt(value || 0, 10) || 0;

const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

const normalizeScope = (scope) => {
  if (scope === 'active' || scope === 'archived' || scope === 'all') return scope;
  return 'all';
};

function getDeletedFailedTaskWeight(deletedAt, canDecay) {
  if (!deletedAt) return 1;
  if (!canDecay) return 1;

  const deletedDate = new Date(deletedAt);
  const daysSinceDeletion = Math.max(
    0,
    Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (daysSinceDeletion <= DELETED_FAILED_FULL_PENALTY_DAYS) {
    return 1;
  }

  const decayPeriods = Math.floor(
    (daysSinceDeletion - DELETED_FAILED_FULL_PENALTY_DAYS) / DELETED_FAILED_DECAY_STEP_DAYS
  );

  return Math.max(0, 1 - (decayPeriods * DELETED_FAILED_DECAY_STEP));
}

function buildDashboardKpis(tasks) {
  const totalVisibleTasks = Math.max(tasks.length, 1);
  const countedTasks = tasks.filter((task) => task.status !== 'rew');
  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length;
  const newTasks = tasks.filter((task) => task.status === 'new').length;
  const reviewedTasks = tasks.filter((task) => task.status === 'rew').length;
  const failedTasks = tasks.filter((task) => task.status === 'failed').length;

  const now = Date.now();
  const overdueTasks = tasks.filter((task) => (
    task.deadlineDate
    && task.deadlineDate.getTime() < now
    && !['done', 'failed', 'rew'].includes(task.status)
  )).length;

  const completionPercentage = countedTasks.length > 0
    ? Math.round((completedTasks / countedTasks.length) * 100)
    : 0;

  const tasksWithDeadlines = tasks.filter((task) => task.deadlineDate);
  const activeOnTrackTasks = tasksWithDeadlines.filter((task) => (
    ['new', 'in_progress'].includes(task.status) && task.deadlineDate.getTime() >= now
  )).length;
  const reviewOnTrackTasks = tasksWithDeadlines.filter((task) => (
    task.status === 'rew' && task.deadlineDate.getTime() >= now
  )).length;
  const completedOnTimeTasks = tasksWithDeadlines.filter((task) => (
    task.status === 'done'
    && (!task.updatedAtDate || task.updatedAtDate.getTime() <= task.deadlineDate.getTime())
  )).length;
  const deadlineTrackedCount = tasksWithDeadlines.length;

  const performersData = Object.values(tasks.reduce((acc, task) => {
    if (!task.assignee_email) return acc;
    if (!acc[task.assignee_email]) {
      acc[task.assignee_email] = { total: 0 };
    }
    acc[task.assignee_email].total += 1;
    return acc;
  }, {}));

  const averageTeamLoad = performersData.length > 0
    ? performersData.reduce((sum, performer) => sum + performer.total, 0) / performersData.length
    : 0;
  const loadDeviation = performersData.length > 0
    ? performersData.reduce((sum, performer) => sum + Math.abs(performer.total - averageTeamLoad), 0) / performersData.length
    : 0;
  const balanceScore = averageTeamLoad > 0
    ? Math.max(0, 100 - ((loadDeviation / averageTeamLoad) * 35))
    : 100;

  return {
    efficiency: completionPercentage,
    productivity: clampPercent(
      (((completedTasks * 1) + (reviewedTasks * 0.8) + (inProgressTasks * 0.45) + (newTasks * 0.1)) / totalVisibleTasks) * 100
    ),
    quality: clampPercent(
      100 - ((((failedTasks * 1.25) + (overdueTasks * 0.6)) / Math.max(countedTasks.length, 1)) * 100)
    ),
    timeliness: deadlineTrackedCount > 0
      ? clampPercent((((completedOnTimeTasks * 1) + (reviewOnTrackTasks * 0.75) + (activeOnTrackTasks * 0.55)) / deadlineTrackedCount) * 100)
      : 100,
    collaboration: performersData.length > 0
      ? clampPercent((balanceScore * 0.55) + ((((completedTasks + (reviewedTasks * 0.6)) / performersData.length) * 18) * 0.45))
      : 0,
    completionPercentage,
    counters: {
      total: tasks.length,
      counted: countedTasks.length,
      completed: completedTasks,
      inProgress: inProgressTasks,
      review: reviewedTasks,
      failed: failedTasks,
      overdue: overdueTasks,
      deadlineTracked: deadlineTrackedCount,
    },
  };
}

function buildAssignmentKpisFromRows(rows, scope) {
  const normalizedScope = normalizeScope(scope);
  const allTasks = rows.map((task) => ({
    id: task.id,
    status: task.status || 'unknown',
    assignee_email: task.assignee_email || null,
    is_archived: !!task.is_archived,
    deadlineDate: isValidDate(task.deadline) ? new Date(task.deadline) : null,
    updatedAtDate: isValidDate(task.updated_at) ? new Date(task.updated_at) : null,
  }));

  const scopedTasks = allTasks.filter((task) => {
    if (normalizedScope === 'active') return !task.is_archived;
    if (normalizedScope === 'archived') return task.is_archived;
    return true;
  });

  return {
    scope: normalizedScope,
    kpis: buildDashboardKpis(scopedTasks),
  };
}

function buildUserPerformance({ tasksStatsRow, archivedStatsRow, deletedFailedRows }) {
  const activeTotal = toInt(tasksStatsRow.total_tasks);
  const archivedTotal = toInt(archivedStatsRow.archived_tasks);
  const completedTotal = toInt(tasksStatsRow.completed_tasks) + toInt(archivedStatsRow.archived_completed);
  const visibleFailedTotal = toInt(tasksStatsRow.failed_tasks) + toInt(archivedStatsRow.archived_failed);
  const deletedFailedCount = deletedFailedRows.length;

  const totalFailedForDecay = visibleFailedTotal + deletedFailedCount;
  const canDecayDeletedFailed = totalFailedForDecay < 10;
  const deletedFailedPenalty = deletedFailedRows.reduce((sum, row) => (
    sum + getDeletedFailedTaskWeight(row.deleted_at, canDecayDeletedFailed)
  ), 0);

  const actualTotal = activeTotal + archivedTotal + deletedFailedCount;
  const effectiveTotal = activeTotal + archivedTotal + deletedFailedPenalty;
  const completionRate = effectiveTotal > 0
    ? Math.round((completedTotal / effectiveTotal) * 100)
    : 0;

  const reviewTotal = toInt(tasksStatsRow.review_tasks) + toInt(archivedStatsRow.archived_review);
  const inProgressTotal = toInt(tasksStatsRow.in_progress_tasks);
  const newTotal = toInt(tasksStatsRow.new_tasks);
  const overdueTotal = toInt(tasksStatsRow.overdue_tasks);
  const failedTotal = visibleFailedTotal + deletedFailedCount;
  const countedTotal = Math.max(effectiveTotal || (actualTotal - reviewTotal), 1);

  return {
    totals: {
      actualTotal,
      archivedTotal,
      completedTotal,
      inProgressTotal,
      newTotal,
      reviewTotal,
      overdueTotal,
      failedTotal,
    },
    performance: {
      completionRate,
      deletedFailedTasks: deletedFailedCount,
      effectiveTotal: Math.round(effectiveTotal * 100) / 100,
      deletedFailedPenalty: Math.round(deletedFailedPenalty * 100) / 100,
      kpis: {
        efficiency: completionRate,
        productivity: clampPercent((((completedTotal * 1) + (reviewTotal * 0.8) + (inProgressTotal * 0.45) + (newTotal * 0.1)) / Math.max(actualTotal || 1, 1)) * 100),
        quality: clampPercent(100 - ((((failedTotal * 1.25) + (overdueTotal * 0.6)) / countedTotal) * 100)),
        timeliness: clampPercent(((((completedTotal * 1) + (reviewTotal * 0.7) + (inProgressTotal * 0.35) - (overdueTotal * 0.85)) / countedTotal) * 100)),
        stability: clampPercent(100 - ((((failedTotal * 1.4) + (overdueTotal * 0.8) + (newTotal * 0.15)) / countedTotal * 100))),
      },
    },
  };
}

module.exports = {
  normalizeScope,
  buildAssignmentKpisFromRows,
  buildUserPerformance,
};
