import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  nextDay,
  parseISO,
  startOfMonth,
  startOfWeek,
  type Day,
} from "date-fns";
import { hu } from "date-fns/locale";

export const TIME_ZONE = "Europe/Budapest";

/** "Today" as a YYYY-MM-DD string in Budapest local time, regardless of server TZ. */
export function todayInBudapest(): string {
  return format(toZonedTime(new Date(), TIME_ZONE), "yyyy-MM-dd");
}

export function budapestNow(): Date {
  return toZonedTime(new Date(), TIME_ZONE);
}

/** Parse a YYYY-MM-DD date-only string into a plain Date (no time component). */
export function parseDateOnly(dateStr: string): Date {
  return parseISO(dateStr);
}

export function formatDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Monday-start week boundaries around `date` (defaults to today, Budapest). */
export function weekBounds(date: Date = budapestNow()) {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function monthBounds(date: Date = budapestNow()) {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/** Next occurrence of one of the given weekdays (0=Sun..6=Sat), strictly after `from`. */
export function nextWeekdayFrom(from: Date, weekdays: number[]): Date {
  const candidates = weekdays.map((wd) => nextDay(from, wd as Day));
  return candidates.reduce((earliest, d) => (d < earliest ? d : earliest));
}

/** Short Hungarian relative label for a YYYY-MM-DD date, relative to today. */
export function formatDueLabel(dueDate: string, today: string = todayInBudapest()): string {
  if (dueDate === today) return "Ma";

  const diffDays = Math.round(
    (parseDateOnly(dueDate).getTime() - parseDateOnly(today).getTime()) / 86_400_000
  );

  if (diffDays === 1) return "Holnap";
  if (diffDays === -1) return "Tegnap";
  if (diffDays > 1 && diffDays <= 6)
    return format(parseDateOnly(dueDate), "EEEE", { locale: hu });
  if (diffDays < -1 && diffDays >= -6) return `${Math.abs(diffDays)} napja`;

  return format(parseDateOnly(dueDate), "MM.dd");
}

/** "X órája" / "X napja" style elapsed-time label for a past ISO timestamp. */
export function formatElapsed(sinceIso: string): string {
  const hours = Math.floor((Date.now() - new Date(sinceIso).getTime()) / 3_600_000);
  if (hours < 1) return "most";
  if (hours < 24) return `${hours} órája`;
  return `${Math.floor(hours / 24)} napja`;
}

/** Whether a past ISO timestamp is more than `hours` hours ago. */
export function isOlderThanHours(sinceIso: string, hours: number): boolean {
  return Date.now() - new Date(sinceIso).getTime() > hours * 3_600_000;
}

export { addDays, addWeeks, addMonths, fromZonedTime };
