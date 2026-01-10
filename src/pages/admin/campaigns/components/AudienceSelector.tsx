// pages/admin/campaigns/components/AudienceSelector.tsx
import { useState, useEffect } from "react";
import {
  Box,
  TextInput,
  Title,
  Tabs,
  List,
  Checkbox,
  Paper,
  Badge,
  Alert,
  Loader,
  Text,
  Textarea,
  Group,
  Stack,
  Center,
  Button,
} from "@mantine/core";
import { BsSearch } from "react-icons/bs";
import type { CampaignRecipient, AudienceSuggestion } from "../../../../types/campaign";
import campaignService from "../../../../services/campaignService";
import { parsePhoneText, validatePhoneList, formatPhoneDisplay } from "../../../../utils/campaignValidations";

interface AudienceSelectorProps {
  orgId: string;
  recipients: CampaignRecipient[];
  selectedClientIds: string[];
  rawPhones: string;
  onUpdate: (updates: any) => void;
}

export default function AudienceSelector({
  orgId,
  recipients,
  selectedClientIds,
  rawPhones,
  onUpdate,
}: AudienceSelectorProps) {
  const [tab, setTab] = useState<string | null>("clients");
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<AudienceSuggestion[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalClients, setTotalClients] = useState(0);

  // Cargar clientes al montar o buscar
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const result = await campaignService.getAudienceSuggestions(
          orgId,
          clientSearch,
          50,
          page
        );
        
        if (page === 1) {
          setClients(result.clients || []);
        } else {
          setClients((prev) => [...prev, ...(result.clients || [])]);
        }
        
        setHasMore(result.pagination?.hasMore || false);
        setTotalClients(result.pagination?.total || 0);
      } catch (error) {
        console.error("Error cargando clientes:", error);
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    if (orgId) {
      fetchClients();
    }
  }, [orgId, clientSearch, page]);

  // Resetear página cuando cambia la búsqueda
  useEffect(() => {
    setPage(1);
  }, [clientSearch]);

  const handleToggleClient = (client: AudienceSuggestion) => {
    const isSelected = selectedClientIds.includes(client.id);

    if (isSelected) {
      // Deseleccionar
      onUpdate({
        selectedClientIds: selectedClientIds.filter((id) => id !== client.id),
        recipients: recipients.filter((r) => r.phone !== client.phone),
      });
    } else {
      // Seleccionar
      onUpdate({
        selectedClientIds: [...selectedClientIds, client.id],
        recipients: [
          ...recipients,
          { phone: client.phone, name: client.name },
        ],
      });
    }
  };

  const handleSelectAll = async () => {
    try {
      setLoadingClients(true);
      const result = await campaignService.getAllClientsForCampaign(orgId, clientSearch);
      
      const allClientIds = result.clients.map((c) => c.id);
      const allRecipients = result.clients.map((c) => ({ phone: c.phone, name: c.name }));
      
      onUpdate({
        selectedClientIds: allClientIds,
        recipients: allRecipients,
      });
      
      // Mostrar mensaje de confirmación
      alert(`✅ ${result.total} clientes seleccionados`);
    } catch (error) {
      console.error("Error seleccionando todos:", error);
      alert("Error al seleccionar todos los clientes");
    } finally {
      setLoadingClients(false);
    }
  };

  const handleDeselectAll = () => {
    onUpdate({
      selectedClientIds: [],
      recipients: [],
    });
  };

  const handleImportPhones = (text: string) => {
    onUpdate({ rawPhones: text });

    const phones = parsePhoneText(text);
    const validation = validatePhoneList(phones);

    // Actualizar recipients con números normalizados
    const newRecipients = validation.normalized.map((phone) => ({
      phone,
    }));

    onUpdate({
      recipients: newRecipients,
      rawPhones: text,
    });
  };

  const stats = {
    total: recipients.length,
    // TODO: agregar lógica real de opt-in cuando esté disponible
    withConsent: recipients.length,
    withoutConsent: 0,
  };

  return (
    <Box>
      <Title order={3} mb="md">
        📋 Selecciona tu audiencia
      </Title>

      <Tabs value={tab} onChange={setTab} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="clients">Clientes Existentes</Tabs.Tab>
          <Tabs.Tab value="import">Importar Lista</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="clients" pt="md">
          <Group justify="space-between" mb="md">
            <TextInput
              placeholder="🔍 Buscar por nombre o teléfono..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.currentTarget.value)}
              style={{ flex: 1 }}
              leftSection={<BsSearch />}
            />
            <Group gap="xs">
              {selectedClientIds.length > 0 && (
                <Badge color="blue" size="lg">{selectedClientIds.length} seleccionados</Badge>
              )}
              {(clients.length > 0 || totalClients > 0) && (
                selectedClientIds.length === totalClients && totalClients > 0 ? (
                  <Button variant="light" size="xs" onClick={handleDeselectAll}>
                    Deseleccionar todos
                  </Button>
                ) : (
                  <Button 
                    variant="light" 
                    size="xs" 
                    onClick={handleSelectAll} 
                    loading={loadingClients && selectedClientIds.length === 0}
                  >
                    Seleccionar todos {totalClients > 0 ? `(${totalClients})` : ''}
                  </Button>
                )
              )}
            </Group>
          </Group>

          {totalClients > 0 && (
            <Text size="sm" c="dimmed" mb="sm">
              Mostrando {clients.length} de {totalClients} clientes
            </Text>
          )}

          {loadingClients ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <Paper withBorder style={{ maxHeight: 400, overflow: "auto" }}>
              <List spacing={0} center>
                {clients.length === 0 ? (
                  <List.Item>
                    <Text size="sm" c="dimmed">
                      No se encontraron clientes
                    </Text>
                    <Text size="xs" c="dimmed">
                      Intenta con otra búsqueda o importa teléfonos manualmente
                    </Text>
                  </List.Item>
                ) : (
                  clients.map((client) => (
                    <List.Item
                      key={client.id}
                      onClick={() => handleToggleClient(client)}
                      style={{ cursor: "pointer", padding: "8px 12px" }}
                    >
                      <Group>
                        <Checkbox
                          checked={selectedClientIds.includes(client.id)}
                          onChange={() => handleToggleClient(client)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Stack gap={0}>
                          <Text size="sm" fw={500}>{client.name}</Text>
                          <Text size="xs" c="dimmed">{formatPhoneDisplay(client.phone)}</Text>
                        </Stack>
                      </Group>
                    </List.Item>
                  ))
                )}
              </List>
              
              {hasMore && (
                <Center p="md">
                  <Button 
                    variant="subtle" 
                    onClick={() => setPage((p) => p + 1)}
                    loading={loadingClients}
                  >
                    Cargar más clientes
                  </Button>
                </Center>
              )}
            </Paper>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="import" pt="md">
          <Textarea
            placeholder={`Pega aquí tu lista de teléfonos:\n573001234567\n573009876543\n+57 300 111 2222\n\n(Separados por comas, saltos de línea o punto y coma)`}
            value={rawPhones}
            onChange={(e) => handleImportPhones(e.currentTarget.value)}
            minRows={10}
            autosize
          />

          {rawPhones && (
            <Alert color="blue" mt="md">
              Se normalizarán y validarán automáticamente al avanzar
            </Alert>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Resumen de audiencia */}
      <Paper withBorder p="md" bg="gray.0">
        <Title order={4} mb="sm">
          📊 Resumen
        </Title>
        
        <Group gap="sm">
          <Badge size="lg" color="blue">Total: {stats.total}</Badge>
          <Badge size="lg" color="green">Con opt-in: {stats.withConsent}</Badge>
          {stats.withoutConsent > 0 && (
            <Badge size="lg" color="orange">
              Sin opt-in: {stats.withoutConsent}
            </Badge>
          )}
        </Group>

        {stats.total === 0 && (
          <Alert color="yellow" mt="md">
            Aún no has seleccionado ningún destinatario
          </Alert>
        )}
      </Paper>
    </Box>
  );
}
