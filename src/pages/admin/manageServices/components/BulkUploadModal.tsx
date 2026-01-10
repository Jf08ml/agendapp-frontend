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
import { bulkUploadServices } from "../../../../services/serviceService";
import { useSelector } from "react-redux";
import { RootState } from "../../../../app/store";

interface BulkUploadModalProps {
  opened: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface ServiceRow {
  name: string;
  type?: string;
  description?: string;
  price: number;
  duration: number;
  hidePrice?: boolean;
  maxConcurrentAppointments?: number;
}

interface UploadResult {
  success: Array<{ row: number; name: string; price: number; duration: number }>;
  errors: Array<{ row: number; name: string; error: string }>;
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
  const [parsedData, setParsedData] = useState<ServiceRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const resetRef = useRef<() => void>(null);

  const organizationId = useSelector(
    (state: RootState) => state.auth.organizationId
  );

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
        const services: ServiceRow[] = jsonData.map((row: any) => ({
          name: row.Nombre || row.nombre || row.Name || row.name || "",
          type: row.Tipo || row.tipo || row.Type || row.type || "",
          description: row.Descripción || row.descripcion || row.Description || row.description || "",
          price: parseFloat(row.Precio || row.precio || row.Price || row.price || 0),
          duration: parseInt(row.Duración || row.duracion || row.Duration || row.duration || 0),
          hidePrice: row["Ocultar Precio"] === "Sí" || row["Ocultar Precio"] === "Si" || row.hidePrice === true,
          maxConcurrentAppointments: row["Citas Concurrentes"] || row.maxConcurrentAppointments || 1,
        }));

        setParsedData(services);

        if (services.length === 0) {
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
      const result = await bulkUploadServices(parsedData, organizationId);
      setUploadResult(result);

      if (result.totalSuccess > 0) {
        showNotification({
          title: "Carga completada",
          message: `Se crearon ${result.totalSuccess} servicios exitosamente`,
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
        message: "Ocurrió un error al procesar los servicios",
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
        Nombre: "Corte de Cabello",
        Tipo: "Barbería",
        Descripción: "Corte de cabello clásico",
        Precio: 15000,
        Duración: 30,
        "Ocultar Precio": "No",
        "Citas Concurrentes": 1,
      },
      {
        Nombre: "Manicure",
        Tipo: "Belleza",
        Descripción: "Manicure completo con esmaltado",
        Precio: 25000,
        Duración: 45,
        "Ocultar Precio": "No",
        "Citas Concurrentes": 2,
      },
      {
        Nombre: "Consulta Médica",
        Tipo: "Salud",
        Descripción: "Consulta médica general",
        Precio: 50000,
        Duración: 20,
        "Ocultar Precio": "Sí",
        "Citas Concurrentes": 1,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    
    // Agregar nota informativa
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const noteRow = range.e.r + 2;
    
    worksheet[XLSX.utils.encode_cell({ r: noteRow, c: 0 })] = {
      v: "NOTA: Nombre, Precio y Duración son obligatorios. La duración se especifica en minutos. Citas Concurrentes indica cuántos clientes pueden ser atendidos simultáneamente (por defecto: 1)",
      t: "s"
    };
    
    // Actualizar rango
    if (worksheet['!ref']) {
      const newRange = XLSX.utils.decode_range(worksheet['!ref']);
      newRange.e.r = noteRow;
      worksheet['!ref'] = XLSX.utils.encode_range(newRange);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Servicios");
    XLSX.writeFile(workbook, "plantilla_servicios.xlsx");
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
      title="Carga Masiva de Servicios"
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
              Descarga la plantilla de Excel y completa los datos de tus servicios
            </List.Item>
            <List.Item>
              <strong>Nombre</strong>, <strong>Precio</strong> y <strong>Duración</strong> son campos obligatorios
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="green" size={20} radius="xl" variant="light">
                  <IconInfoCircle size={14} />
                </ThemeIcon>
              }
            >
              La <strong>Duración</strong> se especifica en <strong>minutos</strong>
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="blue" size={20} radius="xl" variant="light">
                  <IconInfoCircle size={14} />
                </ThemeIcon>
              }
            >
              <strong>Citas Concurrentes</strong>: Indica cuántos clientes pueden ser atendidos simultáneamente (por defecto: 1)
            </List.Item>
            <List.Item>Tipo, Descripción y Ocultar Precio son opcionales</List.Item>
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
                  Cargar Servicios
                </Button>
              </Group>
            )}
          </Stack>
        </Card>

        {/* Barra de progreso */}
        {uploading && (
          <Box>
            <Text size="sm" mb="xs">
              Procesando servicios...
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
                          <Table.Th>Error</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {uploadResult.errors.map((error, idx) => (
                          <Table.Tr key={idx}>
                            <Table.Td>{error.row}</Table.Td>
                            <Table.Td>{error.name}</Table.Td>
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
