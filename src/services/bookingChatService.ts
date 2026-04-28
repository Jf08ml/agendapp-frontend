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
}

export interface BookingChatResponse {
  reply: string;
  bookingPayload: BookingPayload | null;
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
}

export const sendBookingMessage = async (
  messages: BookingChatMessage[]
): Promise<BookingChatResponse> => {
  const { data } = await api.post("/", { messages });
  return {
    reply: data.data.reply,
    bookingPayload: data.data.bookingPayload ?? null,
  };
};
