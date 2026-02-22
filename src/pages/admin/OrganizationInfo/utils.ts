import type { Organization } from "../../../services/organizationService";

export const ensureBranding = (b?: Organization["branding"]) => b ?? {};
export const ensureDomains = (d?: string[]) => (Array.isArray(d) ? d : []);

// ---------------------------------------------------------------------------
// normalizeOrg – aplica defaults a todos los campos anidados.
// Debe usarse tanto al cargar la organización como al procesar la respuesta
// del servidor después de guardar. Sin esta normalización, campos booleanos
// o numéricos que el backend omite (por ser falsy/0) quedarían como
// `undefined` en el formulario, rompiendo los inputs controlados de Mantine.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ensureArray = <T,>(arr: T[] | undefined, fallback: T[] = []): T[] =>
  Array.isArray(arr) ? [...arr] : [...fallback];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ensureBreaks = (arr: any[] | undefined) =>
  Array.isArray(arr) ? arr.map((b: any) => ({ ...b })) : [];

export const normalizeOrg = (response: Organization): Organization => ({
  ...response,
  branding: ensureBranding(response.branding),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  domains: ensureArray(response.domains as any, []),
  default_country: response.default_country ?? "CO",
  timezone: response.timezone || undefined,
  showLoyaltyProgram: response.showLoyaltyProgram ?? true,
  enableOnlineBooking: response.enableOnlineBooking ?? true,
  blockHolidaysForReservations: response.blockHolidaysForReservations ?? false,
  allowedHolidayDates: Array.isArray(response.allowedHolidayDates)
    ? [...response.allowedHolidayDates]
    : [],
  welcomeTitle: response.welcomeTitle ?? "¡Hola! Bienvenido",
  welcomeDescription:
    response.welcomeDescription ??
    "Estamos felices de tenerte aquí. Mereces lo mejor, ¡y aquí lo encontrarás! ✨",
  homeLayout: response.homeLayout ?? "modern",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paymentMethods: ensureArray(response.paymentMethods as any, []),
  requireReservationDeposit: response.requireReservationDeposit ?? false,
  reservationDepositPercentage: response.reservationDepositPercentage ?? 50,
  reminderSettings: {
    enabled: response.reminderSettings?.enabled ?? true,
    hoursBefore: response.reminderSettings?.hoursBefore ?? 24,
    sendTimeStart: response.reminderSettings?.sendTimeStart ?? "07:00",
    sendTimeEnd: response.reminderSettings?.sendTimeEnd ?? "20:00",
    secondReminder: {
      enabled: response.reminderSettings?.secondReminder?.enabled ?? false,
      hoursBefore: response.reminderSettings?.secondReminder?.hoursBefore ?? 2,
    },
  },
  openingHours: {
    start: response.openingHours?.start ?? "",
    end: response.openingHours?.end ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    businessDays: ensureArray(response.openingHours?.businessDays as any, [1, 2, 3, 4, 5]),
    breaks: ensureBreaks(response.openingHours?.breaks),
    stepMinutes: response.openingHours?.stepMinutes ?? 5,
  },
  weeklySchedule: response.weeklySchedule ?? {
    enabled: false,
    schedule: [],
    stepMinutes: 30,
  },
  currency: response.currency ?? "COP",
  cancellationPolicy: {
    minHoursBeforeAppointment:
      response.cancellationPolicy?.minHoursBeforeAppointment ?? 0,
    preventCancellingConfirmed:
      response.cancellationPolicy?.preventCancellingConfirmed ?? false,
  },
});
