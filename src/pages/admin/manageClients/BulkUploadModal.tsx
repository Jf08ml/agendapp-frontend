/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import {
  Modal,
  Button,
  Group,
  Text,
  FileButton,
  Stack,
  Alert,
  Progress,
  Table,
  ScrollArea,
  Badge,
  Box,
  Card,
  List,
  ThemeIcon,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  IconUpload,
  IconFileSpreadsheet,
  IconDownload,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconInfoCircle,
} from "@tabler/icons-react";
import * as XLSX from "xlsx";
import { bulkUploadClients } from "../../../services/clientService";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";

interface BulkUploadModalProps {
  opened: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface ClientRow {
  name: string;
  phoneNumber: string;
  email?: string;
  birthDate?: Date | null;
}

interface UploadResult {
  success: Array<{ row: number; name: string; phoneNumber: string }>;
  errors: Array<{ row: number; name: string; phoneNumber: string; error: string }>;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
}

export default function BulkUploadModal({
  opened,
  onClose,
  onUploadComplete,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ClientRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const resetRef = useRef<() => void>(null);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );
  
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  
  const defaultCountry = organization?.default_country || 'CO';

  // Generar ejemplos de números según el país
  const getPhoneExamples = () => {
    switch (defaultCountry) {
      case 'SV': // El Salvador
        return ['7812-3456', '7234-5678', '+503 7123-4567'];
      case 'MX': // México
        return ['55 1234 5678', '33 8765 4321', '+52 55 1234 5678'];
      case 'PE': // Perú
        return ['987 654 321', '912 345 678', '+51 987 654 321'];
      case 'CO': // Colombia
      default:
        return ['300 123 4567', '310 987 6543', '+57 300 123 4567'];
    }
  };
  
  const phoneExamples = getPhoneExamples();

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        // Mapear y validar datos
        const clients: ClientRow[] = jsonData.map((row: any) => ({
          name: row.Nombre || row.nombre || row.Name || row.name || "",
          phoneNumber:
            String(row.Teléfono || row.telefono || row.Phone || row.phone || row.Telefono || ""),
          email: row.Email || row.email || row.Correo || row.correo || "",
          birthDate: row["Fecha de Nacimiento"] || row.birthDate || null,
        }));

        setParsedData(clients);

        if (clients.length === 0) {
          showNotification({
            title: "Archivo vacío",
            message: "El archivo no contiene datos válidos",
            color: "yellow",
          });
        }
      } catch (error) {
        showNotification({
          title: "Error al leer el archivo",
          message: "No se pudo procesar el archivo Excel",
          color: "red",
        });
        console.error(error);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleUpload = async () => {
    if (!organizationId) {
      showNotification({
        title: "Error",
        message: "No se pudo obtener el ID de la organización",
        color: "red",
      });
      return;
    }

    if (parsedData.length === 0) {
      showNotification({
        title: "Sin datos",
        message: "No hay datos para cargar",
        color: "yellow",
      });
      return;
    }

    setUploading(true);
    try {
      const result = await bulkUploadClients(parsedData, organizationId);
      setUploadResult(result);

      if (result.totalSuccess > 0) {
        showNotification({
          title: "Carga completada",
          message: `Se crearon ${result.totalSuccess} clientes exitosamente`,
          color: "green",
        });
        onUploadComplete();
      }

      if (result.totalErrors > 0) {
        showNotification({
          title: "Errores detectados",
          message: `${result.totalErrors} registros no pudieron ser procesados`,
          color: "orange",
        });
      }
    } catch (error) {
      showNotification({
        title: "Error en la carga",
        message: "Ocurrió un error al procesar los clientes",
        color: "red",
      });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        Nombre: "Juan Pérez",
        Teléfono: phoneExamples[0],
        Email: "juan@example.com",
        "Fecha de Nacimiento": "",
      },
      {
        Nombre: "María García",
        Teléfono: phoneExamples[1],
        Email: "maria@example.com",
        "Fecha de Nacimiento": "",
      },
      {
        Nombre: "Carlos Rodríguez",
        Teléfono: phoneExamples[2],
        Email: "",
        "Fecha de Nacimiento": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    
    // Agregar nota informativa según el país
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const noteRow = range.e.r + 2;
    
    const countryNames: Record<string, string> = {
      'CO': 'Colombia',
      'SV': 'El Salvador',
      'MX': 'México',
      'PE': 'Perú',
    };
    
    const countryName = countryNames[defaultCountry] || defaultCountry;
    
    worksheet[XLSX.utils.encode_cell({ r: noteRow, c: 0 })] = {
      v: `NOTA: Los ejemplos son para ${countryName}. Para clientes de otro país, usa el formato internacional completo (ej: +57 300 123 4567)`,
      t: "s"
    };
    
    // Actualizar rango
    if (worksheet['!ref']) {
      const newRange = XLSX.utils.decode_range(worksheet['!ref']);
      newRange.e.r = noteRow;
      worksheet['!ref'] = XLSX.utils.encode_range(newRange);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(workbook, "plantilla_clientes.xlsx");
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setUploadResult(null);
    resetRef.current?.();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Carga Masiva de Clientes"
      size="xl"
      styles={{
        body: { maxHeight: "70vh", overflowY: "auto" },
      }}
    >
      <Stack gap="md">
        {/* Instrucciones y plantilla */}
        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          <Text size="sm" fw={500} mb="xs">
            Instrucciones para la carga:
          </Text>
          <List size="sm" spacing="xs">
            <List.Item>
              Descarga la plantilla de Excel y completa los datos de tus clientes
            </List.Item>
            <List.Item>
              <strong>Nombre</strong> y <strong>Teléfono</strong> son campos obligatorios
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="green" size={20} radius="xl" variant="light">
                  <IconInfoCircle size={14} />
                </ThemeIcon>
              }
            >
              Para clientes de <strong>{defaultCountry === 'SV' ? 'El Salvador' : defaultCountry === 'MX' ? 'México' : defaultCountry === 'PE' ? 'Perú' : 'Colombia'}</strong>: ingresa el teléfono sin prefijo (el sistema lo agregará automáticamente)
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="orange" size={20} radius="xl" variant="light">
                  <IconInfoCircle size={14} />
                </ThemeIcon>
              }
            >
              Para clientes de <strong>otro país</strong>: usa el formato internacional completo (ej: +57 300 123 4567 para Colombia)
            </List.Item>
            <List.Item>Email y Fecha de Nacimiento son opcionales</List.Item>
            <List.Item>
              El sistema detectará automáticamente si un cliente ya existe
            </List.Item>
          </List>
        </Alert>

        <Button
          leftSection={<IconDownload size={16} />}
          variant="light"
          onClick={handleDownloadTemplate}
          fullWidth
        >
          Descargar Plantilla Excel
        </Button>

        {/* Selector de archivo */}
        <Card withBorder p="md">
          <Stack gap="sm">
            <FileButton
              resetRef={resetRef}
              onChange={handleFileSelect}
              accept=".xlsx,.xls"
            >
              {(props) => (
                <Button
                  {...props}
                  leftSection={<IconFileSpreadsheet size={16} />}
                  variant="outline"
                  fullWidth
                >
                  {file ? file.name : "Seleccionar archivo Excel"}
                </Button>
              )}
            </FileButton>

            {parsedData.length > 0 && !uploadResult && (
              <Group justify="space-between">
                <Badge color="blue" size="lg">
                  {parsedData.length} registros detectados
                </Badge>
                <Button
                  onClick={handleUpload}
                  loading={uploading}
                  leftSection={<IconUpload size={16} />}
                  color="green"
                >
                  Cargar Clientes
                </Button>
              </Group>
            )}
          </Stack>
        </Card>

        {/* Barra de progreso */}
        {uploading && (
          <Box>
            <Text size="sm" mb="xs">
              Procesando clientes...
            </Text>
            <Progress value={100} animated />
          </Box>
        )}

        {/* Resultados */}
        {uploadResult && (
          <Card withBorder p="md">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="lg">
                  Resultados de la Carga
                </Text>
                <Group gap="xs">
                  <Badge color="green" size="lg" leftSection={<IconCheck size={12} />}>
                    {uploadResult.totalSuccess} Éxitos
                  </Badge>
                  <Badge color="red" size="lg" leftSection={<IconX size={12} />}>
                    {uploadResult.totalErrors} Errores
                  </Badge>
                </Group>
              </Group>

              {uploadResult.errors.length > 0 && (
                <Box>
                  <Text fw={500} size="sm" mb="xs" c="red">
                    Errores detectados:
                  </Text>
                  <ScrollArea h={200}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Fila</Table.Th>
                          <Table.Th>Nombre</Table.Th>
                          <Table.Th>Teléfono</Table.Th>
                          <Table.Th>Error</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {uploadResult.errors.map((error, idx) => (
                          <Table.Tr key={idx}>
                            <Table.Td>{error.row}</Table.Td>
                            <Table.Td>{error.name}</Table.Td>
                            <Table.Td>{error.phoneNumber}</Table.Td>
                            <Table.Td>
                              <Text size="xs" c="red">
                                {error.error}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Box>
              )}
            </Stack>
          </Card>
        )}

        {/* Botones de acción */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Cerrar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
