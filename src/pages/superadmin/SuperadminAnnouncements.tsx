// Anuncios del sistema (rediseño, SuperadminAnuncios): tabla con conteo de
// cambios por tipo, vistas que muestran qué organizaciones lo vieron,
// Publicar u Ocultar con texto y edición en panel lateral.
import { useEffect, useState } from "react";
import { ActionIcon, Button, Drawer, Modal, Popover, ScrollArea, Select, Skeleton, Switch, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconEdit, IconPlus, IconRefresh, IconTrash, IconX } from "@tabler/icons-react";
import {
  adminGetAnnouncements,
  adminCreateAnnouncement,
  adminUpdateAnnouncement,
  adminDeleteAnnouncement,
  adminTogglePublish,
  type Announcement,
  type AnnouncementItem,
} from "../../services/announcementService";

type UpdateType = AnnouncementItem["type"];

interface FormItem {
  type: UpdateType;
  text: string;
  detail: string;
}

interface AnnouncementForm {
  version: string;
  date: string;
  isoDate: string;
  published: boolean;
  items: FormItem[];
}

const EMPTY_FORM: AnnouncementForm = {
  version: "",
  date: "",
  isoDate: "",
  published: false,
  items: [],
};

const TYPE_OPTIONS = [
  { value: "new", label: "Nuevo" },
  { value: "improvement", label: "Mejora" },
  { value: "fix", label: "Corrección" },
];

export default function SuperadminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      setAnnouncements(await adminGetAnnouncements());
    } catch {
      notifications.show({ title: "Error", message: "No se pudieron cargar los anuncios", color: "red" });
    } finally {
      setLoading(false);
    }
  };

  // ── Modal ───────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpened(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      version: a.version,
      date: a.date,
      isoDate: a.isoDate,
      published: a.published,
      items: a.items.map((i) => ({ type: i.type, text: i.text, detail: i.detail ?? "" })),
    });
    setModalOpened(true);
  };

  // ── Items del formulario ────────────────────────────────────────────────
  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { type: "new", text: "", detail: "" }] }));

  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx: number, field: keyof FormItem, value: string) =>
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value } as FormItem;
      return { ...f, items };
    });

  // ── Guardar ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.version.trim() || !form.isoDate.trim() || !form.date.trim()) {
      notifications.show({ title: "Campos requeridos", message: "La versión, la fecha visible y la fecha para ordenar son obligatorias.", color: "orange" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateAnnouncement(editing._id, form);
        notifications.show({ title: "Éxito", message: "Anuncio actualizado", color: "green" });
      } else {
        await adminCreateAnnouncement(form);
        notifications.show({ title: "Éxito", message: "Anuncio creado", color: "green" });
      }
      setModalOpened(false);
      fetchAll();
    } catch {
      notifications.show({ title: "Error", message: "No se pudo guardar el anuncio", color: "red" });
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDeleteAnnouncement(deleteTarget._id);
      notifications.show({ title: "Éxito", message: "Anuncio eliminado", color: "green" });
      setDeleteTarget(null);
      fetchAll();
    } catch {
      notifications.show({ title: "Error", message: "No se pudo eliminar", color: "red" });
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle publicación ───────────────────────────────────────────────────
  const handleTogglePublish = async (a: Announcement) => {
    try {
      await adminTogglePublish(a._id, !a.published);
      notifications.show({
        message: a.published ? "Anuncio ocultado" : "Anuncio publicado",
        color: a.published ? "gray" : "green",
      });
      fetchAll();
    } catch {
      notifications.show({ title: "Error", message: "No se pudo cambiar el estado", color: "red" });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const mono = { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" } as const;
  const changeSummary = (a: Announcement) => {
    const n = (t: UpdateType) => a.items.filter((i) => i.type === t).length;
    const parts = [
      [n("new"), "nuevo", "nuevos"],
      [n("improvement"), "mejora", "mejoras"],
      [n("fix"), "corrección", "correcciones"],
    ]
      .filter(([c]) => (c as number) > 0)
      .map(([c, one, many]) => `${c} ${c === 1 ? one : many}`);
    return parts.length ? parts.join(" · ") : "Sin cambios";
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 48px" }}>
      <div className="ag-stack" style={{ gap: 16 }}>
        <div className="ag-row" style={{ justifyContent: "space-between", gap: 12, alignItems: "flex-end" }}>
          <div>
            <h1 style={{ margin: 0, font: "600 24px/30px var(--mantine-font-family)", letterSpacing: "-0.015em" }}>Anuncios</h1>
            <div className="ag-muted" style={{ fontSize: 14, marginTop: 4 }}>
              Las novedades que ven los administradores de todos los negocios.
            </div>
          </div>
          <div className="ag-row" style={{ gap: 8 }}>
            <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={fetchAll} loading={loading}>
              Actualizar
            </Button>
            <Button color="var(--platform)" leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Nuevo anuncio
            </Button>
          </div>
        </div>

        <div className="ag-card" style={{ overflowX: "auto" }}>
          <table className="ag-table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th>Versión</th>
                <th>Fecha visible</th>
                <th>Cambios</th>
                <th style={{ textAlign: "right" }}>Vistas</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {loading && announcements.length === 0 ? (
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <Skeleton height={18} />
                    </td>
                  </tr>
                ))
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="ag-muted" style={{ textAlign: "center", padding: "32px 16px" }}>
                    Aún no hay anuncios. Crea el primero con «Nuevo anuncio».
                  </td>
                </tr>
              ) : (
                announcements.map((a) => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>v{a.version}</td>
                    <td>
                      <div>{a.date}</div>
                      <div className="ag-subtle" style={mono}>{a.isoDate}</div>
                    </td>
                    <td className="ag-muted">{changeSummary(a)}</td>
                    <td className="ag-num" style={{ textAlign: "right" }}>
                      {a.viewers?.length ? (
                        <Popover width={280} position="bottom-end" withinPortal shadow="md">
                          <Popover.Target>
                            <button type="button" className="ag-link ag-num" style={{ border: 0, background: "none", padding: 0, cursor: "pointer", fontSize: 14 }} aria-label={`Ver las ${a.viewCount ?? 0} organizaciones que vieron v${a.version}`}>
                              {a.viewCount ?? a.viewers.length}
                            </button>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <b style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Organizaciones que lo vieron</b>
                            <ScrollArea.Autosize mah={240}>
                              <div className="ag-stack" style={{ gap: 2, paddingRight: 8 }}>
                                {a.viewers.map((v) => (
                                  <span key={v._id} style={{ fontSize: 13 }}>
                                    {v.name}
                                  </span>
                                ))}
                              </div>
                            </ScrollArea.Autosize>
                          </Popover.Dropdown>
                        </Popover>
                      ) : (
                        <span className="ag-muted">{a.viewCount ?? 0}</span>
                      )}
                    </td>
                    <td>{a.published ? <span className="ag-badge ag-badge--success">Publicado</span> : <span className="ag-badge">Borrador</span>}</td>
                    <td>
                      <div className="ag-row" style={{ gap: 4, justifyContent: "flex-end", flexWrap: "nowrap" }}>
                        <Button size="xs" variant="default" onClick={() => handleTogglePublish(a)}>
                          {a.published ? "Ocultar" : "Publicar"}
                        </Button>
                        <ActionIcon variant="subtle" color="gray" onClick={() => openEdit(a)} aria-label={`Editar v${a.version}`}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="gray" onClick={() => setDeleteTarget(a)} aria-label={`Eliminar v${a.version}`}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Panel crear / editar ─────────────────────────────────────────── */}
      <Drawer
        opened={modalOpened}
        onClose={() => !saving && setModalOpened(false)}
        position="right"
        size={560}
        title={<b style={{ fontSize: 16 }}>{editing ? `Editar v${editing.version}` : "Nuevo anuncio"}</b>}
      >
        <div className="ag-stack" style={{ gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TextInput label="Versión" placeholder="2.6" required value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
            <TextInput
              label="Fecha visible"
              placeholder="5 jun 2026"
              description="El texto que ve el administrador."
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <TextInput
            label="Fecha para ordenar"
            placeholder="2026-06-05"
            description="Formato AAAA-MM-DD."
            required
            value={form.isoDate}
            onChange={(e) => setForm((f) => ({ ...f, isoDate: e.target.value }))}
            styles={{ input: mono }}
          />
          <Switch
            label="Publicado"
            description="Lo ven todos los administradores."
            checked={form.published}
            onChange={(e) => {
              // Capturar antes del updater diferido: React resetea currentTarget a null.
              const checked = e.currentTarget.checked;
              setForm((f) => ({ ...f, published: checked }));
            }}
          />

          <h3 className="ag-h" style={{ margin: "6px 0 0" }}>Cambios</h3>
          {form.items.length === 0 && <div className="ag-subtle">Agrega al menos un cambio.</div>}
          {form.items.map((item, idx) => (
            <div key={idx} className="ag-card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="ag-row" style={{ gap: 8, flexWrap: "nowrap", alignItems: "flex-start" }}>
                <Select
                  aria-label="Tipo de cambio"
                  data={TYPE_OPTIONS}
                  value={item.type}
                  onChange={(v) => updateItem(idx, "type", v ?? "new")}
                  allowDeselect={false}
                  style={{ width: 140, flex: "none" }}
                />
                <TextInput style={{ flex: 1 }} aria-label="Título del cambio" placeholder="Título del cambio" value={item.text} onChange={(e) => updateItem(idx, "text", e.target.value)} />
                <ActionIcon variant="subtle" color="gray" mt={4} onClick={() => removeItem(idx)} aria-label="Quitar este cambio">
                  <IconX size={16} />
                </ActionIcon>
              </div>
              <Textarea
                aria-label="Detalle del cambio"
                placeholder="Detalle opcional: qué se hizo y cómo funciona ahora (se ve al expandir)"
                value={item.detail}
                onChange={(e) => updateItem(idx, "detail", e.target.value)}
                autosize
                minRows={2}
                maxRows={6}
              />
            </div>
          ))}
          <Button variant="default" leftSection={<IconPlus size={14} />} onClick={addItem} style={{ alignSelf: "flex-start" }}>
            Agregar cambio
          </Button>

          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <Button variant="default" onClick={() => setModalOpened(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button color="var(--platform)" loading={saving} onClick={handleSave}>
              {editing ? "Guardar anuncio" : "Crear anuncio"}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* ── Eliminar ─────────────────────────────────────────────────────── */}
      <Modal opened={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title={<b>Eliminar v{deleteTarget?.version}</b>} centered>
        <div className="ag-stack" style={{ gap: 14 }}>
          <div className="ag-muted" style={{ fontSize: 14 }}>No se puede deshacer. Los administradores dejan de verlo en Novedades.</div>
          <div className="ag-row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <Button variant="default" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>
              Sí, eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
