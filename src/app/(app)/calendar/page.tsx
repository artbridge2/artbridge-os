import { redirect } from "next/navigation";

// "Calendar" in the new nav maps to the existing Planning feature.
export default function CalendarPage() {
  redirect("/planning");
}
