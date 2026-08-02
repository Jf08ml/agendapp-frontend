import { useState } from "react";
import {
  AspectRatio,
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { Dropzone, IMAGE_MIME_TYPE, PDF_MIME_TYPE } from "@mantine/dropzone";
import { BiImageAdd, BiSolidXCircle, BiStar } from "react-icons/bi";
import { BsArrowLeft, BsArrowRight, BsFilePdf } from "react-icons/bs";
import ImageCropModal from "../../../components/ImageCropModal";

// ── Imágenes (dropzone + recorte 4:3 + reordenar + marcar principal) ───────
// Componente controlado y autocontenido: el padre solo necesita guardar el
// arreglo `images` — la cola de recorte se maneja internamente.
interface ImageUploadFieldProps {
  images: (File | string)[];
  onChange: (images: (File | string)[]) => void;
}

export function ImageUploadField({ images, onChange }: ImageUploadFieldProps) {
  const [cropQueue, setCropQueue] = useState<File[]>([]);

  const handleDrop = (files: File[]) => {
    setCropQueue((prev) => [...prev, ...files]);
  };

  // Avanza la cola de recorte (se llama tras confirmar, omitir o quitar la
  // imagen actual — en los tres casos la cola pierde su primer elemento).
  const advanceCropQueue = () => setCropQueue((prev) => prev.slice(1));

  const handleCropConfirm = (croppedFile: File) => {
    onChange([...images, croppedFile]);
    advanceCropQueue();
  };

  const handleCropSkip = (originalFile: File) => {
    onChange([...images, originalFile]);
    advanceCropQueue();
  };

  const handleCropCancel = () => advanceCropQueue();

  const handleRemoveImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const moveImageLeft = (index: number) => {
    if (index === 0) return;
    const newArr = [...images];
    [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
    onChange(newArr);
  };

  const moveImageRight = (index: number) => {
    if (index === images.length - 1) return;
    const newArr = [...images];
    [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
    onChange(newArr);
  };

  const setAsMain = (index: number) => {
    if (index === 0) return;
    const newArr = [...images];
    const [item] = newArr.splice(index, 1);
    newArr.unshift(item);
    onChange(newArr);
  };

  return (
    <>
      <Box>
        <Dropzone
          onDrop={handleDrop}
          accept={IMAGE_MIME_TYPE}
          multiple
          styles={{ inner: { paddingBlock: 20 } }}
        >
          <Center>
            <Stack align="center" gap="xs">
              <ThemeIcon size={60} radius="md" variant="light">
                <BiImageAdd size={32} />
              </ThemeIcon>
              <div>
                <Text size="sm" fw={600} ta="center">Arrastra imágenes aquí o haz clic</Text>
                <Text size="xs" c="dimmed" ta="center">Formatos: JPEG, PNG, WebP</Text>
                <Text size="xs" c="dimmed" ta="center">Podrás recortarla a proporción 4:3 antes de guardar</Text>
              </div>
            </Stack>
          </Center>
        </Dropzone>
      </Box>

      {images.length > 0 && (
        <Box mt="md">
          <Text size="sm" c="dimmed" mb="xs">
            💡 La primera imagen es la principal. Usa las flechas para reordenar o la estrella para marcar como principal.
          </Text>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
            {images.map((file, idx) => (
              <Paper key={idx} pos="relative" withBorder radius="md" p={4}>
                <AspectRatio ratio={4 / 3}>
                  <Image
                    src={typeof file === "string" ? file : URL.createObjectURL(file)}
                    alt={`Imagen ${idx + 1}`}
                    radius="sm"
                    fit="cover"
                  />
                </AspectRatio>

                {idx === 0 && (
                  <Badge
                    color="yellow"
                    variant="filled"
                    leftSection={<BiStar size={12} />}
                    style={{ position: "absolute", left: 8, top: 8 }}
                    size="sm"
                  >
                    Principal
                  </Badge>
                )}

                <Group gap={4} style={{ position: "absolute", top: 8, right: 8 }}>
                  <Tooltip label="Eliminar" withArrow>
                    <ActionIcon
                      variant="filled"
                      color="red"
                      size="sm"
                      radius="xl"
                      onClick={() => handleRemoveImage(idx)}
                    >
                      <BiSolidXCircle size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>

                <Group
                  gap={4}
                  justify="center"
                  style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)" }}
                >
                  {idx !== 0 && (
                    <Tooltip label="Mover a la izquierda" withArrow>
                      <ActionIcon variant="filled" size="sm" radius="xl" onClick={() => moveImageLeft(idx)}>
                        <BsArrowLeft size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {idx !== 0 && (
                    <Tooltip label="Marcar como principal" withArrow>
                      <ActionIcon
                        variant="filled"
                        color="yellow"
                        size="sm"
                        radius="xl"
                        onClick={() => setAsMain(idx)}
                      >
                        <BiStar size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {idx !== images.length - 1 && (
                    <Tooltip label="Mover a la derecha" withArrow>
                      <ActionIcon variant="filled" size="sm" radius="xl" onClick={() => moveImageRight(idx)}>
                        <BsArrowRight size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Box>
      )}

      <ImageCropModal
        file={cropQueue[0] ?? null}
        remaining={Math.max(cropQueue.length - 1, 0)}
        onConfirm={handleCropConfirm}
        onSkip={handleCropSkip}
        onCancel={handleCropCancel}
      />
    </>
  );
}

// ── PDF (dropzone) + URL de video ───────────────────────────────────────────
interface PdfAndVideoFieldsProps {
  pdfFile: File | string | null;
  onPdfChange: (file: File | string | null) => void;
  videoUrl: string;
  onVideoUrlChange: (value: string) => void;
  pdfLabel?: string;
  videoDescription?: string;
}

export function PdfAndVideoFields({
  pdfFile,
  onPdfChange,
  videoUrl,
  onVideoUrlChange,
  pdfLabel = "PDF (ficha técnica, catálogo, etc.)",
  videoDescription = "Se muestra incrustado en el detalle público",
}: PdfAndVideoFieldsProps) {
  const pdfFileName = typeof pdfFile === "string" ? pdfFile.split("/").pop() : pdfFile?.name;

  const handleDropPdf = (files: File[]) => {
    if (files[0]) onPdfChange(files[0]);
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <Box>
        <Text size="sm" fw={500} mb={6}>{pdfLabel}</Text>
        {pdfFileName ? (
          <Paper withBorder radius="md" p="xs">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                <ThemeIcon color="red" variant="light" radius="md">
                  <BsFilePdf size={16} />
                </ThemeIcon>
                <Text size="sm" truncate>{pdfFileName}</Text>
              </Group>
              <ActionIcon color="red" variant="light" onClick={() => onPdfChange(null)}>
                <BiSolidXCircle size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        ) : (
          <Dropzone onDrop={handleDropPdf} accept={PDF_MIME_TYPE} multiple={false}>
            <Center>
              <Stack align="center" gap={4} py="xs">
                <ThemeIcon size={40} radius="md" variant="light" color="red">
                  <BsFilePdf size={20} />
                </ThemeIcon>
                <Text size="xs" fw={600} ta="center">Arrastra un PDF aquí o haz clic</Text>
              </Stack>
            </Center>
          </Dropzone>
        )}
      </Box>
      <TextInput
        label="Video (YouTube o Vimeo)"
        description={videoDescription}
        placeholder="https://www.youtube.com/watch?v=..."
        value={videoUrl}
        onChange={(e) => onVideoUrlChange(e.currentTarget.value)}
      />
    </SimpleGrid>
  );
}
