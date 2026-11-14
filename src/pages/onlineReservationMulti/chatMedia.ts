// Fotos y notas de voz del asistente de reservas web (BookingChatPanel).
// El backend los recibe como adjunto del último mensaje (bookingChatController):
// la foto la ve Claude y la nota de voz se transcribe. En el historial quedan
// como texto con estos prefijos, igual que en WhatsApp.
import { useCallback, useEffect, useRef, useState } from "react";

export const IMAGE_PREFIX = "📷 (imagen)";
export const VOICE_PREFIX = "🎤 (nota de voz)";
export const VOICE_FAILED = "🎤 (nota de voz — no se pudo transcribir)";

// Lado mayor de la foto: suficiente para leer un anuncio o una captura y
// mantiene el envío en unos cientos de KB (el backend acepta hasta 3,5 MB).
const MAX_IMAGE_SIDE = 1600;
// El backend acepta hasta 3 MB de audio; 2 min de opus son ~0,5 MB.
export const MAX_RECORDING_SECONDS = 120;

export interface PreparedImage {
  preview: string; // data URL para la miniatura
  data: string; // base64 sin prefijo
  mimeType: string;
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const stripDataUrl = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);

export const blobToBase64 = async (blob: Blob) => stripDataUrl(await readAsDataUrl(blob));

/** Reduce la foto a JPEG de máximo 1600 px de lado (las fotos del celular pesan 3–8 MB). */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer la imagen"));
      el.src = url;
    });
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    // Fondo blanco: un PNG con transparencia quedaría negro en JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/jpeg", 0.82);
    return { preview, data: stripDataUrl(preview), mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const canRecordAudio = () =>
  typeof window !== "undefined" &&
  typeof window.MediaRecorder !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia;

// Chrome/Android graban webm/opus; Safari/iPhone, mp4. Ambos los acepta la transcripción.
const pickMimeType = () =>
  ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
    MediaRecorder.isTypeSupported(t)
  );

/**
 * Grabación de notas de voz. stop() entrega el audio a onRecorded; cancel() lo
 * descarta. Se corta sola a MAX_RECORDING_SECONDS.
 */
export function useVoiceRecorder(onRecorded: (blob: Blob) => void, onError: (msg: string) => void) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const cleanup = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
    setSeconds(0);
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stop();
  }, [stop]);

  const start = useCallback(async () => {
    if (!canRecordAudio()) {
      onError("Tu navegador no permite grabar audio. Escríbeme tu mensaje 🙏");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("No pude usar el micrófono. Revisa el permiso del navegador o escríbeme tu mensaje.");
      return;
    }
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    cancelledRef.current = false;
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    rec.onstop = () => {
      const cancelled = cancelledRef.current;
      cleanup();
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || "audio/webm" });
      // Menos de ~1 KB es un toque sin audio.
      if (!cancelled && blob.size > 1000) onRecordedRef.current(blob);
    };
    streamRef.current = stream;
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
    setSeconds(0);
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  }, [cleanup, onError]);

  // Corte automático al llegar al máximo.
  useEffect(() => {
    if (recording && seconds >= MAX_RECORDING_SECONDS) stop();
  }, [recording, seconds, stop]);

  // Si se cierra el chat grabando, se suelta el micrófono.
  useEffect(
    () => () => {
      cancelledRef.current = true;
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) window.clearInterval(timerRef.current);
    },
    []
  );

  return { recording, seconds, start, stop, cancel };
}

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
