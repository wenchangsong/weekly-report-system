import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function getWeekRange(date?: Date) {
  const d = date || new Date();
  return {
    start: format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  };
}

// Synchronous fallback to avoid Edge showing yyyy/mm/dd placeholder
export function getCurrentWeekRange() {
  return getWeekRange();
}

export function formatDate(dateStr: string, fmt: string = 'yyyy-MM-dd HH:mm') {
  try {
    return format(parseISO(dateStr), fmt, { locale: zhCN });
  } catch {
    return dateStr;
  }
}

export function formatWeekLabel(start: string, end: string) {
  return `${start} ~ ${end}`;
}
