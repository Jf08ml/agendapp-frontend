import { formatInTimezone } from "../../utils/timezoneUtils";
import type { MyBookings, MyBookingType } from "../../services/clientBookingsService";

export const TYPE_NOUN: Record<MyBookingType, string> = {
  appointment: "cita",
  reservation: "solicitud de reserva",
  enrollment: "clase",
};

/** Formateadores en la zona horaria y formato de hora del negocio. */
export function bookingFormatters(data: MyBookings) {
  const tz = data.organization.timezone;
  const timeFmt = data.organization.timeFormat === "24h" ? "HH:mm" : "h:mm A";
  const dayLabel = (d: string) => {
    const s = formatInTimezone(d, tz, "dddd D [de] MMMM");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const timeLabel = (start: string, end?: string) =>
    end
      ? `${formatInTimezone(start, tz, timeFmt)} – ${formatInTimezone(end, tz, timeFmt)}`
      : formatInTimezone(start, tz, timeFmt);
  return { tz, timeFmt, dayLabel, timeLabel };
}
