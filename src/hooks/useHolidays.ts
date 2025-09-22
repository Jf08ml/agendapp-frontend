/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";

// Configuración de país/región para festivos
export type HolidayConfig = {
  country: string; // ISO-3166-1 alpha-2 (p.ej., 'CO', 'ES', 'US')
  state?: string | null; // subdivisión (p.ej., 'HUI' si aplica, depende del país)
  region?: string | null; // subdivisión adicional si aplica
  language?: string; // 'es', 'en', etc. (nombres de festivos)
};

type HolidayMap = Map<string, string[]>;

// Normaliza a 'YYYY-MM-DD' en local time (no UTC) para evitar desfases
const toLocalISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function useHolidays(currentDate: Date, config?: HolidayConfig) {
  const [holidays, setHolidays] = useState<HolidayMap>(new Map());
  const enabled = Boolean(config?.country);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!enabled) {
        setHolidays(new Map());
        return;
      }
      // Dynamic import para no cargar date-holidays en el bundle inicial
      const HolidaysModule = await import("date-holidays");
      const Holidays = HolidaysModule.default;
      const hd = new Holidays(
        config!.country,
        config!.state ?? "",
        config!.region ?? ""
      );

      if (config?.language) {
        // usa nombres localizados si están disponibles
        hd.setLanguages(config.language);
      }

      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      // Convierte las fechas a ISO string para la API de date-holidays
      const list = hd.getHolidays(
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10)
      ) as Array<{
        date: string | Date;
        name: string;
      }>;

      const map: HolidayMap = new Map();

      for (const h of list) {
        // h.date puede venir como string ISO o Date; normalizamos
        const d = typeof h.date === "string" ? new Date(h.date) : h.date;
        const key = toLocalISODate(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(h.name);
      }

      if (!cancelled) setHolidays(map);
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    currentDate,
    config?.country,
    config?.state,
    config?.region,
    config?.language,
  ]);

  const isHoliday = (day: Date) => holidays.has(toLocalISODate(day));
  const holidayNames = (day: Date) => holidays.get(toLocalISODate(day)) ?? [];

  return { isHoliday, holidayNames, enabled };
}
