// pages/admin/campaigns/components/MessageComposer.tsx
import { useState, useRef } from "react";
import { Box, TextInput, Title, Paper, Alert, Badge, Textarea, Text, Image, Group, Button, Loader, Progress } from "@mantine/core";
import { IconUpload, IconX, IconPhoto, IconGif, IconVideo } from "@tabler/icons-react";
import type { CampaignRecipient } from "../../../../types/campaign";
import type { MediaType } from "../../../../services/imageService";
import { renderMessagePreview } from "../../../../utils/campaignValidations";
import { uploadMediaDirect, validateFile, getMediaType } from "../../../../services/imageService";

interface MessageComposerProps {
  title: string;
  message: string;
  media?: {
    url: string;
    type: MediaType;
    fileId?: string;
  };
  // Legacy support
  image?: string;
  onUpdate: (updates: { title?: string; message?: string; media?: { url: string; type: MediaType; fileId?: string }; image?: string }) => void;
  previewRecipient?: CampaignRecipient;
}

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export default function MessageComposer({
  title,
  message,
  media,
  image,
  onUpdate,
  previewRecipient,
}: MessageComposerProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = message.length;
  const maxChars = 1000;
  const isOverLimit = charCount > maxChars;

  const preview = previewRecipient
    ? renderMessagePreview(message, { name: previewRecipient.name })
    : message;

  // Determinar el media actual (soportar legacy 'image' prop)
  const currentMedia = media || (image ? { url: image, type: "image" as MediaType } : undefined);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Validar archivo antes de subir
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Archivo no válido");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadProgress(10);

    try {
      // Simular progreso mientras sube
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const result = await uploadMediaDirect(file, "campaigns");

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result) {
        onUpdate({
          media: {
            url: result.url,
            type: result.fileType,
            fileId: result.fileId,
          },
          image: result.url, // Legacy support
        });
      }
    } catch (error) {
      console.error("Error uploading media:", error);
      setUploadError(error instanceof Error ? error.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveMedia = () => {
    onUpdate({ media: undefined, image: undefined });
  };

  const getMediaTypeIcon = (type: MediaType) => {
    switch (type) {
      case "video": return <IconVideo size={16} />;
      case "gif": return <IconGif size={16} />;
      default: return <IconPhoto size={16} />;
    }
  };

  const getMediaTypeLabel = (type: MediaType) => {
    switch (type) {
      case "video": return "Video";
      case "gif": return "GIF";
      default: return "Imagen";
    }
  };

  return (
    <Box>
      <Title order={3} mb="md">
        ✍️ Compón tu mensaje
      </Title>

      {/* Título de la campaña */}
      <TextInput
        label="Título de la campaña"
        placeholder="Ej: Promoción Febrero 2026"
        value={title}
        onChange={(e) => onUpdate({ title: e.currentTarget.value })}
        mb="lg"
        required
        description="Este título es para tu referencia interna"
      />

      {/* Mensaje */}
      <Textarea
        label="Mensaje"
        placeholder={`🎉 ¡Hola {{name}}!

Este mes tenemos promociones especiales...

Agenda tu cita: wa.me/573001234567`}
        value={message}
        onChange={(e) => onUpdate({ message: e.currentTarget.value })}
        required
        error={isOverLimit ? `⚠️ Excede el límite por ${charCount - maxChars} caracteres` : undefined}
        description={`${charCount}/${maxChars} caracteres`}
        minRows={8}
        autosize
        mb="md"
      />

      {/* Info sobre placeholders */}
      <Alert color="blue" mb="lg">
        <Text size="sm" fw={600}>💡 Placeholders disponibles:</Text>
        <Text size="sm" mt="xs">
          • <code>{"{{name}}"}</code> - Nombre del cliente (si está disponible)
        </Text>
      </Alert>

      {/* Media (imagen, GIF o video) */}
      <Box mb="lg">
        <Text size="sm" fw={500} mb="xs">
          Multimedia (opcional)
        </Text>

        {currentMedia ? (
          <Box>
            <Badge
              leftSection={getMediaTypeIcon(currentMedia.type)}
              color={currentMedia.type === "video" ? "blue" : currentMedia.type === "gif" ? "grape" : "green"}
              mb="sm"
            >
              {getMediaTypeLabel(currentMedia.type)}
            </Badge>

            {currentMedia.type === "video" ? (
              <video
                src={currentMedia.url}
                controls
                style={{
                  maxHeight: 200,
                  maxWidth: 400,
                  borderRadius: 8,
                  border: "1px solid #dee2e6",
                  display: "block",
                }}
              />
            ) : (
              <Image
                src={currentMedia.url}
                alt="Media seleccionado"
                style={{
                  maxHeight: 200,
                  maxWidth: 400,
                  objectFit: "contain",
                  borderRadius: 8,
                  border: "1px solid #dee2e6",
                }}
              />
            )}

            <Group mt="sm">
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconX size={16} />}
                onClick={handleRemoveMedia}
              >
                Eliminar {getMediaTypeLabel(currentMedia.type).toLowerCase()}
              </Button>
            </Group>
          </Box>
        ) : (
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileSelect}
              style={{ display: "none" }}
              id="media-upload-input"
            />
            <Button
              component="label"
              htmlFor="media-upload-input"
              variant="light"
              leftSection={uploading ? <Loader size={18} /> : <IconUpload size={18} />}
              disabled={uploading}
            >
              {uploading ? "Subiendo..." : "Seleccionar archivo"}
            </Button>

            {uploading && (
              <Progress value={uploadProgress} size="sm" mt="sm" animated />
            )}

            <Text size="xs" c="dimmed" mt="xs">
              Formatos: JPG, PNG, WebP, GIF, MP4, WebM (máx. 25MB)
            </Text>

            {uploadError && (
              <Text size="sm" c="red" mt="xs">
                {uploadError}
              </Text>
            )}
          </Box>
        )}
      </Box>

      {/* Previsualización */}
      <Box>
        <Title order={4} mb="sm">
          📱 Previsualización
        </Title>

        <Paper
          p="md"
          style={{
            backgroundColor: "#e5ddd5",
            maxWidth: 400,
            borderRadius: 8,
          }}
        >
          <Box
            style={{
              backgroundColor: "white",
              padding: 12,
              borderRadius: 8,
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              position: "relative",
            }}
          >
            {currentMedia && (
              currentMedia.type === "video" ? (
                <video
                  src={currentMedia.url}
                  controls
                  style={{
                    maxHeight: 200,
                    width: "100%",
                    objectFit: "cover",
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                />
              ) : (
                <Image
                  src={currentMedia.url}
                  alt="Preview"
                  style={{
                    maxHeight: 200,
                    objectFit: "cover",
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )
            )}

            <Text
              size="sm"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {preview || "Tu mensaje aparecerá aquí..."}
            </Text>

            <Text
              size="xs"
              c="dimmed"
              ta="right"
              mt="xs"
            >
              {new Date().toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Box>

          {previewRecipient?.name && (
            <Badge size="sm" mt="sm">
              Vista previa para: {previewRecipient.name}
            </Badge>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
