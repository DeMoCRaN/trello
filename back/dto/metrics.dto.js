function toAssignmentMetricsDto({ assignmentId, scope, kpis }) {
  return {
    assignmentId,
    scope,
    kpis,
  };
}

function toUserMetricsDto({
  user,
  tasks,
  performance,
}) {
  return {
    user,
    tasks,
    performance,
  };
}

module.exports = {
  toAssignmentMetricsDto,
  toUserMetricsDto,
};
