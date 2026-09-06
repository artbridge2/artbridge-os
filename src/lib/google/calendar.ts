import "server-only";
import { google } from "googleapis";
import { getAuthorizedGoogleClient } from "@/lib/gmail/client";
import { weekBounds } from "@/lib/dates";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export interface CalendarConnectionStatus {
  connected: boolean;
}

/** Calendar rides on the same Google connection as Gmail — "connected" means that connection's granted scopes include Calendar. */
export async function getCalendarConnectionStatus(): Promise<CalendarConnectionStatus> {
  try {
    const { scopes } = await getAuthorizedGoogleClient();
    return { connected: scopes?.includes(CALENDAR_SCOPE) ?? false };
  } catch {
    return { connected: false };
  }
}

export interface CalendarEventSummary {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  htmlLink: string;
}

/** Real events (Google Calendar "primary") in [start, end]. Throws on failure — callers show a Calendar-unavailable retry state, never fake zero events. */
export async function getCalendarEvents(start: Date, end: Date): Promise<CalendarEventSummary[]> {
  const { auth, scopes } = await getAuthorizedGoogleClient();
  if (!scopes?.includes(CALENDAR_SCOPE)) throw new Error("CALENDAR_NOT_CONNECTED");

  const calendar = google.calendar({ version: "v3", auth });

  const { data } = await calendar.events.list({
    calendarId: "primary",
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  return (data.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      id: e.id!,
      title: e.summary || "(no title)",
      start: e.start?.dateTime || e.start?.date || "",
      end: e.end?.dateTime || e.end?.date || "",
      allDay: !e.start?.dateTime,
      htmlLink: e.htmlLink || "https://calendar.google.com",
    }));
}

/** Current week's events (Mon-Sun, Budapest) — used by the Home "Today" card. */
export async function getWeekEvents(): Promise<CalendarEventSummary[]> {
  const { start, end } = weekBounds();
  return getCalendarEvents(start, end);
}
