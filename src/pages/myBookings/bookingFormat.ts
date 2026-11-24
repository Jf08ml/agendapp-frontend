import { formatInTimezone } from "../../utils/timezoneUtils";
import type { MyBookings, MyBookingType } from "../../services/clientBookingsService";

export const TYPE_NOUN: Record<MyBookingType, string> = {
  appointment: "cita",
  reservation: "solicitud de reserva",
  enrollment: "clase",
};

/** «10:00 AM» → «10:00 a. m.» */
export const amPm = (s: string) => s.replace(/\s?AM\b/, " a. m.").replace(/\s?PM\b/, " p. m.");

/** Formateadores en la zona horaria y formato de hora del negocio. */
export function bookingFormatters(data: MyBookings) {
  const tz = data.organization.timezone;
  const timeFmt = data.organization.timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const dayLabel = (d: string) => {
    const s = formatInTimezone(d, tz, "dddd D [de] MMMM");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const time = (d: string) => amPm(formatInTimezone(d, tz, timeFmt));
  const timeLabel = (start: string, end?: string) => (end ? `${time(start)} – ${time(end)}` : time(start));
  return { tz, timeFmt, dayLabel, timeLabel, time };
}

/** «+57 321 810 4634» → «•••• 4634» (para «Revisa tu WhatsApp»). */
export function maskPhone(e164: string | null | undefined): string {
  const digits = (e164 || "").replace(/\D/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : "tu número";
}
