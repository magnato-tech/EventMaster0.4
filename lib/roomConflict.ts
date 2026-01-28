import { EventOccurrence } from '../types';

const normalizeTimeInput = (value?: string) => {
  if (!value) return '';
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.slice(0, 5);
  }
  return value;
};

const toMinutes = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getRecurringDatesForCheck = (
  startDate: string,
  endDate: string,
  frequencyType: 'weekly' | 'monthly',
  interval: number
) => {
  const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const startDateObj = parseDate(startDate);
  const endDateObj = parseDate(endDate);
  const startDayOfWeek = startDateObj.getDay();

  const getNthWeekdayInMonth = (year: number, month: number, n: number, targetDayOfWeek: number): Date | null => {
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    const daysToAdd = (targetDayOfWeek - firstDayOfWeek + 7) % 7;
    const firstOccurrence = new Date(year, month, 1 + daysToAdd);
    const nthOccurrence = new Date(year, month, firstOccurrence.getDate() + (n - 1) * 7);
    if (nthOccurrence.getMonth() !== month) return null;
    return nthOccurrence;
  };

  const dates: string[] = [];
  if (frequencyType === 'monthly') {
    let checkYear = startDateObj.getFullYear();
    let checkMonth = startDateObj.getMonth();
    const endYear = endDateObj.getFullYear();
    const endMonth = endDateObj.getMonth();

    while (checkYear < endYear || (checkYear === endYear && checkMonth <= endMonth)) {
      const nthOccurrence = getNthWeekdayInMonth(checkYear, checkMonth, interval, startDayOfWeek);
      if (nthOccurrence && nthOccurrence >= startDateObj && nthOccurrence <= endDateObj) {
        dates.push(formatLocalDate(nthOccurrence));
      }
      checkMonth += 1;
      if (checkMonth > 11) {
        checkMonth = 0;
        checkYear += 1;
      }
    }
  } else {
    const intervalDays = interval * 7;
    const current = new Date(startDateObj);
    while (current <= endDateObj) {
      dates.push(formatLocalDate(current));
      current.setDate(current.getDate() + intervalDays);
    }
  }

  return dates;
};

export const hasRoomConflict = (
  occurrences: EventOccurrence[],
  roomId: string,
  date: string,
  time?: string,
  endTime?: string,
  excludeOccurrenceId?: string
) => {
  const normalized = normalizeTimeInput(time);
  const normalizedEnd = normalizeTimeInput(endTime);
  const newStart = toMinutes(normalized);
  const newEnd = toMinutes(normalizedEnd);
  const resolvedNewEnd = newEnd !== null ? newEnd : newStart;

  return occurrences.some(occ => {
    if (excludeOccurrenceId && occ.id === excludeOccurrenceId) return false;
    if (occ.room_id !== roomId || occ.date !== date) return false;
    if (!normalized || !occ.time) return true;
    const occStart = toMinutes(occ.time);
    const occEnd = toMinutes(occ.end_time) ?? occStart;
    if (occStart === null || occEnd === null || newStart === null) return true;
    const normalizedOccEnd = occEnd < occStart ? occStart : occEnd;
    const nextEnd = resolvedNewEnd ?? newStart;
    if (nextEnd === null) return true;
    return newStart <= normalizedOccEnd && nextEnd >= occStart;
  });
};
