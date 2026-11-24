/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { computeServiceDeposit } from "../../../utils/deposit";
import React, { useEffect, useMemo, useState } from "react";
import { ActionIcon, Avatar, Button, Menu, SegmentedControl, Select, Text } from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import {
  IconBrandWhatsapp,
  IconCircleCheck,
  IconCircleOff,
  IconDots,
  IconDownload,
  IconEyeOff,
  IconFileUpload,
  IconPencil,
  IconPhoto,
  IconPlus,
  IconRepeat,
  IconSearch,
  IconStar,
  IconStarOff,
  IconTrash,
} from "@tabler/icons-react";
import { formatCurrency } from "../../../utils/formatCurrency";
import CatalogTabs from "../../../components/catalog/CatalogTabs";
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
import { FOLLOW_UP_SELF } from "./components/followUp";

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
        // "Este mismo servicio" como seguimiento: el servicio todavía no tiene
        // _id, así que se crea sin seguimiento y luego se le asigna el suyo.
        const followUpSelf = service.followUpServiceId === FOLLOW_UP_SELF;
        let created = await createService({
          ...service,
          images: finalImages,
          pdfUrl: finalPdfUrl,
          organizationId,
          ...(followUpSelf && { followUpServiceId: null }),
        } as any);
        if (followUpSelf && created?._id) {
          created =
            (await updateService(created._id, {
              followUpServiceId: created._id,
              followUpDays: service.followUpDays ?? 20,
            })) ?? created;
        }
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

  const confirmDelete = (service: Service) => {
    modals.openConfirmModal({
      title: "Eliminar servicio",
      children: <Text size="sm">¿Seguro que deseas eliminar «{service.name}»? Esta acción no se puede deshacer.</Text>,
      labels: { confirm: "Eliminar servicio", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: () => handleDeleteService(service._id),
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

  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteService(serviceId);
      // Por id (antes por índice de la lista filtrada: con filtros quitaba otro servicio de la vista)
      setServices((prev) => prev.filter((s) => s._id !== serviceId));
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

  // Categorías (service.type) con conteo, para los chips
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      if (status !== "all" && (status === "active" ? !s.isActive : s.isActive)) return;
      const t = s.type || "Sin categoría";
      map.set(t, (map.get(t) ?? 0) + 1);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [services, status]);

  // Tabla agrupada por categoría (en el orden elegido dentro de cada grupo)
  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    filtered.forEach((s) => {
      const t = s.type || "Sin categoría";
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(s);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  }, [filtered]);

  const money = (n: number) => formatCurrency(n, organization?.currency);

  const ServiceActions = ({ service }: { service: Service }) => (
    <Menu position="bottom-end" withinPortal shadow="lg">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={`Acciones de ${service.name}`} onClick={(e) => e.stopPropagation()}>
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => { setIsModalOpen(true); setEditingService(service); }}>
          Editar
        </Menu.Item>
        <Menu.Item leftSection={service.featured ? <IconStarOff size={16} /> : <IconStar size={16} />} onClick={() => toggleFeatured(service._id)}>
          {service.featured ? "Quitar destacado" : "Destacar"}
        </Menu.Item>
        <Menu.Item leftSection={service.isActive ? <IconCircleOff size={16} /> : <IconCircleCheck size={16} />} onClick={() => toggleStatus(service._id)}>
          {service.isActive ? "Desactivar" : "Activar"}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={() => confirmDelete(service)}>
          Eliminar
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  // Publicación: destacado, precio oculto, cotiza por WhatsApp, seguimiento
  const PublishBadges = ({ service }: { service: Service }) => (
    <div className="ag-row" style={{ gap: 4 }}>
      {service.featured && (
        <span className="ag-badge ag-badge--brand">
          <IconStar size={12} stroke={2} /> Destacado
        </span>
      )}
      {service.hidePrice && (
        <span className="ag-badge">
          <IconEyeOff size={12} stroke={2} /> Precio oculto
        </span>
      )}
      {service.ctaMode === "whatsapp_quote" && (
        <span className="ag-badge">
          <IconBrandWhatsapp size={12} stroke={2} /> Cotiza por WhatsApp
        </span>
      )}
      {service.followUpServiceId && (
        <span className="ag-badge">
          <IconRepeat size={12} stroke={2} /> Seguimiento
        </span>
      )}
    </div>
  );

  const StatusBadge = ({ active }: { active: boolean }) =>
    active ? (
      <span className="ag-badge ag-badge--success">
        <IconCircleCheck size={12} stroke={2} /> Activo
      </span>
    ) : (
      <span className="ag-badge">
        <IconCircleOff size={12} stroke={2} /> Inactivo
      </span>
    );

  const PriceCell = ({ service }: { service: Service }) => (
    <div>
      <b className="ag-num">{service.price === 0 ? "Gratis" : money(service.price)}</b>
      {organization?.requireReservationDeposit && service.price > 0 && (
        <div className="ag-subtle">
          Abono {money(computeServiceDeposit(organization, service))}
          {service.deposit && service.deposit.mode !== "inherit" ? " (propio)" : ""}
        </div>
      )}
    </div>
  );

  const thumb = (service: Service) => (
    <Avatar
      src={typeof service.images?.[0] === "string" ? (service.images[0] as string) : undefined}
      alt=""
      size={40}
      radius="md"
      styles={{ root: { background: "var(--surface-hover)", flex: "none" }, placeholder: { color: "var(--ink-subtle)" } }}
    >
      <IconPhoto size={18} stroke={1.75} />
    </Avatar>
  );

  return (
    <div className="ag-stack" style={{ gap: "var(--space-4)", padding: isMobile ? "var(--space-3)" : "var(--space-5) var(--space-6)" }}>
      <CatalogTabs counts={{ services: services.length }} />

      {/* Acciones: una sola en filled */}
      <div className="ag-pagehead">
        <span className="ag-muted" style={{ fontSize: 14 }}>
          {services.length} {services.length === 1 ? "servicio" : "servicios"}
        </span>
        <span className="grow" />
        <Button variant="default" leftSection={<IconDownload size={16} />} onClick={handleExportServices} size={isMobile ? "xs" : "sm"}>
          Exportar
        </Button>
        <Button variant="default" leftSection={<IconFileUpload size={16} />} onClick={() => setIsBulkUploadModalOpen(true)} size={isMobile ? "xs" : "sm"}>
          Cargar desde Excel
        </Button>
        {!isMobile && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => { setIsModalOpen(true); setEditingService(null); }}>
            Nuevo servicio
          </Button>
        )}
      </div>

      {/* Filtros: buscador, chips de categoría, estado y orden */}
      <div className="ag-row" style={{ gap: 8 }}>
        <div className="ag-search" style={{ flex: isMobile ? "1 1 100%" : "0 1 320px" }}>
          <input
            className="ag-input"
            type="search"
            placeholder="Buscar por nombre, categoría o descripción"
            aria-label="Buscar servicios"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
          />
          <span aria-hidden="true">
            <IconSearch size={16} stroke={1.75} />
          </span>
        </div>
        <SegmentedControl
          value={status}
          onChange={(v: any) => setStatus(v)}
          data={[
            { label: "Activos", value: "active" },
            { label: "Inactivos", value: "inactive" },
            { label: "Todos", value: "all" },
          ]}
          size="xs"
        />
        <Select
          aria-label="Ordenar por"
          data={[
            { value: "alpha", label: "Nombre (A–Z)" },
            { value: "price", label: "Precio (mayor)" },
            { value: "duration", label: "Duración (mayor)" },
          ]}
          value={sortBy}
          onChange={(v) => setSortBy((v as any) ?? "alpha")}
          allowDeselect={false}
          size="xs"
          w={160}
        />
      </div>
      {categoryCounts.length > 1 && (
        <div className="ag-tabs" role="tablist" aria-label="Categorías" style={{ scrollbarWidth: "none" }}>
          <button type="button" role="tab" className="ag-chip" aria-selected={!typeFilter || typeFilter === "__all__"} onClick={() => setTypeFilter("__all__")}>
            Todas <span className="count">{categoryCounts.reduce((n, [, c]) => n + c, 0)}</span>
          </button>
          {categoryCounts.map(([t, n]) => (
            <button key={t} type="button" role="tab" className="ag-chip" aria-selected={typeFilter === t} onClick={() => setTypeFilter(t)}>
              {t} <span className="count">{n}</span>
            </button>
          ))}
        </div>
      )}

      <ModalCreateEdit
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingService(null); }}
        service={editingService}
        onSave={handleSaveService}
        allTypes={allTypes}
        allServices={services}
      />

      {!initialLoaded ? (
        <div className="ag-card" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
              <span className="ag-skeleton" style={{ width: 40, height: 40, borderRadius: "var(--radius-md)" }} />
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="ag-skeleton" style={{ width: "40%" }} />
                <span className="ag-skeleton" style={{ width: "25%" }} />
              </span>
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="ag-card">
          <div className="ag-empty">
            <h3>Aún no tienes servicios</h3>
            <p>Crea el primero o cárgalos desde Excel.</p>
            <div className="ag-row" style={{ justifyContent: "center" }}>
              <Button onClick={() => { setIsModalOpen(true); setEditingService(null); }}>Nuevo servicio</Button>
              <Button variant="default" onClick={() => setIsBulkUploadModalOpen(true)}>Cargar desde Excel</Button>
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ag-card">
          <div className="ag-empty">
            <h3>No hay servicios con estos filtros</h3>
            <Button variant="default" onClick={() => { setSearchTerm(""); setTypeFilter("__all__"); setStatus("all"); }}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      ) : isMobile ? (
        // Móvil: lista por categoría
        <div className="ag-stack" style={{ gap: "var(--space-4)" }}>
          {grouped.map(([type, list]) => (
            <div key={type}>
              <div className="ag-slots__group" style={{ margin: "0 0 6px" }}>
                {type} · {list.length}
              </div>
              <div className="ag-card">
                {list.map((service) => (
                  <div
                    key={service._id}
                    className="ag-list-row"
                    style={{ padding: "var(--space-3)", cursor: "pointer", opacity: service.isActive ? 1 : 0.65 }}
                    onClick={() => { setIsModalOpen(true); setEditingService(service); }}
                  >
                    {thumb(service)}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <b style={{ fontSize: 15 }}>{service.name}</b>
                      <span className="ag-subtle ag-num">
                        {service.duration} min · {service.price === 0 ? "Gratis" : money(service.price)}
                      </span>
                      <div className="ag-row" style={{ gap: 4 }}>
                        <StatusBadge active={!!service.isActive} />
                        <PublishBadges service={service} />
                      </div>
                    </div>
                    <ServiceActions service={service} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Botón flotante «Nuevo servicio» sobre la barra inferior */}
          <Button
            size="lg"
            radius="xl"
            leftSection={<IconPlus size={18} />}
            onClick={() => { setIsModalOpen(true); setEditingService(null); }}
            style={{ position: "fixed", right: 16, bottom: "calc(var(--app-shell-footer-offset, 0px) + 16px)", zIndex: 150, boxShadow: "var(--shadow-lg)" }}
          >
            Nuevo servicio
          </Button>
        </div>
      ) : (
        // Escritorio: tabla agrupada por categoría
        <div className="ag-card" style={{ overflowX: "auto" }}>
          <table className="ag-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Servicio</th>
                <th className="num">Duración</th>
                <th className="num">Precio</th>
                <th>Publicación</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            {grouped.map(([type, list]) => (
              <tbody key={type}>
                <tr>
                  <td colSpan={6} style={{ background: "var(--surface-muted)", padding: "8px var(--space-4)" }}>
                    <span className="ag-slots__group" style={{ margin: 0 }}>
                      {type} · {list.length}
                    </span>
                  </td>
                </tr>
                {list.map((service) => (
                  <tr
                    key={service._id}
                    style={{ cursor: "pointer", opacity: service.isActive ? 1 : 0.65 }}
                    onClick={() => { setIsModalOpen(true); setEditingService(service); }}
                  >
                    <td>
                      <div className="ag-who">
                        {thumb(service)}
                        <div style={{ minWidth: 0 }}>
                          <b>{service.name}</b>
                          {service.description && (
                            <span style={{ display: "block", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {service.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="num">{service.duration} min</td>
                    <td className="num">
                      <PriceCell service={service} />
                    </td>
                    <td>
                      <PublishBadges service={service} />
                    </td>
                    <td>
                      <StatusBadge active={!!service.isActive} />
                    </td>
                    <td style={{ width: 48, textAlign: "right" }}>
                      <ServiceActions service={service} />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      <BulkUploadModal
        opened={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onUploadComplete={loadServices}
        existingServices={services}
      />
    </div>
  );
};

export default AdminServices;
