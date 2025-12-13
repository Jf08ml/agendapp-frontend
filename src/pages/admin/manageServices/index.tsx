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
  BsPlusCircle,
  BsCheckCircle,
  BsXCircle,
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
    <Card withBorder radius="md" p="md" mb="md" shadow="sm">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Title order={isMobile ? 3 : 2}>Administrar Servicios</Title>
          <Button 
            leftSection={<BsPlusCircle size={18} />}
            onClick={() => { setIsModalOpen(true); setEditingService(null); }}
            size={isMobile ? "sm" : "md"}
          >
            Nuevo servicio
          </Button>
        </Group>

        <Group wrap="wrap" gap="sm" align="end">
          <TextInput
            leftSection={<BsSearch />}
            placeholder="Buscar por nombre, tipo o descripción…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            style={{ flex: isMobile ? '1 1 100%' : '1 1 280px', minWidth: isMobile ? '100%' : 240 }}
          />

          <Select
            label="Tipo"
            data={[{ value: "__all__", label: "Todos los tipos" }, ...allTypes.map((t) => ({ value: t, label: t }))]}
            value={typeFilter ?? "__all__"}
            onChange={(v) => setTypeFilter(v ?? "__all__")}
            clearable={false}
            w={isMobile ? "48%" : 180}
          />

          <Box style={{ flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
            <Text size="xs" fw={500} mb={4}>Estado</Text>
            <SegmentedControl
              value={status}
              onChange={(v: any) => setStatus(v)}
              data={[
                { label: "Todos", value: "all" },
                { label: "Activos", value: "active" },
                { label: "Inactivos", value: "inactive" },
              ]}
              size={isMobile ? "xs" : "sm"}
              fullWidth={isMobile}
            />
          </Box>

          <Select
            label="Ordenar por"
            data={[
              { value: "alpha", label: "Nombre (A–Z)" },
              { value: "price", label: "Precio (mayor)" },
              { value: "duration", label: "Duración (mayor)" },
            ]}
            value={sortBy}
            onChange={(v) => setSortBy((v as any) ?? "alpha")}
            w={isMobile ? "48%" : 180}
          />
        </Group>
      </Stack>
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
                style={{ 
                  position: "relative",
                  opacity: service.isActive ? 1 : 0.7,
                  borderColor: service.isActive ? undefined : 'var(--mantine-color-gray-4)',
                  transition: 'all 0.2s ease',
                }}
                className={service.isActive ? '' : 'inactive-service'}
              >
                {/* Imagen principal */}
                {service.images?.length ? (
                  <Card.Section>
                    <AspectRatio ratio={4 / 3}>
                      <Image
                        src={typeof service.images[0] === "string" ? (service.images[0] as string) : undefined}
                        alt={service.name}
                        fit="cover"
                        style={{ filter: service.isActive ? 'none' : 'grayscale(50%)' }}
                      />
                    </AspectRatio>
                  </Card.Section>
                ) : (
                  <Card.Section>
                    <AspectRatio ratio={4 / 3}>
                      <Center bg={service.isActive ? "gray.1" : "gray.2"}>
                        <Text c="dimmed" size="sm">Sin imagen</Text>
                      </Center>
                    </AspectRatio>
                  </Card.Section>
                )}

                {/* Estado */}
                <Badge
                  variant="filled"
                  color={service.isActive ? "green" : "gray"}
                  leftSection={service.isActive ? <BsCheckCircle size={12} /> : <BsXCircle size={12} />}
                  style={{ position: "absolute", top: rem(8), left: rem(8) }}
                  size="md"
                >
                  {service.isActive ? "Activo" : "Inactivo"}
                </Badge>

                {/* Menú de acciones */}
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon
                      variant="filled"
                      color="gray"
                      style={{ position: "absolute", top: rem(8), right: rem(8) }}
                      aria-label="Acciones"
                      size="lg"
                    >
                      <BsThreeDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Acciones del servicio</Menu.Label>
                    <Menu.Item 
                      leftSection={<BsPencil />} 
                      onClick={() => { setIsModalOpen(true); setEditingService(service); }}
                    >
                      Editar servicio
                    </Menu.Item>
                    <Menu.Item 
                      leftSection={service.isActive ? <BsXCircle /> : <BsCheckCircle />}
                      onClick={() => toggleStatus(service._id)}
                      color={service.isActive ? "orange" : "green"}
                    >
                      {service.isActive ? "Desactivar" : "Activar"}
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item 
                      color="red" 
                      leftSection={<BsTrash />} 
                      onClick={() => confirmDelete(service._id, index)}
                    >
                      Eliminar servicio
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>

                {/* Contenido */}
                <Card.Section p="md">
                  <Group justify="space-between" mb={8}>
                    <Text fw={700} size="lg" lineClamp={1}>{service.name}</Text>
                    <Tooltip label="Duración del servicio" withArrow>
                      <Badge variant="light" color="blue" size="lg">
                        {service.duration} min
                      </Badge>
                    </Tooltip>
                  </Group>
                  
                  <Group mb={8}>
                    <Badge variant="dot" color="violet" size="md">
                      {service.type}
                    </Badge>
                  </Group>

                  {service.description && (
                    <Text size="sm" lineClamp={2} c="dimmed" mb="md" style={{ minHeight: 40 }}>
                      {service.description}
                    </Text>
                  )}
                  
                  <Group justify="space-between" align="center" mt="md">
                    <Badge color={service.isActive ? "teal" : "gray"} variant="light" size="xl" radius="md">
                      ${service.price.toLocaleString()}
                    </Badge>
                    <Group gap={6}>
                      <Tooltip label="Editar" withArrow>
                        <ActionIcon 
                          variant="light" 
                          color="blue"
                          onClick={() => { setIsModalOpen(true); setEditingService(service); }}
                        >
                          <BsPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Eliminar" withArrow>
                        <ActionIcon 
                          variant="light" 
                          color="red"
                          onClick={() => confirmDelete(service._id, index)}
                        >
                          <BsTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
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
