// pages/admin/campaigns/components/MessageComposer.tsx
import { useState } from "react";
import { Box, TextInput, Title, Paper, Alert, Badge, Textarea, Text, Image, FileInput, Group, Button, Loader } from "@mantine/core";
import { IconUpload, IconX } from "@tabler/icons-react";
import type { CampaignRecipient } from "../../../../types/campaign";
import { renderMessagePreview } from "../../../../utils/campaignValidations";
import { uploadImage } from "../../../../services/imageService";

interface MessageComposerProps {
  title: string;
  message: string;
  image?: string;
  onUpdate: (updates: any) => void;
  previewRecipient?: CampaignRecipient;
}

export default function MessageComposer({
  title,
  message,
  image,
  onUpdate,
  previewRecipient,
}: MessageComposerProps) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const charCount = message.length;
  const maxChars = 1000;
  const isOverLimit = charCount > maxChars;

  const preview = previewRecipient
    ? renderMessagePreview(message, { name: previewRecipient.name })
    : message;

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    setUploadingImage(true);
    setUploadError(null);

    try {
      const imageUrl = await uploadImage(file);
      if (imageUrl) {
        onUpdate({ image: imageUrl });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError("Error al subir la imagen. Por favor, intenta de nuevo.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    onUpdate({ image: undefined });
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

      {/* Imagen opcional */}
      <Box mb="lg">
        <Text size="sm" fw={500} mb="xs">
          Imagen (opcional)
        </Text>
        
        {image ? (
          <Box>
            <Image
              src={image}
              alt="Imagen seleccionada"
              style={{
                maxHeight: 200,
                maxWidth: 400,
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #dee2e6",
              }}
              mb="sm"
            />
            <Group>
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconX size={16} />}
                onClick={handleRemoveImage}
              >
                Eliminar imagen
              </Button>
            </Group>
          </Box>
        ) : (
          <FileInput
            placeholder="Selecciona una imagen"
            accept="image/*"
            leftSection={uploadingImage ? <Loader size={18} /> : <IconUpload size={18} />}
            onChange={handleImageUpload}
            disabled={uploadingImage}
            description="Formatos: JPG, PNG, GIF (máx. 5MB)"
            error={uploadError}
          />
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
            {image && (
              <Image
                src={image}
                alt="Preview"
                style={{
                  maxHeight: 200,
                  objectFit: "cover",
                  borderRadius: 4,
                  marginBottom: 8,
                }}
                onError={(e: any) => {
                  e.currentTarget.style.display = "none";
                }}
              />
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
