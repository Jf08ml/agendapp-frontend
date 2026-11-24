// Editor de profesional (rediseño, ProfesionalesPanel): panel lateral en
// escritorio, pantalla completa en móvil. Secciones: foto y datos, color (las 8
// muestras pro-*), reserva en línea (3 opciones excluyentes sobre los mismos
// campos onlineBookingEnabled + onlineBookingBackup), servicios que atiende,
// comisión, horario y bloqueos (solo al editar; se guardan aparte, como antes) y
// permisos de agenda (solo al editar).
import React, { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Avatar,
  Button,
  ColorPicker,
  Drawer,
  Loader,
  NumberInput,
  PasswordInput,
  Popover,
  SegmentedControl,
  TextInput,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { useMediaQuery } from "@mantine/hooks";
import { IconCheck, IconLock, IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";
import { AGENDA_PERMISSIONS } from "../../../../constants/agendaPermissions";
import { uploadImage } from "../../../../services/imageService";
import { Employee } from "../../../../services/employeeService";
import { Service } from "../../../../services/serviceService";
import {
  PRO_COLORS,
  findDuplicateContact,
  initials,
  onlineBookingFields,
  onlineBookingMode,
  sameColor,
  type OnlineBookingMode,
} from "../employeeView";
import EmployeeScheduleSection from "./EmployeeScheduleSection";

interface ModalCreateEditEmployeeProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  services: Service[];
  /** Resto del equipo, para avisar bajo el campo si el correo o teléfono se repite. */
  employees?: Employee[];
  onSave: (employee: Employee) => Promise<void> | void;
}

const EMPTY: Employee = {
  _id: "",
  names: "",
  position: "",
  phoneNumber: "",
  services: [],
  organizationId: "",
  email: "",
  password: "",
  role: { name: "", permissions: [] },
  customPermissions: [],
  isActive: true,
  onlineBookingEnabled: true,
  onlineBookingBackup: false,
  profileImage: "",
  color: "",
  commissionType: "percentage",
  commissionValue: 0,
};

const ONLINE_OPTIONS: { value: OnlineBookingMode; title: string; desc: string }[] = [
  {
    value: "visible",
    title: "Visible",
    desc: "Los clientes pueden elegirlo al reservar en línea y los asistentes de reservas lo ofrecen.",
  },
  {
    value: "backup",
    title: "Solo como respaldo",
    desc: "No aparece para elegirlo. Recibe reservas en línea solo en los horarios en que los demás profesionales de ese servicio están ocupados.",
  },
  {
    value: "hidden",
    title: "Oculta",
    desc: "No aparece en la reserva en línea ni en los asistentes. Sigue en tu agenda y puedes asignarle citas.",
  },
];

function Section({ title, help, children }: { title: string; help?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ag-stack" style={{ gap: "var(--space-3)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--line)" }}>
      <div>
        <h3 style={{ margin: 0, font: "600 15px/22px var(--mantine-font-family)" }}>{title}</h3>
        {help && <div className="ag-help" style={{ marginTop: 2 }}>{help}</div>}
      </div>
      {children}
    </section>
  );
}

const ModalCreateEditEmployee: React.FC<ModalCreateEditEmployeeProps> = ({
  isOpen,
  onClose,
  employee,
  services,
  employees = [],
  onSave,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [form, setForm] = useState<Employee>(EMPTY);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [triedSave, setTriedSave] = useState(false);

  useEffect(() => {
    setTriedSave(false);
    if (employee) {
      setForm({
        ...EMPTY,
        ...employee,
        services: employee.services || [],
        password: employee.password || "",
        role: { name: employee.role?.name || "", permissions: employee.role?.permissions || [] },
        customPermissions: employee.customPermissions || [],
        isActive: employee.isActive ?? true,
        onlineBookingEnabled: employee.onlineBookingEnabled !== false,
        onlineBookingBackup: employee.onlineBookingBackup === true,
        profileImage: employee.profileImage || "",
        color: employee.color || "",
        commissionType: employee.commissionType ?? "percentage",
        commissionValue: employee.commissionValue ?? 0,
      });
    } else {
      setForm(EMPTY);
    }
  }, [employee, isOpen]);

  const set = (patch: Partial<Employee>) => setForm((f) => ({ ...f, ...patch }));

  const dup = useMemo(() => findDuplicateContact(form, employees), [form, employees]);
  const selectedIds = useMemo(() => new Set((form.services || []).map((s) => s._id)), [form.services]);
  const allSelected = services.length > 0 && services.every((s) => selectedIds.has(s._id));
  const noServices = selectedIds.size === 0;

  const canSave =
    form.names.trim().length > 1 &&
    form.position.trim().length > 0 &&
    form.phoneNumber.trim().length > 5 &&
    form.email.trim().length > 3 &&
    !dup.email &&
    !dup.phone &&
    !noServices;

  const handleSave = async () => {
    setTriedSave(true);
    if (isUploading || isSaving || !canSave) return;
    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (error) {
      // El panel sigue abierto; el error ya se mostró
      console.error("Error saving employee:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = async (files: File[]) => {
    setIsUploading(true);
    try {
      const imageUrl = await uploadImage(files[0]);
      set({ profileImage: imageUrl as string });
    } catch (error) {
      console.error("Error al cargar la imagen:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleService = (service: Service) => {
    const list = form.services || [];
    set({
      services: selectedIds.has(service._id) ? list.filter((s) => s._id !== service._id) : [...list, service],
    });
  };

  const mode = onlineBookingMode(form);
  const customColor = !!form.color && !PRO_COLORS.some((c) => sameColor(c.hex, form.color));
  const ring = form.color || "var(--line-strong)";

  return (
    <Drawer
      opened={isOpen}
      onClose={onClose}
      position="right"
      size={isMobile ? "100%" : 520}
      title={employee ? "Editar profesional" : "Nuevo profesional"}
      styles={{ body: { paddingBottom: 0 } }}
    >
      <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
        {/* Foto */}
        <div className="ag-row" style={{ gap: "var(--space-4)", alignItems: "center", flexWrap: "nowrap" }}>
          <span style={{ padding: 3, borderRadius: 999, background: ring, display: "inline-flex", flex: "none" }}>
            <Avatar
              src={form.profileImage || null}
              size={64}
              radius="xl"
              styles={{ root: { background: "var(--surface-hover)" }, placeholder: { color: "var(--ink-muted)", fontWeight: 600 } }}
            >
              {initials(form.names) || "?"}
            </Avatar>
          </span>
          <div className="ag-row" style={{ gap: 8 }}>
            <Dropzone
              onDrop={handleDrop}
              accept={IMAGE_MIME_TYPE}
              multiple={false}
              disabled={isUploading}
              p={0}
              style={{ border: 0, background: "transparent" }}
            >
              <Button
                component="span"
                variant="default"
                size="xs"
                leftSection={isUploading ? <Loader size={14} /> : <IconUpload size={14} />}
              >
                {isUploading ? "Subiendo…" : form.profileImage ? "Cambiar foto" : "Subir foto"}
              </Button>
            </Dropzone>
            {form.profileImage && !isUploading && (
              <Button variant="subtle" color="gray" size="xs" leftSection={<IconTrash size={14} />} onClick={() => set({ profileImage: "" })}>
                Quitar
              </Button>
            )}
          </div>
        </div>

        {/* Datos */}
        <TextInput
          label="Nombre completo"
          withAsterisk
          placeholder="Ej: Nataly Gómez"
          value={form.names}
          onChange={(e) => set({ names: e.currentTarget.value })}
          error={triedSave && form.names.trim().length <= 1 ? "Escribe el nombre" : undefined}
        />
        <TextInput
          label="Cargo"
          withAsterisk
          placeholder="Ej: Estilista"
          value={form.position}
          onChange={(e) => set({ position: e.currentTarget.value })}
          error={triedSave && !form.position.trim() ? "Escribe el cargo" : undefined}
        />
        <TextInput
          label="Teléfono"
          withAsterisk
          inputMode="tel"
          placeholder="Ej: 3001234567"
          value={form.phoneNumber}
          onChange={(e) => set({ phoneNumber: e.currentTarget.value })}
          error={
            dup.phone
              ? "Ya hay un profesional con ese teléfono"
              : triedSave && form.phoneNumber.trim().length <= 5
                ? "Escribe el teléfono"
                : undefined
          }
        />
        <TextInput
          label="Correo"
          withAsterisk
          type="email"
          placeholder="correo@ejemplo.com"
          value={form.email}
          onChange={(e) => set({ email: e.currentTarget.value })}
          error={
            dup.email
              ? "Ya hay un profesional con ese correo"
              : triedSave && form.email.trim().length <= 3
                ? "Escribe el correo"
                : undefined
          }
        />
        <PasswordInput
          label="Contraseña"
          description={employee ? "Déjala igual para no cambiarla." : "Con ella entra a su agenda."}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => set({ password: e.currentTarget.value })}
        />

        {/* Color */}
        <Section title="Color en la agenda" help="Identifica sus citas en la agenda.">
          <div className="ag-row" style={{ gap: 8 }} role="radiogroup" aria-label="Color">
            {PRO_COLORS.map((c) => {
              const on = sameColor(c.hex, form.color);
              return (
                <button
                  key={c.token}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Color ${c.token.replace("pro-", "")}`}
                  onClick={() => set({ color: c.hex })}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    border: on ? "2px solid var(--ink)" : "2px solid transparent",
                    boxShadow: "inset 0 0 0 2px var(--surface-raised)",
                    background: `var(--${c.token})`,
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {on && <IconCheck size={16} stroke={2.5} />}
                </button>
              );
            })}
            {customColor && (
              <span
                role="radio"
                aria-checked
                aria-label="Color actual"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: "2px solid var(--ink)",
                  boxShadow: "inset 0 0 0 2px var(--surface-raised)",
                  background: form.color,
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                }}
              >
                <IconCheck size={16} stroke={2.5} />
              </span>
            )}
            <Popover position="bottom-start" withinPortal shadow="lg">
              <Popover.Target>
                <ActionIcon variant="default" radius="xl" size={32} aria-label="Otro color">
                  <IconPlus size={16} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <ColorPicker format="hex" value={form.color || "#1c7ed6"} onChange={(color) => set({ color })} />
              </Popover.Dropdown>
            </Popover>
          </div>
        </Section>

        {/* Reserva en línea */}
        <Section title="Reserva en línea">
          <div className="ag-stack" style={{ gap: 8 }} role="radiogroup" aria-label="Reserva en línea">
            {ONLINE_OPTIONS.map((o) => (
              <div
                key={o.value}
                className="ag-opt"
                role="radio"
                tabIndex={0}
                aria-checked={mode === o.value}
                onClick={() => set(onlineBookingFields(o.value))}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), set(onlineBookingFields(o.value)))}
                style={{ cursor: "pointer" }}
              >
                <span className="ag-radio" />
                <div>
                  <b>{o.title}</b>
                  <span className="d">{o.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Servicios */}
        <Section title="Servicios que atiende">
          {services.length === 0 ? (
            <span className="ag-muted">Aún no tienes servicios creados.</span>
          ) : (
            <div className="ag-card" style={{ overflow: "hidden" }}>
              <div
                className="ag-list-row"
                role="checkbox"
                tabIndex={0}
                aria-checked={allSelected}
                onClick={() => set({ services: allSelected ? [] : [...services] })}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), set({ services: allSelected ? [] : [...services] }))}
                style={{ padding: "10px 12px", cursor: "pointer", background: "var(--surface-muted)" }}
              >
                <span className="ag-check" aria-checked={allSelected}>
                  {allSelected && <IconCheck size={14} stroke={2.5} />}
                </span>
                <b style={{ flex: 1, fontSize: 14 }}>Seleccionar todos</b>
                <span className="ag-subtle ag-num">
                  {selectedIds.size} de {services.length}
                </span>
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {services.map((s) => {
                  const on = selectedIds.has(s._id);
                  return (
                    <div
                      key={s._id}
                      className="ag-list-row"
                      role="checkbox"
                      tabIndex={0}
                      aria-checked={on}
                      onClick={() => toggleService(s)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggleService(s))}
                      style={{ padding: "10px 12px", cursor: "pointer" }}
                    >
                      <span className="ag-check" aria-checked={on}>
                        {on && <IconCheck size={14} stroke={2.5} />}
                      </span>
                      <span style={{ flex: 1, fontSize: 14 }}>{s.name}</span>
                      {s.type && <span className="ag-subtle">{s.type}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {triedSave && noServices && (
            <span className="ag-help" style={{ color: "var(--danger)" }}>
              Elige al menos un servicio.
            </span>
          )}
        </Section>

        {/* Comisión */}
        <Section title="Comisión" help="Se usa para calcular su pago en el perfil.">
          <SegmentedControl
            size="xs"
            value={form.commissionType ?? "percentage"}
            onChange={(value) => set({ commissionType: value as "percentage" | "fixed", commissionValue: 0 })}
            data={[
              { label: "Porcentaje", value: "percentage" },
              { label: "Valor fijo por cita", value: "fixed" },
            ]}
            style={{ alignSelf: "flex-start" }}
          />
          <NumberInput
            aria-label="Valor de la comisión"
            placeholder={form.commissionType === "percentage" ? "Ej: 30" : "Ej: 15000"}
            description={
              form.commissionType === "percentage"
                ? "Porcentaje sobre el valor de cada cita atendida (0 a 100)."
                : "Monto fijo por cada cita atendida."
            }
            min={0}
            max={form.commissionType === "percentage" ? 100 : undefined}
            thousandSeparator={form.commissionType === "fixed" ? "." : undefined}
            decimalSeparator={form.commissionType === "fixed" ? "," : undefined}
            value={form.commissionValue ?? 0}
            onChange={(val) => set({ commissionValue: typeof val === "number" ? val : 0 })}
            rightSection={<span className="ag-subtle" style={{ paddingRight: 4 }}>{form.commissionType === "percentage" ? "%" : "$"}</span>}
            w={220}
          />
        </Section>

        {/* Horario y bloqueos: se guardan aparte, con su propio botón */}
        {employee?._id && (
          <Section title="Horario y bloqueos" help="Se guardan con sus propios botones, aparte del resto del formulario.">
            <EmployeeScheduleSection employeeId={employee._id} employeeName={employee.names} />
          </Section>
        )}

        {/* Permisos de agenda */}
        {employee && (
          <Section title="Permisos de agenda" help="Lo que puede hacer en la agenda además de ver sus propias citas.">
            <div className="ag-card" style={{ overflow: "hidden" }}>
              {AGENDA_PERMISSIONS.map((perm) => {
                const fromRole = (form.role?.permissions ?? []).includes(perm.key);
                const fromCustom = (form.customPermissions ?? []).includes(perm.key);
                const on = fromRole || fromCustom;
                const toggle = () => {
                  if (fromRole) return;
                  const current = form.customPermissions ?? [];
                  set({ customPermissions: fromCustom ? current.filter((p) => p !== perm.key) : [...current, perm.key] });
                };
                return (
                  <div
                    key={perm.key}
                    className="ag-list-row"
                    role="checkbox"
                    tabIndex={fromRole ? -1 : 0}
                    aria-checked={on}
                    aria-disabled={fromRole}
                    onClick={toggle}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle())}
                    style={{ padding: "10px 12px", cursor: fromRole ? "default" : "pointer", alignItems: "flex-start" }}
                  >
                    <span className="ag-check" aria-checked={on} style={{ marginTop: 1, opacity: fromRole ? 0.55 : 1 }}>
                      {on && <IconCheck size={14} stroke={2.5} />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ag-row" style={{ gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{perm.label}</span>
                        {fromRole && (
                          <span className="ag-badge" style={{ height: 20, padding: "0 8px", fontSize: 11 }}>
                            <IconLock size={12} stroke={2} /> Por su rol
                          </span>
                        )}
                      </div>
                      {(perm.description || fromRole) && (
                        <span className="ag-help" style={{ display: "block" }}>
                          {fromRole ? "Viene con su rol; para quitarlo hay que cambiar el rol." : perm.description}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Pie fijo */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 2,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            alignItems: "center",
            margin: "0 calc(-1 * var(--mantine-spacing-md))",
            padding: "12px var(--mantine-spacing-md)",
            borderTop: "1px solid var(--line)",
            background: "var(--surface-raised)",
          }}
        >
          {triedSave && !canSave && (
            <span className="ag-help" style={{ marginRight: "auto", color: "var(--danger)" }}>
              Revisa los campos marcados.
            </span>
          )}
          <Button variant="default" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isUploading} loading={isSaving}>
            {employee ? "Guardar cambios" : "Agregar profesional"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
};

export default ModalCreateEditEmployee;
