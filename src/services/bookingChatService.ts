import axios from "axios";

const API_BASE_URL: string =
  import.meta.env.VITE_NODE_ENV === "production"
    ? (import.meta.env.VITE_APP_API_URL as string)
    : (import.meta.env.VITE_APP_API_URL_DEPLOYMENT as string);

const TENANT_HOSTNAME = window.location.hostname;

const api = axios.create({ baseURL: `${API_BASE_URL}/booking-chat` });

api.interceptors.request.use((config) => {
  config.headers["X-Tenant-Domain"] = TENANT_HOSTNAME;
  if (import.meta.env.DEV) {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSlug = urlParams.get("slug");
    if (urlSlug) localStorage.setItem("app_dev_slug", urlSlug);
    const devSlug = urlSlug || localStorage.getItem("app_dev_slug");
    if (devSlug) config.headers["X-Dev-Tenant-Slug"] = devSlug;
  }
  return config;
});

export type BookingChatRole = "user" | "assistant";

export interface BookingChatMessage {
  role: BookingChatRole;
  content: string;
  // Solo UI: miniatura de la foto que adjuntó el cliente (no se envía al backend)
  imagePreview?: string;
}

// Foto o nota de voz que acompaña al último mensaje (base64 sin el prefijo data:)
export interface BookingChatAttachment {
  type: "image" | "audio";
  mimeType: string;
  data: string;
}

export interface BookingChatResponse {
  reply: string;
  bookingPayload: BookingPayload | null;
  // Texto con el que quedó el último mensaje del cliente en el historial
  // (ej: "🎤 (nota de voz) <transcripción>"). Solo cuando hubo adjunto.
  userContent: string | null;
}

export interface BookingPayload {
  services: { serviceId: string; employeeId: string | null }[];
  startDate: string;
  customerDetails: {
    name: string;
    phone: string;
    email: string;
    documentId: string;
    notes: string;
    birthDate: null;
  };
  organizationId: string;
  // Presente cuando el backend detectó un paquete de sesiones del cliente que
  // cubre todos los servicios pedidos — la reserva se paga con el paquete
  // ($0, sin depósito).
  clientPackageId?: string;
}

export const sendBookingMessage = async (
  messages: BookingChatMessage[],
  sessionId?: string,
  attachment?: BookingChatAttachment
): Promise<BookingChatResponse> => {
  const { data } = await api.post("/", {
    messages: messages.map(({ role, content }) => ({ role, content })),
    sessionId,
    ...(attachment ? { attachment } : {}),
  });
  return {
    reply: data.data.reply,
    bookingPayload: data.data.bookingPayload ?? null,
    userContent: data.data.userContent ?? null,
  };
};

// Marca la sesión como convertida (reserva creada tras el clic en "Sí, confirmar").
// Fire-and-forget: un fallo aquí no debe afectar la UX de la reserva.
export const markBookingConverted = async (sessionId: string): Promise<void> => {
  await api.post("/converted", { sessionId });
};

export const sendBookingFeedback = async (payload: {
  rating: 1 | 2 | 3 | 4 | 5;
  message?: string;
  sessionId?: string;
}): Promise<void> => {
  await api.post("/feedback", payload);
};
