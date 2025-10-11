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

export const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  phoneNumber: z.string().optional(),

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

  facebookUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  whatsappUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  tiktokUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  address: z.string().optional(),
  location: z
    .object({ lat: z.number(), lng: z.number() })
    .nullable()
    .optional(),

  referredCount: z.number().min(0).optional(),
  referredReward: z.string().optional(),
  serviceCount: z.number().min(0).optional(),
  serviceReward: z.string().optional(),

  branding: z
    .object({
      logoUrl: z.string().url().optional(),
      faviconUrl: z.string().url().optional(),
      pwaIcon: z.string().url().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      themeColor: z.string().optional(),
      footerTextColor: z.string().optional(),
      pwaName: z.string().optional(),
      pwaShortName: z.string().optional(),
      pwaDescription: z.string().optional(),
    })
    .optional(),
});

export type FormValues = z.infer<typeof schema>;
