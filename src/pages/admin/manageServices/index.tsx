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
  Table,
  Avatar,
  TextInput,
  Badge,
  Tooltip,
  SegmentedControl,
  Select,
  Skeleton,
  Center,
  Stack,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import {
  BsTrash,
  BsPencil,
  BsSearch,
  BsImage,
  BsPlusCircle,
  BsCheckCircle,
  BsXCircle,
  BsDownload,
  BsStar,
  BsStarFill,
} from "react-icons/bs";
import { IconFileUpload } from "@tabler/icons-react";
import { showNotification } from "@mantine/notifications";
import {
  createService,
  updateService,
  deleteService,
  getServicesByOrganizationId,
  Service,
} from "../../../services/serviceService";
import ModalCreateEdit from "./components/ModalCreateEdit";
import BulkUploadModal from "./components/BulkUploadModal";
import { uploadImage } from "../../../services/imageService";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { modals } from "@mantine/modals";
import { exportServicesToExcel, downloadEmptyTemplate } from "./utils/exportToExcel";

const AdminServices: React.FC = () => {
  const isMobile = useMediaQuery("(max-width: 48rem)");
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchTerm, 250);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"alpha" | "price" | "duration">("alpha");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [, setLoading] = useState(false);

  const organizationId = useSelector((state: RootState) => state.auth.organizationId);
  const organization = useSelector((state: RootState) => state.organization.organization);

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

      // El PDF llega como File (nuevo/reemplazado), string (ya subido) o null (sin PDF)
      const pdfCandidate = service.pdfUrl as unknown as File | string | null;
      const finalPdfUrl =
        pdfCandidate && typeof pdfCandidate !== "string"
          ? (await uploadImage(pdfCandidate)) ?? null
          : pdfCandidate;

      if (service._id) {
        const updated = await updateService(service._id, {
          ...service,
          images: finalImages,
          pdfUrl: finalPdfUrl,
        });
        updatedServices = services.map((s) => (s._id === service._id ? updated : s));
      } else {
        const created = await createService({
          ...service,
          images: finalImages,
          pdfUrl: finalPdfUrl,
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
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || "Error al guardar el servicio";
      showNotification({
        title: "Error",
        message,
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

  const handleExportServices = () => {
    if (services.length === 0) {
      showNotification({
        title: "Sin servicios",
        message: "Descargar plantilla vacía para empezar.",
        color: "blue",
      });
      downloadEmptyTemplate(organization?.name || "Servicios");
    } else {
      exportServicesToExcel(services, organization?.name || "Servicios");
      showNotification({
        title: "Exportación completada",
        message: `Se descargaron ${services.length} servicio(s)`,
        color: "green",
      });
    }
  };

  const handleDeleteService = async (serviceId: string, index: number) => {
    try {
      await deleteService(serviceId);
      setServices((prev) => prev.filter((_, i) => i !== index));
      showNotification({ title: "Servicio eliminado", message: "Se eliminó correctamente", color: "green" });
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || error.message || "No se pudo eliminar el servicio";
      showNotification({ title: "Error", message, color: "red" });
    }
  };

  const toggleFeatured = async (serviceId: string) => {
    try {
      const current = services.find((s) => s._id === serviceId);
      if (!current) return;
      const updated = await updateService(serviceId, {
        ...current,
        images: current.images?.filter((img): img is string => typeof img === "string"),
        featured: !current.featured,
      });
      setServices((prev) => prev.map((s) => (s._id === serviceId ? (updated as Service) : s)));
      showNotification({
        title: updated?.featured ? "Servicio destacado" : "Destacado removido",
        message: updated?.featured
          ? "Se mostrará de primero en la página pública y la reserva en línea"
          : "El servicio vuelve a su posición normal",
        color: "yellow",
      });
    } catch (error) {
      console.error(error);
      showNotification({ title: "Error", message: "No se pudo actualizar el destacado", color: "red" });
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

  const rows = filtered.map((service, index) => (
    <Table.Tr key={service._id} style={{ opacity: service.isActive ? 1 : 0.6 }}>
      <Table.Td>
        <Group gap="sm" wrap="nowrap">
          <Avatar
            src={typeof service.images?.[0] === "string" ? (service.images[0] as string) : undefined}
            alt={service.name}
            size={44}
            radius="sm"
            color="gray"
          >
            <BsImage size={18} />
          </Avatar>
          <Box>
            <Group gap={6} wrap="nowrap">
              <Text fw={600} size="sm" lineClamp={1}>
                {service.name}
              </Text>
              {!service.isActive && (
                <Badge color="gray" size="xs" variant="light">
                  Inactivo
                </Badge>
              )}
              {service.featured && (
                <Badge color="yellow" size="xs" variant="light" leftSection={<BsStarFill size={9} />}>
                  Destacado
                </Badge>
              )}
            </Group>
            {service.description && (
              <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: 320 }}>
                {service.description}
              </Text>
            )}
          </Box>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge variant="dot" color="violet" size="sm">
          {service.type}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{service.duration} min</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" fw={600}>
          {service.price === 0 ? "Gratis" : `$${service.price.toLocaleString()}`}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap={6} wrap="nowrap">
          <Tooltip label={service.featured ? "Quitar destacado" : "Marcar como destacado"} withArrow>
            <ActionIcon
              variant={service.featured ? "filled" : "light"}
              color="yellow"
              onClick={() => toggleFeatured(service._id)}
            >
              {service.featured ? <BsStarFill size={14} /> : <BsStar size={14} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label={service.isActive ? "Desactivar" : "Activar"} withArrow>
            <ActionIcon
              variant="light"
              color={service.isActive ? "orange" : "green"}
              onClick={() => toggleStatus(service._id)}
            >
              {service.isActive ? <BsXCircle size={14} /> : <BsCheckCircle size={14} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Editar" withArrow>
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => { setIsModalOpen(true); setEditingService(service); }}
            >
              <BsPencil size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Eliminar" withArrow>
            <ActionIcon variant="light" color="red" onClick={() => confirmDelete(service._id, index)}>
              <BsTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const Toolbar = (
    <Card withBorder radius="md" p="md" mb="md" shadow="sm">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Title order={isMobile ? 3 : 2}>Administrar Servicios</Title>
          <Group gap="xs">
            <Tooltip label="Descargar plantilla con servicios">
              <Button
                leftSection={<BsDownload size={18} />}
                onClick={handleExportServices}
                variant="light"
                color="green"
                size={isMobile ? "sm" : "md"}
              >
                {isMobile ? "Exportar" : "Descargar Servicios"}
              </Button>
            </Tooltip>
            <Tooltip label="Carga masiva desde Excel">
              <Button
                leftSection={<IconFileUpload size={18} />}
                onClick={() => setIsBulkUploadModalOpen(true)}
                variant="light"
                color="blue"
                size={isMobile ? "sm" : "md"}
              >
                {isMobile ? "Excel" : "Carga masiva"}
              </Button>
            </Tooltip>
            <Button 
              leftSection={<BsPlusCircle size={18} />}
              onClick={() => { setIsModalOpen(true); setEditingService(null); }}
              size={isMobile ? "sm" : "md"}
            >
              {isMobile ? "Nuevo" : "Nuevo servicio"}
            </Button>
          </Group>
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
        allServices={services}
      />

      {/* Cargando inicial -> skeletons bonitos */}
      {!initialLoaded ? (
        <Card withBorder radius="md" p="md">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={40} mb="sm" />
          ))}
        </Card>
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
        <Card withBorder radius="md" p={0}>
          <Table.ScrollContainer minWidth={720}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Servicio</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Duración</Table.Th>
                  <Table.Th>Precio</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{rows}</Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      <ModalCreateEdit
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingService(null); }}
        onSave={handleSaveService}
        allTypes={allTypes}
        allServices={services}
        service={editingService}
      />

      <BulkUploadModal
        opened={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onUploadComplete={loadServices}
      />
    </Box>
  );
};

export default AdminServices;
