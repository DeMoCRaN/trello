export function formatTimeDifference(ms) {
  if (ms <= 0) return '0 секунд';

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(days + ' дн.');
  if (hours > 0) parts.push(hours + ' ч.');
  if (minutes > 0) parts.push(minutes + ' мин.');
  if (seconds > 0) parts.push(seconds + ' сек.');

  return parts.join(' ');
}
