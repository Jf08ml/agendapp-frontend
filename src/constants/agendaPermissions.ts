export interface AgendaPermission {
  key: string;
  label: string;
  description?: string;
}

export const AGENDA_PERMISSIONS: AgendaPermission[] = [
  {
    key: "appointments:view_all",
    label: "Ver todas las citas",
    description: "Sin este permiso, el profesional solo ve sus propias citas",
  },
  { key: "appointments:create", label: "Crear citas" },
  { key: "appointments:update", label: "Editar citas" },
  { key: "appointments:cancel", label: "Cancelar citas" },
  { key: "appointments:confirm", label: "Confirmar asistencia" },
  { key: "appointments:search_schedule", label: "Buscar en la agenda" },
  {
    key: "appointments:send_reminders",
    label: "Enviar recordatorios WhatsApp",
  },
  {
    key: "appointments:reorderemployees",
    label: "Reordenar profesionales en la agenda",
  },
  {
    key: "appointments:manage_own_blocks",
    label: "Bloquear su propia agenda",
    description:
      "Permite al profesional marcar temporalmente su propia disponibilidad como bloqueada (vacaciones, permisos, etc.). No puede bloquear la agenda de otros profesionales.",
  },
];
