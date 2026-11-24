import React, { useMemo, useState } from "react";
import { ActionIcon, Alert, Box, Group, Pagination, Select, Text } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { useMediaQuery } from "@mantine/hooks";
import { Client } from "../../../services/clientService";
import ClientListItem from "./ClientListItem";
import ClientDetailDrawer from "./ClientDetailDrawer";
import type { ClientStat } from "./clientSegments";

interface ClientListProps {
  clients: Client[];
  /** Cifras por cliente (null mientras cargan). */
  stats?: Record<string, ClientStat> | null;
  error: string | null;
  onRegisterService: (clientId: string) => void;
  onReferral: (clientId: string) => void;
  onDecrementLoyalty: (clientId: string, kind: "service" | "referral") => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onForceDeleteClient: (id: string) => void;
  onMergeClient: (client: Client) => void;
  onResetClientLoyalty: (clientId: string) => void;
  onClientUpdated: (updated: Client) => void;
}

const ClientList: React.FC<ClientListProps> = ({
  clients,
  stats = null,
  error,
  onRegisterService,
  onReferral,
  onDecrementLoyalty,
  onEditClient,
  onDeleteClient,
  onForceDeleteClient,
  onMergeClient,
  onResetClientLoyalty,
  onClientUpdated,
}) => {
  const isMobile = useMediaQuery("(max-width: 48rem)") ?? false;
  const loyaltyEnabled = useSelector((s: RootState) => s.organization.organization?.showLoyaltyProgram !== false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const totalPages = Math.ceil(clients.length / pageSize);
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, clients.length);

  const displayedClients = useMemo(
    () => clients.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [clients, currentPage, pageSize]
  );

  // Derivado del mismo array que ve la lista: cualquier refetch/mutación se
  // refleja de inmediato en el Drawer sin necesitar una copia local aparte.
  const selectedClient = useMemo(
    () => clients.find((c) => c._id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  return (
    <Box>
      {error && (
        <Alert color="red" mb="sm" title="Error">
          {error}
        </Alert>
      )}

      {/* Conteo, tamaño de página y paginación (en móvil: «‹ 1 de 32 ›») */}
      <Group justify="space-between" align="center" mb="xs" wrap={isMobile ? "nowrap" : "wrap"} gap="xs">
        <Group gap="xs" align="center" wrap="nowrap">
          <Text size="sm" c="var(--ink-muted)" style={{ whiteSpace: "nowrap" }}>
            {isMobile
              ? `${clients.length === 0 ? 0 : from}–${to} de ${clients.length}`
              : `Mostrando ${clients.length === 0 ? 0 : from}–${to} de ${clients.length}`}
          </Text>
          <Select
            aria-label="Clientes por página"
            data={[
              { value: "5", label: "5" },
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "50", label: "50" },
            ]}
            value={pageSize.toString()}
            onChange={(value) => {
              setPageSize(Number(value));
              setCurrentPage(1);
            }}
            allowDeselect={false}
            w={isMobile ? 76 : 120}
            size={isMobile ? "xs" : "sm"}
          />
        </Group>
        {isMobile ? (
          <Group gap={4} align="center" wrap="nowrap">
            <ActionIcon
              variant="default"
              aria-label="Página anterior"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Text size="sm" className="ag-num" style={{ whiteSpace: "nowrap" }}>
              {currentPage} de {Math.max(totalPages, 1)}
            </Text>
            <ActionIcon
              variant="default"
              aria-label="Página siguiente"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(Math.max(totalPages, 1), p + 1))}
            >
              <IconChevronRight size={16} />
            </ActionIcon>
          </Group>
        ) : (
          <Pagination total={Math.max(totalPages, 1)} value={currentPage} onChange={setCurrentPage} />
        )}
      </Group>

      {displayedClients.length === 0 ? (
        <div className="ag-card">
          <div className="ag-empty">
            <h3>No hay clientes para mostrar</h3>
          </div>
        </div>
      ) : isMobile ? (
        // Móvil: filas compactas
        <div className="ag-card" style={{ padding: "0 var(--space-1)" }}>
          {displayedClients.map((client) => (
            <ClientListItem
              key={client._id}
              client={client}
              isMobile
              stat={stats?.[client._id]}
              showStats={!!stats}
              selected={client._id === selectedClientId}
              onOpenDetail={setSelectedClientId}
              onRegisterService={onRegisterService}
              onReferral={onReferral}
              onEditClient={onEditClient}
            />
          ))}
        </div>
      ) : (
        // Escritorio: tabla limpia (ClientesPanel), fila seleccionada en brand-soft
        <div className="ag-card" style={{ overflowX: "auto" }}>
          <table className="ag-table">
            <thead>
              <tr>
                <th>Cliente</th>
                {stats && <th>Última visita</th>}
                {stats && <th className="num">Visitas</th>}
                {stats && <th className="num">Total gastado</th>}
                {loyaltyEnabled && <th className="num">Servicios</th>}
                {loyaltyEnabled && <th className="num">Referidos</th>}
                {loyaltyEnabled && <th>Fidelidad</th>}
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {displayedClients.map((client) => (
                <ClientListItem
                  key={client._id}
                  client={client}
                  isMobile={false}
                  stat={stats?.[client._id]}
                  showStats={!!stats}
                  selected={client._id === selectedClientId}
                  onOpenDetail={setSelectedClientId}
                  onRegisterService={onRegisterService}
                  onReferral={onReferral}
                  onEditClient={onEditClient}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Group justify="space-between" align="center" mt="md" wrap="wrap">
        <Text size="sm" c="var(--ink-muted)">
          Mostrando {clients.length === 0 ? 0 : from}–{to} de {clients.length}
        </Text>
      </Group>

      <ClientDetailDrawer
        opened={!!selectedClient}
        onClose={() => setSelectedClientId(null)}
        client={selectedClient}
        onRegisterService={onRegisterService}
        onReferral={onReferral}
        onDecrementLoyalty={onDecrementLoyalty}
        onEditClient={onEditClient}
        onMergeClient={onMergeClient}
        onDeleteClient={onDeleteClient}
        onForceDeleteClient={onForceDeleteClient}
        onResetClientLoyalty={onResetClientLoyalty}
        onClientUpdated={onClientUpdated}
      />
    </Box>
  );
};

export default ClientList;
