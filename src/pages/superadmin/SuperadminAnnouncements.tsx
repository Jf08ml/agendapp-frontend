import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Table,
  Badge,
  Group,
  Button,
  Text,
  Stack,
  ActionIcon,
  Tooltip,
  Modal,
  TextInput,
  Textarea,
  Select,
  Switch,
  Divider,
  Paper,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconCheck,
  IconX,
  IconBell,
  IconEye,
  IconEyeOff,
  IconTag,
} from "@tabler/icons-react";
import { BiBuildings, BiArrowBack } from "react-icons/bi";
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

const TYPE_COLOR: Record<UpdateType, string> = {
  new: "teal",
  improvement: "blue",
  fix: "orange",
};

export default function SuperadminAnnouncements() {
  const navigate = useNavigate();
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
      notifications.show({ title: "Campos requeridos", message: "Versión, fecha ISO y fecha display son obligatorias", color: "orange" });
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
  const rows = announcements.map((a) => (
    <Table.Tr key={a._id}>
      <Table.Td>
        <Text fw={600} size="sm">v{a.version}</Text>
      </Table.Td>
      <Table.Td>
        <Stack gap={2}>
          <Text size="sm">{a.date}</Text>
          <Text size="xs" c="dimmed" ff="monospace">{a.isoDate}</Text>
        </Stack>
      </Table.Td>
      <Table.Td>
        <Text size="xs" c="dimmed">{a.items.length} item{a.items.length !== 1 ? "s" : ""}</Text>
        <Group gap={4} mt={4}>
          {a.items.slice(0, 3).map((item, i) => (
            <Badge key={i} size="xs" color={TYPE_COLOR[item.type]} variant="light">
              {item.type}
            </Badge>
          ))}
          {a.items.length > 3 && <Text size="xs" c="dimmed">+{a.items.length - 3}</Text>}
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={500}>{a.viewCount ?? 0}</Text>
        <Text size="xs" c="dimmed">organizaciones</Text>
      </Table.Td>
      <Table.Td>
        <Badge color={a.published ? "green" : "gray"} variant="dot" size="sm">
          {a.published ? "Publicado" : "Borrador"}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <Tooltip label={a.published ? "Ocultar" : "Publicar"}>
            <ActionIcon
              variant="light"
              color={a.published ? "gray" : "green"}
              onClick={() => handleTogglePublish(a)}
            >
              {a.published ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Editar">
            <ActionIcon variant="light" color="blue" onClick={() => openEdit(a)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Eliminar">
            <ActionIcon variant="light" color="red" onClick={() => setDeleteTarget(a)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Nav superadmin */}
        <Group gap="xs">
          <Button variant="light" leftSection={<BiArrowBack size={16} />} size="sm" onClick={() => navigate("/superadmin")}>
            Membresías
          </Button>
          <Button variant="light" leftSection={<BiBuildings size={16} />} size="sm" onClick={() => navigate("/superadmin/orgs")}>
            Organizaciones
          </Button>
          <Button variant="light" leftSection={<IconTag size={16} />} size="sm" onClick={() => navigate("/superadmin/planes")}>
            Planes
          </Button>
          <Button variant="filled" leftSection={<IconBell size={16} />} size="sm">
            Anuncios
          </Button>
        </Group>

        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Anuncios del sistema</Title>
            <Text c="dimmed" size="sm">
              Crea y publica novedades visibles para todos los administradores de la plataforma
            </Text>
          </div>
          <Group gap="xs">
            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={fetchAll}>
              Actualizar
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Nuevo anuncio
            </Button>
          </Group>
        </Group>

        {/* Tabla */}
        {loading ? (
          <Stack align="center" py="xl">
            <Loader />
            <Text c="dimmed">Cargando anuncios...</Text>
          </Stack>
        ) : (
          <Paper withBorder radius="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Versión</Table.Th>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Items</Table.Th>
                  <Table.Th>Vistas</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.length > 0 ? rows : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center" c="dimmed" py="lg">
                        No hay anuncios. Crea el primero.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>

      {/* ── Modal crear / editar ──────────────────────────────────────────── */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={<Text fw={700} size="lg">{editing ? `Editar v${editing.version}` : "Nuevo anuncio"}</Text>}
        size="lg"
        centered
      >
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Versión"
              placeholder="2.6"
              required
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
            />
            <Switch
              label="Publicado"
              description="Visible para todos los admins"
              checked={form.published}
              onChange={(e) => setForm((f) => ({ ...f, published: e.currentTarget.checked }))}
              mt="lg"
            />
          </Group>

          <Group grow>
            <TextInput
              label="Fecha display"
              placeholder="5 Jun 2026"
              description="Texto que verá el usuario"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <TextInput
              label="Fecha ISO"
              placeholder="2026-06-05"
              description="Formato AAAA-MM-DD (para ordenar)"
              required
              value={form.isoDate}
              onChange={(e) => setForm((f) => ({ ...f, isoDate: e.target.value }))}
              ff="monospace"
            />
          </Group>

          <Divider label="Items del anuncio" />

          <Stack gap="xs">
            {form.items.map((item, idx) => (
              <Paper key={idx} withBorder p="sm" radius="sm">
                <Group gap="xs" align="flex-start" mb="xs">
                  <Select
                    data={TYPE_OPTIONS}
                    value={item.type}
                    onChange={(v) => updateItem(idx, "type", v ?? "new")}
                    style={{ width: 130, flexShrink: 0 }}
                  />
                  <TextInput
                    style={{ flex: 1 }}
                    placeholder="Título del cambio (visible siempre)"
                    value={item.text}
                    onChange={(e) => updateItem(idx, "text", e.target.value)}
                  />
                  <ActionIcon color="red" variant="light" mt={4} onClick={() => removeItem(idx)}>
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
                <Textarea
                  placeholder="Detalle opcional: explica qué se hizo y cómo funciona ahora (aparece al expandir)"
                  value={item.detail}
                  onChange={(e) => updateItem(idx, "detail", e.target.value)}
                  rows={2}
                  autosize
                  minRows={2}
                  maxRows={6}
                  styles={{ input: { fontSize: 13 } }}
                />
              </Paper>
            ))}
            <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addItem}>
              Agregar item
            </Button>
          </Stack>

          <Divider />
          <Group justify="flex-end">
            <Button variant="light" color="gray" onClick={() => setModalOpened(false)}>
              Cancelar
            </Button>
            <Button leftSection={<IconCheck size={16} />} loading={saving} onClick={handleSave}>
              {editing ? "Guardar cambios" : "Crear anuncio"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Modal eliminar ────────────────────────────────────────────────── */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={<Text fw={700} c="red">Eliminar anuncio</Text>}
        size="sm"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            ¿Eliminar el anuncio <strong>v{deleteTarget?.version}</strong>? Esta acción no se puede deshacer.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>Sí, eliminar</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
