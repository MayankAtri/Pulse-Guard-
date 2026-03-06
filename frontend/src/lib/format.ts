export const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

export const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined) return "-";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};
