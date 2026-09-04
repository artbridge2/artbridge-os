import { addDays, addMonths, addWeeks, isWeekday, nextWeekdayFrom } from "@/lib/dates";
import { RECURRING_FREQ_LABELS, type RecurringRule } from "@/lib/types";

const WEEKDAY_NAMES = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

export function describeRecurringRule(rule: RecurringRule): string {
  if (rule.freq === "weekly" && rule.weekdays && rule.weekdays.length > 1) {
    return `Hetente ${rule.weekdays.length}x (${rule.weekdays
      .map((d) => WEEKDAY_NAMES[d])
      .join(", ")})`;
  }
  if ((rule.freq === "weekly" || rule.freq === "monthly") && (rule.interval ?? 1) > 1) {
    const unit = rule.freq === "weekly" ? "hetente" : "havonta";
    return `${rule.interval} ${unit}`;
  }
  return RECURRING_FREQ_LABELS[rule.freq];
}

/**
 * Computes the next due date for a recurring task occurrence.
 *
 * `anchor` is the due date of the occurrence that was just completed (or, for
 * a brand-new recurring task with no due date yet, today). `inclusive`
 * controls whether `anchor` itself is a valid answer (true when seeding the
 * very first occurrence, false when computing what comes *after* a
 * completed one — the engine must never return the same date twice).
 */
export function computeNextDueDate(
  rule: RecurringRule,
  anchor: Date,
  inclusive = false
): Date {
  const interval = rule.interval ?? 1;

  switch (rule.freq) {
    case "daily": {
      if (inclusive) return anchor;
      return addDays(anchor, 1);
    }

    case "weekdays": {
      if (inclusive && isWeekday(anchor)) return anchor;
      let next = addDays(anchor, 1);
      while (!isWeekday(next)) next = addDays(next, 1);
      return next;
    }

    case "weekly": {
      if (rule.weekdays && rule.weekdays.length > 0) {
        if (inclusive && rule.weekdays.includes(anchor.getDay())) return anchor;
        return nextWeekdayFrom(anchor, rule.weekdays);
      }
      if (inclusive) return anchor;
      return addWeeks(anchor, interval);
    }

    case "monthly": {
      if (inclusive) return anchor;
      return addMonths(anchor, interval);
    }

    case "quarterly": {
      if (inclusive) return anchor;
      return addMonths(anchor, 3);
    }
  }
}
