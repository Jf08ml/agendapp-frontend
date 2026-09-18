import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  Center,
  Group,
  Loader,
  Pagination,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { useSelector } from "react-redux";
import { BsSearch } from "react-icons/bs";
import { RootState } from "../../../app/store";
import { selectOrganization } from "../../../features/organization/sliceOrganization";
import { getOrgFollowUps, OrgFollowUps, OrgFollowUpView } from "../../../services/clientService";
import { PendingFollowUpCard, ProcessedFollowUpCard } from "./FollowUpCards";

const PAGE_SIZE = 25;

const EMPTY_MESSAGES: Record<OrgFollowUpView, string> = {
  pending: "No hay recordatorios de seguimiento programados con estos filtros.",
  sent: "Todavía no se ha enviado ningún recordatorio de seguimiento con estos filtros.",
  not_sent: "No hay recordatorios de seguimiento sin enviar con estos filtros.",
};

// Lista general (toda la organización) de recordatorios de seguimiento entre servicios.
// La misma información que la pestaña "Seguimientos" del detalle de un cliente, pero de todos.
const FollowUpsTab = () => {
  const organization = useSelector((state: RootState) => selectOrganization(state));
  const timezone = organization?.timezone || "America/Bogota";
  const isMobile = useMediaQuery("(max-width: 48rem)") ?? false;

  const [view, setView] = useState<OrgFollowUpView>("pending");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebouncedValue(searchTerm, 400);
  const [page, setPage] = useState(1);

  const [data, setData] = useState<OrgFollowUps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getOrgFollowUps({ view, serviceId, search: debouncedSearch.trim(), page, limit: PAGE_SIZE })
      .then((result) => {
        if (!cancelled) setData(result ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los recordatorios de seguimiento.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [view, serviceId, debouncedSearch, page]);

  // Cambiar vista o filtros siempre vuelve a la primera página
  const handleViewChange = (value: string) => {
    setView(value as OrgFollowUpView);
    setPage(1);
  };
  const handleServiceChange = (value: string | null) => {
    setServiceId(value);
    setPage(1);
  };
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  // Contador como texto (no Badge): en móvil un Badge se comprime y el número queda recortado
  const countLabel = (label: string, count: number | undefined) => (
    <Group gap={4} wrap="nowrap" justify="center">
      <span>{label}</span>
      {count !== undefined && (
        <Text span size="xs" c="dimmed" fw={700}>
          {count}
        </Text>
      )}
    </Group>
  );

  if (loading && !data && !error) {
    return (
      <Center py="xl">
        <Loader size="md" />
      </Center>
    );
  }

  if (error && !data) {
    return (
      <Alert color="red" title="Error">
        {error}
      </Alert>
    );
  }

  if (data && !data.organizationHasRules) {
    return (
      <Card withBorder radius="md" p="lg">
        <Text c="dimmed" ta="center">
          Tu organización no tiene ningún servicio con recordatorio de seguimiento configurado. Puedes
          activarlo editando un servicio en «Gestionar servicios».
        </Text>
      </Card>
    );
  }

  const counts = data?.counts;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const items = view === "pending" ? data?.pending ?? [] : data?.processed ?? [];

  return (
    <Stack gap="md">
      <Card withBorder radius="md" p="md">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Recordatorios automáticos de WhatsApp que se envían unos días después de un servicio (por ejemplo,
            un retoque) a los clientes que no han vuelto a agendarlo.
          </Text>

          <SegmentedControl
            fullWidth={isMobile}
            size={isMobile ? "xs" : "sm"}
            value={view}
            onChange={handleViewChange}
            data={[
              { value: "pending", label: countLabel("Programados", counts?.pending) },
              { value: "sent", label: countLabel("Enviados", counts?.sent) },
              { value: "not_sent", label: countLabel("No enviados", counts?.notSent) },
            ]}
          />

          <Group gap="sm" grow={isMobile} align="flex-end">
            <Select
              placeholder="Todos los servicios"
              aria-label="Filtrar por servicio"
              data={(data?.services ?? []).map((s) => ({ value: s._id, label: s.name }))}
              value={serviceId}
              onChange={handleServiceChange}
              clearable
              searchable
              w={isMobile ? "100%" : 300}
            />
            <TextInput
              leftSection={<BsSearch />}
              placeholder={isMobile ? "Buscar cliente…" : "Buscar por nombre o teléfono…"}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.currentTarget.value)}
              w={isMobile ? "100%" : 320}
              radius="md"
            />
          </Group>

          {view === "pending" && (
            <Text size="xs" c="dimmed">
              No incluye citas antiguas que ya vencieron (pasaron más de 30 días de la fecha proyectada).
            </Text>
          )}
        </Stack>
      </Card>

      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      <Card withBorder radius="md" p="md">
        <Box style={{ opacity: loading ? 0.6 : 1, transition: "opacity 120ms" }}>
          {items.length === 0 ? (
            <Text c="dimmed" ta="center" py="md">
              {EMPTY_MESSAGES[view]}
            </Text>
          ) : (
            <Stack gap="sm">
              <Group justify="space-between" align="center" wrap="wrap">
                <Text size="sm" c="dimmed">
                  Mostrando {from}–{to} de {total}
                </Text>
                <Pagination total={totalPages} value={page} onChange={setPage} size={isMobile ? "sm" : "md"} />
              </Group>

              {view === "pending"
                ? data?.pending.map((entry) => (
                    <PendingFollowUpCard key={entry.appointmentId} entry={entry} timezone={timezone} showClient />
                  ))
                : data?.processed.map((entry) => (
                    <ProcessedFollowUpCard key={entry.appointmentId} entry={entry} timezone={timezone} showClient />
                  ))}

              {totalPages > 1 && (
                <Group justify="flex-end">
                  <Pagination total={totalPages} value={page} onChange={setPage} size={isMobile ? "sm" : "md"} />
                </Group>
              )}
            </Stack>
          )}
        </Box>

        {view !== "pending" && counts && counts.legacy > 0 && (
          <Text size="xs" c="dimmed" mt="md">
            Hay {counts.legacy} recordatorios antiguos, procesados antes de que se guardara el resultado, que no se
            muestran aquí porque no se sabe si llegaron a enviarse.
          </Text>
        )}
      </Card>
    </Stack>
  );
};

export default FollowUpsTab;
