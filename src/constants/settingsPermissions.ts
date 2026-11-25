// Permisos que dejan guardar la configuración del negocio (PUT /organizations/:id).
// Misma lista que el backend (middleware/requirePermission.js → PERMS.businessSettings):
// sin ninguno, el servidor responde 403, así que el panel no muestra esos controles.
export const BUSINESS_SETTINGS_PERMISSIONS = [
  "businessInformation:read",
  "services:read",
  "services:update",
  "inventory:manage",
  "whatsapp:read",
  "reservationOnline:read",
];

export const canEditBusinessSettings = (hasPermission: (p: string) => boolean) =>
  BUSINESS_SETTINGS_PERMISSIONS.some((p) => hasPermission(p));
