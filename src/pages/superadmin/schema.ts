import { z } from "zod";
import { schema as baseSchema } from "../admin/OrganizationInfo/schema";

// Extend base schema with superadmin-exclusive fields
export const superadminSchema = baseSchema.extend({
  // Superadmin-only fields
  password: z
    .union([z.string().min(6, "Mínimo 6 caracteres"), z.literal("")])
    .optional(),
  domains: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  hasAccessBlocked: z.boolean().optional(),
  membershipStatus: z
    .enum(["active", "trial", "past_due", "suspended", "cancelled", "none"])
    .optional(),
  clientIdWhatsapp: z
    .union([z.string(), z.literal(""), z.null(), z.undefined()])
    .optional(),
});

export type SuperadminFormValues = z.infer<typeof superadminSchema>;
