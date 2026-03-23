import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Formatea una fecha en una timezone específica
 * @param date - Fecha a formatear (Date, string ISO, o dayjs)
 * @param tz - Timezone IANA (ej: "America/Mexico_City", "America/Bogota")
 * @param format - Formato de salida (por defecto: "h:mm A")
 */
export const formatInTimezone = (
  date: Date | string,
  tz: string,
  format: string = 'h:mm A'
): string => {
  return dayjs(date).tz(tz).format(format);
};

/**
 * Formatea un rango de fechas en una timezone específica
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @param tz - Timezone IANA
 */
export const formatRangeInTimezone = (
  startDate: Date | string,
  endDate: Date | string,
  tz: string
): string => {
  const start = dayjs(startDate).tz(tz).format('h:mm');
  const end = dayjs(endDate).tz(tz).format('h:mm A');
  return `${start} - ${end}`;
};

/**
 * Formatea una fecha completa en una timezone específica
 * @param date - Fecha a formatear
 * @param tz - Timezone IANA
 * @param format - Formato de salida (por defecto: "D [de] MMMM, h:mm A")
 */
export const formatFullDateInTimezone = (
  date: Date | string,
  tz: string,
  format: string = 'D [de] MMMM, h:mm A'
): string => {
  return dayjs(date).tz(tz).format(format);
};

/**
 * Retorna el inicio del mes en la timezone de la org, como ISO UTC string.
 * Evita el bug donde startOfMonth() de date-fns usa la timezone del navegador
 * y corta citas nocturnas que en UTC caen en el mes siguiente.
 */
export const startOfMonthInTimezone = (date: Date | string, tz: string): string => {
  return dayjs(date).tz(tz).startOf('month').toISOString();
};

/**
 * Retorna el fin del mes en la timezone de la org, como ISO UTC string.
 */
export const endOfMonthInTimezone = (date: Date | string, tz: string): string => {
  return dayjs(date).tz(tz).endOf('month').toISOString();
};

/**
 * Retorna el inicio del día en la timezone de la org, como ISO UTC string.
 */
export const startOfDayInTimezone = (date: Date | string, tz: string): string => {
  return dayjs(date).tz(tz).startOf('day').toISOString();
};

/**
 * Retorna el fin del día en la timezone de la org, como ISO UTC string.
 */
export const endOfDayInTimezone = (date: Date | string, tz: string): string => {
  return dayjs(date).tz(tz).endOf('day').toISOString();
};
