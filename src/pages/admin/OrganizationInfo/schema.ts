import { z } from "zod";

// HH:mm en reloj de 24h (00:00–23:59)
const hhmm = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Usa formato 24h HH:mm (ej. 09:00, 13:30)"
  );

// Acepta HH:mm o vacío "" para campos opcionales del form
const hhmmOrEmpty = z.union([hhmm, z.literal("")]);

// Helper para URLs opcionales: acepta URL válida, string vacío, undefined o null
const optionalUrl = z
  .union([
    z.string().url(),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .optional();

// Helper para strings opcionales que aceptan vacío, null o undefined  
const optionalString = z
  .union([
    z.string(),
    z.literal(""),
    z.null(),
    z.undefined(),
  ])
  .optional();

export const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z
    .union([
      z.string().email("Correo inválido"),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional(),
  phoneNumber: optionalString,
  default_country: z.string().length(2, "Código de país ISO2 inválido").optional(),

  openingHours: z
    .object({
      start: hhmmOrEmpty.optional(),
      end: hhmmOrEmpty.optional(),

      // Días laborables (0=Dom..6=Sáb) — sin transform para evitar ZodEffects
      businessDays: z.array(z.number().int().min(0).max(6)).optional(),

      // “Espacios no disponibles” (breaks)
      breaks: z
        .array(
          z
            .object({
              day: z.number().int().min(0).max(6),
              start: hhmm,
              end: hhmm,
              note: z.string().optional(),
            })
            .refine((b) => b.start < b.end, {
              message: "La hora 'Desde' debe ser menor que 'Hasta'",
              path: ["end"],
            })
        )
        .optional(),

      stepMinutes: z.number().int().min(1).max(60).optional()
    })
    // Validación cruzada start < end (solo si ambos están presentes y no vacíos)
    .refine(
      (oh) =>
        !oh?.start ||
        !oh?.end ||
        oh.start === "" ||
        oh.end === "" ||
        oh.start < oh.end,
      {
        message: "La hora de apertura debe ser menor que la de cierre",
        path: ["end"],
      }
    )
    .optional(),

  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  whatsappUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  address: optionalString,
  location: z
    .object({ lat: z.number(), lng: z.number() })
    .nullable()
    .optional(),

  referredCount: z.union([z.number().min(0), z.null(), z.undefined()]).optional(),
  referredReward: optionalString,
  serviceCount: z.union([z.number().min(0), z.null(), z.undefined()]).optional(),
  serviceReward: optionalString,
  showLoyaltyProgram: z.boolean().optional(),
  welcomeTitle: optionalString,
  welcomeDescription: optionalString,
  homeLayout: z.enum(["modern", "minimal", "cards"]).optional(),

  reminderSettings: z
    .object({
      enabled: z.boolean().optional(),
      hoursBefore: z.number().int().min(1).max(72).optional(),
      sendTimeStart: hhmmOrEmpty.optional(),
      sendTimeEnd: hhmmOrEmpty.optional(),
    })
    .optional(),

  branding: z
    .object({
      logoUrl: optionalUrl,
      faviconUrl: optionalUrl,
      pwaIcon: optionalUrl,
      primaryColor: optionalString,
      secondaryColor: optionalString,
      themeColor: optionalString,
      footerTextColor: optionalString,
      pwaName: optionalString,
      pwaShortName: optionalString,
      pwaDescription: optionalString,
    })
    .optional(),

  // Métodos de pago para reservas de clientes
  paymentMethods: z
    .array(
      z.object({
        type: z.enum(["nequi", "bancolombia", "daviplata", "otros"]),
        accountName: optionalString,
        accountNumber: optionalString,
        phoneNumber: optionalString,
        qrCodeUrl: optionalUrl,
        notes: optionalString,
      })
    )
    .optional(),
  requireReservationDeposit: z.boolean().optional(),
  reservationDepositPercentage: z.number().min(0).max(100).optional(),
});

export type FormValues = z.infer<typeof schema>;
