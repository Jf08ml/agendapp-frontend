/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Title,
  Card,
  Group,
  Button,
  Text,
  ActionIcon,
  Image,
  Grid,
  TextInput,
  Badge,
  Menu,
  Tooltip,
  SegmentedControl,
  Select,
  Skeleton,
  AspectRatio,
  rem,
  Center,
  Stack,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import {
  BsTrash,
  BsPencil,
  BsSearch,
  BsThreeDotsVertical,
} from "react-icons/bs";
import { showNotification } from "@mantine/notifications";
import {
  createService,
  updateService,
  deleteService,
  getServicesByOrganizationId,
  Service,
} from "../../../services/serviceService";
import ModalCreateEdit from "./components/ModalCreateEdit";
import { uploadImage } from "../../../services/imageService";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { modals } from "@mantine/modals";

const AdminServices: React.FC = () => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchTerm, 250);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"alpha" | "price" | "duration">("alpha");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [, setLoading] = useState(false);

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);

  useEffect(() => {
    if (!organizationId) return;
    loadServices();
  }, [organizationId]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const servicesData = await getServicesByOrganizationId(organizationId!);
      setServices(servicesData);
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error",
        message: "Error al cargar los servicios",
        color: "red",
      });
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  };

  // Options
  const allTypes = useMemo(
    () => Array.from(new Set(services.map((s) => s.type).filter(Boolean))).sort(),
    [services]
  );

  // Compute filtered/sorted
  const filtered = useMemo(() => {
    let data = [...services];

    // text
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.type.toLowerCase().includes(q) ||
          (s.description?.toLowerCase() ?? "").includes(q)
      );
    }

    // status
    if (status !== "all") {
      data = data.filter((s) => (status === "active" ? s.isActive : !s.isActive));
    }

    // type
    if (typeFilter && typeFilter !== "__all__") {
      data = data.filter((s) => s.type === typeFilter);
    }

    // sort
    data.sort((a, b) => {
      if (sortBy === "alpha") return a.name.localeCompare(b.name, "es");
      if (sortBy === "price") return (b.price ?? 0) - (a.price ?? 0);
      return (b.duration ?? 0) - (a.duration ?? 0);
    });

    return data;
  }, [services, debouncedSearch, status, typeFilter, sortBy]);

  const handleSaveService = async (service: Service) => {
    try {
      let updatedServices: (Service | undefined)[] = [];
      service.images = service.images || [];

      // Subir archivos nuevos (los File)
      const filesToUpload = service.images.filter((img) => img && typeof img !== "string") as unknown as File[];
      let uploadedUrls: (string | undefined)[] = [];
      if (filesToUpload.length > 0) {
        uploadedUrls = await Promise.all(filesToUpload.map((f) => uploadImage(f)));
      }
      const validUploaded = uploadedUrls.filter(Boolean) as string[];

      const finalImages = [
        ...service.images.filter((img): img is string => typeof img === "string"),
        ...validUploaded,
      ];

      if (service._id) {
        const updated = await updateService(service._id, {
          ...service,
          images: finalImages,
        });
        updatedServices = services.map((s) => (s._id === service._id ? updated : s));
      } else {
        const created = await createService({
          ...service,
          images: finalImages,
          organizationId,
        } as any);
        updatedServices = [...services, created];
      }

      setServices(updatedServices.filter(Boolean) as Service[]);
      setIsModalOpen(false);
      setEditingService(null);

      showNotification({
        title: service._id ? "Servicio actualizado" : "Servicio agregado",
        message: "El servicio ha sido guardado correctamente",
        color: "green",
      });
    } catch (error) {
      console.error(error);
      showNotification({
        title: "Error",
        message: "Error al guardar el servicio",
        color: "red",
      });
    }
  };

  const confirmDelete = (serviceId: string, index: number) => {
    modals.openConfirmModal({
      title: "Eliminar servicio",
      children: <Text size="sm">¿Seguro que deseas eliminar este servicio? Esta acción no se puede deshacer.</Text>,
      labels: { confirm: "Eliminar", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: () => handleDeleteService(serviceId, index),
    });
  };

  const handleDeleteService = async (serviceId: string, index: number) => {
    try {
      await deleteService(serviceId);
      setServices((prev) => prev.filter((_, i) => i !== index));
      showNotification({ title: "Servicio eliminado", message: "Se eliminó correctamente", color: "green" });
    } catch (error) {
      console.error(error);
      showNotification({ title: "Error", message: "No se pudo eliminar el servicio", color: "red" });
    }
  };

  const toggleStatus = async (serviceId: string) => {
    try {
      const current = services.find((s) => s._id === serviceId);
      if (!current) return;
      const updated = await updateService(serviceId, {
        ...current,
        images: current.images?.filter((img): img is string => typeof img === "string"),
        isActive: !current.isActive,
      });
      setServices((prev) => prev.map((s) => (s._id === serviceId ? (updated as Service) : s)));
      showNotification({ title: "Estado actualizado", message: "Cambio aplicado", color: "green" });
    } catch (error) {
      console.error(error);
      showNotification({ title: "Error", message: "No se pudo actualizar el estado", color: "red" });
    }
  };

  const Toolbar = (
    <Card withBorder radius="md" p="md" mb="md">
      <Group justify="space-between" align="end" wrap="wrap" gap="sm">
        <Title order={isMobile ? 3 : 2}>Administrar Servicios</Title>

        <Group wrap="wrap" gap="sm" align="end">
          <TextInput
            leftSection={<BsSearch />}
            placeholder="Buscar por nombre, tipo o descripción…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            w={isMobile ? "100%" : 280}
          />

          <Select
            label="Tipo"
            data={[{ value: "__all__", label: "Todos" }, ...allTypes.map((t) => ({ value: t, label: t }))]}
            value={typeFilter ?? "__all__"}
            onChange={(v) => setTypeFilter(v ?? "__all__")}
            clearable={false}
            w={isMobile ? "48%" : 180}
          />

          <SegmentedControl
            value={status}
            onChange={(v: any) => setStatus(v)}
            data={[
              { label: "Todos", value: "all" },
              { label: "Activos", value: "active" },
              { label: "Inactivos", value: "inactive" },
            ]}
            size={isMobile ? "xs" : "sm"}
          />

          <Select
            label="Ordenar por"
            data={[
              { value: "alpha", label: "Nombre (A–Z)" },
              { value: "price", label: "Precio (desc)" },
              { value: "duration", label: "Duración (desc)" },
            ]}
            value={sortBy}
            onChange={(v) => setSortBy((v as any) ?? "alpha")}
            w={isMobile ? "48%" : 180}
          />

          <Button onClick={() => { setIsModalOpen(true); setEditingService(null); }}>
            Agregar servicio
          </Button>
        </Group>
      </Group>
    </Card>
  );

  return (
    <Box>
      {Toolbar}

      <ModalCreateEdit
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingService(null); }}
        service={editingService}
        onSave={handleSaveService}
        allTypes={allTypes}
      />

      {/* Cargando inicial -> skeletons bonitos */}
      {!initialLoaded ? (
        <Grid>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid.Col key={i} span={{ base: 12, xs: 6, md: 4, lg: 3 }}>
              <Card withBorder radius="md" p="xs">
                <Skeleton height={140} mb="sm" />
                <Skeleton height={12} width="60%" mb="xs" />
                <Skeleton height={10} width="40%" mb="xs" />
                <Skeleton height={10} width="30%" />
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Center mih={240}>
          <Stack align="center" gap="xs">
            <Text c="dimmed">No hay servicios para los filtros aplicados.</Text>
            <Button variant="light" onClick={() => { setSearchTerm(""); setTypeFilter("__all__"); setStatus("all"); }}>
              Limpiar filtros
            </Button>
          </Stack>
        </Center>
      ) : (
        <Grid>
          {filtered.map((service, index) => (
            <Grid.Col span={{ base: 12, xs: 6, md: 4, lg: 3 }} key={service._id}>
              <Card
                shadow="sm"
                radius="md"
                withBorder
                style={{ position: "relative" }}
              >
                {/* Imagen principal */}
                {service.images?.length ? (
                  <Card.Section>
                    <AspectRatio ratio={4 / 3}>
                      <Image
                        src={typeof service.images[0] === "string" ? (service.images[0] as string) : undefined}
                        alt={service.name}
                        fit="cover"
                      />
                    </AspectRatio>
                  </Card.Section>
                ) : (
                  <Card.Section>
                    <AspectRatio ratio={4 / 3}>
                      <Center bg="gray.1">
                        <Text c="dimmed" size="sm">Sin imagen</Text>
                      </Center>
                    </AspectRatio>
                  </Card.Section>
                )}

                {/* Estado */}
                <Badge
                  variant={service.isActive ? "filled" : "light"}
                  color={service.isActive ? "green" : "gray"}
                  style={{ position: "absolute", top: rem(8), left: rem(8) }}
                >
                  {service.isActive ? "Activo" : "Inactivo"}
                </Badge>

                {/* Menú de acciones */}
                <Menu shadow="md" width={180} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      style={{ position: "absolute", top: rem(4), right: rem(4) }}
                      aria-label="Acciones"
                    >
                      <BsThreeDotsVertical />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<BsPencil />} onClick={() => { setIsModalOpen(true); setEditingService(service); }}>
                      Editar
                    </Menu.Item>
                    <Menu.Item onClick={() => toggleStatus(service._id)}>
                      {service.isActive ? "Desactivar" : "Activar"}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color="red" leftSection={<BsTrash />} onClick={() => confirmDelete(service._id, index)}>
                      Eliminar
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                {/* Contenido */}
                <Card.Section p="md">
                  <Group justify="space-between" mb={6}>
                    <Text fw={700}>{service.name}</Text>
                    <Tooltip label="Duración" withArrow>
                      <Badge variant="light">{service.duration} min</Badge>
                    </Tooltip>
                  </Group>
                  <Text size="sm" c="dimmed" mb={6}>{service.type}</Text>
                  {service.description && (
                    <Text size="sm" lineClamp={3} c="dimmed" mb="sm">
                      {service.description}
                    </Text>
                  )}
                  <Group justify="space-between">
                    <Badge color="blue" variant="filled">
                      ${service.price.toLocaleString()}
                    </Badge>
                    <Text size="sm" c="dimmed">
                      ID: {service._id.slice(-4)}
                    </Text>
                  </Group>
                </Card.Section>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default AdminServices;
