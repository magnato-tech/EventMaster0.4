
export const getTodayStr = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const isBeforeToday = (dateStr: string): boolean => {
  const today = new Date(getTodayStr());
  const date = new Date(dateStr);
  return date < today;
};

export const formatDateNo = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('no-NO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};
