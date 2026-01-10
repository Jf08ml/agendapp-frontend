// pages/admin/campaigns/components/MessageComposer.tsx
import { Box, TextInput, Title, Paper, Alert, Badge, Textarea, Text, Image } from "@mantine/core";
import type { CampaignRecipient } from "../../../../types/campaign";
import { renderMessagePreview } from "../../../../utils/campaignValidations";

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
  const charCount = message.length;
  const maxChars = 1000;
  const isOverLimit = charCount > maxChars;

  const preview = previewRecipient
    ? renderMessagePreview(message, { name: previewRecipient.name })
    : message;

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
      <TextInput
        label="URL de imagen (opcional)"
        placeholder="https://ejemplo.com/imagen-promocion.jpg"
        value={image || ""}
        onChange={(e) => onUpdate({ image: e.currentTarget.value })}
        description="Puedes agregar una imagen a tu campaña pegando la URL"
        mb="lg"
      />

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
