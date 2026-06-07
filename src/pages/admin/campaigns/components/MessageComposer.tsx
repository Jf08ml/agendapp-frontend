// pages/admin/campaigns/components/MessageComposer.tsx
import { useState, useRef, useEffect } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Image,
  Loader,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconUpload, IconX, IconPhoto, IconGif, IconVideo } from "@tabler/icons-react";
import { BiInfoCircle } from "react-icons/bi";
import type { CampaignRecipient } from "../../../../types/campaign";
import type { MediaType } from "../../../../services/imageService";
import { renderMessagePreview } from "../../../../utils/campaignValidations";
import { uploadMediaDirect, validateFile } from "../../../../services/imageService";
import { listMetaTemplates } from "../../../../services/organizationService";

const ACCEPTED_FILE_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: Array<{ type: string; text?: string; format?: string }>;
}

interface MessageComposerProps {
  orgId: string;
  isMeta: boolean;
  title: string;
  message: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
  media?: { url: string; type: MediaType; fileId?: string };
  image?: string;
  onUpdate: (updates: {
    title?: string;
    message?: string;
    templateName?: string;
    templateLanguage?: string;
    templateBody?: string;
    templateVariables?: Record<string, string>;
    media?: { url: string; type: MediaType; fileId?: string };
    image?: string;
  }) => void;
  previewRecipient?: CampaignRecipient;
}

function getBodyText(components: MetaTemplate["components"]): string {
  return components.find((c) => c.type === "BODY")?.text || "";
}

export default function MessageComposer({
  orgId,
  isMeta,
  title,
  message,
  templateName,
  templateVariables = {},
  media,
  image,
  onUpdate,
  previewRecipient,
}: MessageComposerProps) {
  // ── Baileys state ──────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Meta state ─────────────────────────────────────────────────────────────
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);

  useEffect(() => {
    if (!isMeta || !orgId) return;
    setLoadingTemplates(true);
    listMetaTemplates(orgId)
      .then((all: MetaTemplate[]) => {
        const approved = all.filter((t) => t.status === "APPROVED");
        setMetaTemplates(approved);
        // Restaurar selección si ya había una en el wizard state
        if (templateName) {
          const found = approved.find((t) => t.name === templateName);
          if (found) setSelectedTemplate(found);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, [isMeta, orgId]);

  function handleTemplateSelect(name: string | null) {
    if (!name) {
      setSelectedTemplate(null);
      onUpdate({ templateName: undefined, templateLanguage: undefined, templateBody: undefined });
      return;
    }
    const tpl = metaTemplates.find((t) => t.name === name) || null;
    setSelectedTemplate(tpl);
    if (tpl) {
      const body = getBodyText(tpl.components);
      onUpdate({ templateName: tpl.name, templateLanguage: tpl.language, templateBody: body });
    }
  }

  // ── Baileys helpers ────────────────────────────────────────────────────────
  const charCount = message.length;
  const maxChars = 1000;
  const isOverLimit = charCount > maxChars;
  const currentMedia = media || (image ? { url: image, type: "image" as MediaType } : undefined);
  const preview = previewRecipient
    ? renderMessagePreview(message, { name: previewRecipient.name })
    : message;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    const validation = validateFile(file);
    if (!validation.valid) { setUploadError(validation.error || "Archivo no válido"); return; }
    setUploading(true);
    setUploadError(null);
    setUploadProgress(10);
    try {
      const progressInterval = setInterval(() => setUploadProgress((p) => Math.min(p + 10, 90)), 200);
      const result = await uploadMediaDirect(file, "campaigns");
      clearInterval(progressInterval);
      setUploadProgress(100);
      if (result) onUpdate({ media: { url: result.url, type: result.fileType, fileId: result.fileId }, image: result.url });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Error al subir");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getMediaIcon = (type: MediaType) =>
    type === "video" ? <IconVideo size={16} /> : type === "gif" ? <IconGif size={16} /> : <IconPhoto size={16} />;
  const getMediaLabel = (type: MediaType) =>
    type === "video" ? "Video" : type === "gif" ? "GIF" : "Imagen";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Title order={3} mb="md">
        {isMeta ? "📋 Seleccionar plantilla" : "✍️ Compón tu mensaje"}
      </Title>

      {/* Título de la campaña (siempre visible) */}
      <TextInput
        label="Título de la campaña"
        placeholder="Ej: Promoción Febrero 2026"
        value={title}
        onChange={(e) => onUpdate({ title: e.currentTarget.value })}
        mb="lg"
        required
        description="Referencia interna — no se envía al destinatario"
      />

      {/* ── MODO META ── */}
      {isMeta && (
        <Stack gap="md">
          <Box>
            {loadingTemplates ? (
              <Group gap="xs"><Loader size="xs" /><Text size="sm" c="dimmed">Cargando plantillas...</Text></Group>
            ) : metaTemplates.length === 0 ? (
              <Alert color="orange" icon={<BiInfoCircle size={16} />}>
                <Text size="sm" fw={500}>No hay plantillas aprobadas</Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Crea y envía plantillas a revisión en Gestionar WhatsApp → Plantillas Meta.
                  Cuando Meta las apruebe aparecerán aquí.
                </Text>
              </Alert>
            ) : (
              <Select
                label="Plantilla a usar"
                placeholder="Selecciona una plantilla aprobada..."
                required
                data={metaTemplates.map((t) => ({
                  value: t.name,
                  label: `${t.name} (${t.category} · ${t.language})`,
                }))}
                value={templateName || null}
                onChange={handleTemplateSelect}
                description={`${metaTemplates.length} plantilla${metaTemplates.length !== 1 ? "s" : ""} aprobada${metaTemplates.length !== 1 ? "s" : ""}`}
              />
            )}
          </Box>

          {/* Preview del template seleccionado */}
          {selectedTemplate && (() => {
            const bodyText = getBodyText(selectedTemplate.components);
            const allVarIndices = [...new Set(
              (bodyText.match(/\{\{(\d+)\}\}/g) || []).map(m => parseInt(m.replace(/\{\{|\}\}/g, "")))
            )].sort((a, b) => a - b);
            const fixedVars = allVarIndices.filter(i => i > 1); // {{2}}, {{3}}, etc.

            return (
              <>
                {/* Variables — {{1}} auto + inputs para las demás */}
                {allVarIndices.length > 0 && (
                  <Box>
                    <Text size="sm" fw={600} mb="xs">Variables de la plantilla</Text>
                    <Stack gap="xs">
                      {/* {{1}} siempre automático */}
                      <Paper withBorder p="xs" radius="sm">
                        <Group justify="space-between" wrap="nowrap">
                          <Text size="sm" ff="monospace" fw={600} c="blue">{"{{1}}"}</Text>
                          <Text size="xs" c="dimmed">Nombre del destinatario (automático)</Text>
                        </Group>
                      </Paper>

                      {/* Variables adicionales con input */}
                      {fixedVars.map(i => (
                        <Paper key={i} withBorder p="xs" radius="sm">
                          <Group wrap="nowrap" gap="sm">
                            <Text size="sm" ff="monospace" fw={600} c="violet" style={{ flexShrink: 0 }}>{`{{${i}}}`}</Text>
                            <TextInput
                              style={{ flex: 1 }}
                              placeholder={`Texto fijo para {{${i}}} (igual para todos los destinatarios)`}
                              value={templateVariables[String(i)] || ""}
                              onChange={(e) =>
                                onUpdate({ templateVariables: { ...templateVariables, [String(i)]: e.currentTarget.value } })
                              }
                              size="xs"
                            />
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Preview estilo WhatsApp */}
                <Box>
                  <Text size="sm" fw={500} mb="xs">Vista previa</Text>
                  <Paper p="md" style={{ backgroundColor: "#e5ddd5", maxWidth: 400, borderRadius: 8 }}>
                    <Box style={{ backgroundColor: "white", padding: 12, borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                      <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {bodyText
                          .replace(/\{\{1\}\}/g, previewRecipient?.name || "[nombre]")
                          .replace(/\{\{(\d+)\}\}/g, (_, n) => templateVariables[n] || `[var ${n}]`)
                          || "Sin cuerpo de mensaje"}
                      </Text>
                      <Text size="xs" c="dimmed" ta="right" mt="xs">
                        {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </Box>
                    {previewRecipient?.name && (
                      <Badge size="sm" mt="sm">Vista previa para: {previewRecipient.name}</Badge>
                    )}
                  </Paper>
                </Box>

                <Alert color="teal" icon={<BiInfoCircle size={16} />}>
                  <Text size="xs">
                    Esta plantilla se enviará como mensaje de WhatsApp oficial desde tu número.
                    Meta cobra por mensaje de marketing enviado según tu tier de conversaciones.
                  </Text>
                </Alert>
              </>
            );
          })()}
        </Stack>
      )}

      {/* ── MODO BAILEYS (legacy — no debería mostrarse con el check de Meta en el Wizard) ── */}
      {!isMeta && (
        <>
          <Box mb="md">
            <textarea
              placeholder={`🎉 ¡Hola {{name}}!\n\nEste mes tenemos promociones especiales...`}
              value={message}
              onChange={(e) => onUpdate({ message: e.currentTarget.value })}
              rows={8}
              style={{ width: "100%", padding: 10, borderRadius: 6, border: isOverLimit ? "1px solid red" : "1px solid #ced4da", fontSize: 14, resize: "vertical" }}
            />
            <Text size="xs" c={isOverLimit ? "red" : "dimmed"} mt={4}>
              {charCount}/{maxChars} caracteres{isOverLimit ? ` — excede por ${charCount - maxChars}` : ""}
            </Text>
          </Box>

          <Alert color="blue" mb="lg">
            <Text size="sm" fw={600}>💡 Placeholders:</Text>
            <Text size="sm" mt={4}><code>{"{{name}}"}</code> — nombre del cliente</Text>
          </Alert>

          {/* Media */}
          <Box mb="lg">
            <Text size="sm" fw={500} mb="xs">Multimedia (opcional)</Text>
            {currentMedia ? (
              <Box>
                <Badge leftSection={getMediaIcon(currentMedia.type)} mb="sm">{getMediaLabel(currentMedia.type)}</Badge>
                {currentMedia.type === "video" ? (
                  <video src={currentMedia.url} controls style={{ maxHeight: 200, maxWidth: 400, borderRadius: 8, display: "block" }} />
                ) : (
                  <Image src={currentMedia.url} alt="Media" style={{ maxHeight: 200, maxWidth: 400, objectFit: "contain", borderRadius: 8 }} />
                )}
                <Group mt="sm">
                  <Button variant="subtle" color="red" size="xs" leftSection={<IconX size={16} />} onClick={() => onUpdate({ media: undefined, image: undefined })}>
                    Eliminar
                  </Button>
                </Group>
              </Box>
            ) : (
              <Box>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} onChange={handleFileSelect} style={{ display: "none" }} id="media-upload-input" />
                <Button component="label" htmlFor="media-upload-input" variant="light" leftSection={uploading ? <Loader size={18} /> : <IconUpload size={18} />} disabled={uploading}>
                  {uploading ? "Subiendo..." : "Seleccionar archivo"}
                </Button>
                {uploading && <Progress value={uploadProgress} size="sm" mt="sm" animated />}
                <Text size="xs" c="dimmed" mt="xs">JPG, PNG, WebP, GIF, MP4, WebM (máx. 25MB)</Text>
                {uploadError && <Text size="sm" c="red" mt="xs">{uploadError}</Text>}
              </Box>
            )}
          </Box>

          {/* Preview Baileys */}
          <Box>
            <Title order={4} mb="sm">📱 Previsualización</Title>
            <Paper p="md" style={{ backgroundColor: "#e5ddd5", maxWidth: 400, borderRadius: 8 }}>
              <Box style={{ backgroundColor: "white", padding: 12, borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                {currentMedia && (
                  currentMedia.type === "video" ? (
                    <video src={currentMedia.url} controls style={{ maxHeight: 150, width: "100%", borderRadius: 4, marginBottom: 8 }} />
                  ) : (
                    <Image src={currentMedia.url} alt="Preview" style={{ maxHeight: 150, objectFit: "cover", borderRadius: 4, marginBottom: 8 }} />
                  )
                )}
                <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {preview || "Tu mensaje aparecerá aquí..."}
                </Text>
                <Text size="xs" c="dimmed" ta="right" mt="xs">
                  {new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </Box>
              {previewRecipient?.name && <Badge size="sm" mt="sm">Vista previa para: {previewRecipient.name}</Badge>}
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
}
