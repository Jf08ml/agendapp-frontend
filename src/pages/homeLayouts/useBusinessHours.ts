// Horario del negocio para las landings: hoy (estado) y la semana.
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { selectOrganization } from "../../features/organization/sliceOrganization";
import { formatTimeFromISO, toSpanishMeridiem } from "../../utils/timeFormatUtils";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

/** Horario del negocio: hoy (estado) y la semana. weeklySchedule si está activo; si no, openingHours. */
export function useBusinessHours() {
  const org = useSelector(selectOrganization);
  const tf = org?.timeFormat;
  const fmtHour = (hhmm: string) => toSpanishMeridiem(formatTimeFromISO(hhmm, tf));

  const todayIndex = useMemo(() => {
    const tz = org?.timezone || "America/Bogota";
    const wd = new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "short" }).formatToParts(new Date());
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return dayMap[wd.find((p) => p.type === "weekday")?.value ?? ""] ?? new Date().getDay();
  }, [org?.timezone]);

  const weeklyHours = useMemo(() => {
    const order = [1, 2, 3, 4, 5, 6, 0]; // lunes primero
    if (org?.weeklySchedule?.enabled) {
      const schedule = org.weeklySchedule.schedule;
      if (!schedule || schedule.length === 0) return [];
      return order.map((i) => {
        const day = schedule.find((d) => d.day === i);
        const isOpen = !!(day && day.isOpen !== false && day.isAvailable !== false && day.start && day.end);
        return { day: i, name: DAY_NAMES[i], isToday: i === todayIndex, isOpen, start: day?.start, end: day?.end };
      });
    }
    const oh = org?.openingHours;
    if (!oh?.start || !oh?.end) return [];
    const businessDays = oh.businessDays ?? [1, 2, 3, 4, 5];
    return order.map((i) => ({
      day: i,
      name: DAY_NAMES[i],
      isToday: i === todayIndex,
      isOpen: businessDays.includes(i),
      start: oh.start,
      end: oh.end,
    }));
  }, [org?.weeklySchedule, org?.openingHours, todayIndex]);

  // Estado de hoy para el hero
  const status = useMemo(() => {
    const today = weeklyHours.find((h) => h.isToday);
    if (!today) return null;
    if (!today.isOpen || !today.start || !today.end) return { tone: "danger", text: "Hoy no abrimos" };
    const tz = org?.timezone || "America/Bogota";
    const parts = new Intl.DateTimeFormat("en", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
    const cur = parseInt(get("hour")) * 60 + parseInt(get("minute"));
    if (cur >= toMinutes(today.start) && cur < toMinutes(today.end)) {
      return { tone: "success", text: `Abierto ahora · cierra a las ${fmtHour(today.end)}` };
    }
    if (cur < toMinutes(today.start)) return { tone: "warning", text: `Cerrado ahora · abre a las ${fmtHour(today.start)}` };
    return { tone: "danger", text: "Cerrado ahora" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyHours, org?.timezone, tf]);

  return { weeklyHours, status, fmtHour };
}
