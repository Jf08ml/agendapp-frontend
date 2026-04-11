import { apiClass, apiClassPublic, apiEnrollment, apiEnrollmentPublic } from "./axiosConfig";
import { handleAxiosError } from "../utils/handleAxiosError";

// ══════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════

export interface Room {
  _id: string;
  organizationId: string;
  name: string;
  capacity: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface GroupDiscount {
  enabled: boolean;
  minPeople: number;
  maxPeople: number | null;
  discountPercent: number;
}

export interface ClassType {
  _id: string;
  organizationId: string;
  name: string;
  description?: string;
  duration: number;
  defaultCapacity: number;
  pricePerPerson: number;
  groupDiscount: GroupDiscount;
  color?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface ClassSession {
  _id: string;
  classId: ClassType | string;
  organizationId: string;
  employeeId: { _id: string; names: string } | string;
  roomId: { _id: string; name: string; capacity: number } | string;
  startDate: string;
  endDate: string;
  capacity: number;
  enrolledCount: number;
  status: "open" | "full" | "cancelled" | "completed";
  notes?: string;
  createdAt?: string;
}

export interface Attendee {
  name: string;
  phone: string;
  phone_e164?: string;
  phone_country?: string;
  email?: string;
  customPrice?: number;
}

export interface Enrollment {
  _id: string;
  sessionId: ClassSession | string;
  classId: ClassType | string;
  organizationId: string;
  groupId?: string | null;
  clientId?: { _id: string; names: string; phone: string } | null;
  attendee: Attendee;
  pricePerPerson: number;
  discountPercent: number;
  totalPrice: number;
  payments: PaymentRecord[];
  paymentStatus: "unpaid" | "partial" | "paid" | "free";
  status: "pending" | "confirmed" | "cancelled" | "attended" | "no_show";
  approvalMode: "manual" | "auto";
  notes?: string;
  createdAt?: string;
}

export interface PaymentRecord {
  _id?: string;
  amount: number;
  method: "cash" | "card" | "transfer" | "other";
  date?: string;
  note?: string;
}

interface ApiResponse<T> {
  code: number;
  status: string;
  data: T;
  message: string;
}

// ══════════════════════════════════════════════════════
// SALONES
// ══════════════════════════════════════════════════════

export const getRooms = async (): Promise<Room[]> => {
  try {
    const res = await apiClass.get<ApiResponse<Room[]>>("/rooms");
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los salones");
    return [];
  }
};

export const getRoomsByOrganization = async (organizationId: string): Promise<Room[]> => {
  try {
    const res = await apiClassPublic.get<ApiResponse<Room[]>>(`/rooms/organization/${organizationId}`);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener los salones");
    return [];
  }
};

export const createRoom = async (data: Omit<Room, "_id" | "organizationId" | "createdAt">): Promise<Room | undefined> => {
  try {
    const res = await apiClass.post<ApiResponse<Room>>("/rooms", data);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear el salón");
  }
};

export const updateRoom = async (id: string, data: Partial<Room>): Promise<Room | undefined> => {
  try {
    const res = await apiClass.put<ApiResponse<Room>>(`/rooms/${id}`, data);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar el salón");
  }
};

export const deleteRoom = async (id: string): Promise<void> => {
  try {
    await apiClass.delete(`/rooms/${id}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar el salón");
  }
};

// ══════════════════════════════════════════════════════
// CLASES (tipos)
// ══════════════════════════════════════════════════════

export const getClasses = async (includeInactive = false): Promise<ClassType[]> => {
  try {
    const res = await apiClass.get<ApiResponse<ClassType[]>>("/", {
      params: { includeInactive },
    });
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las clases");
    return [];
  }
};

export const getClassesByOrganization = async (organizationId: string): Promise<ClassType[]> => {
  try {
    const res = await apiClassPublic.get<ApiResponse<ClassType[]>>(`/organization/${organizationId}`);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las clases");
    return [];
  }
};

export const createClass = async (data: Omit<ClassType, "_id" | "organizationId" | "createdAt">): Promise<ClassType | undefined> => {
  try {
    const res = await apiClass.post<ApiResponse<ClassType>>("/", data);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear la clase");
  }
};

export const updateClass = async (id: string, data: Partial<ClassType>): Promise<ClassType | undefined> => {
  try {
    const res = await apiClass.put<ApiResponse<ClassType>>(`/${id}`, data);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar la clase");
  }
};

export const deleteClass = async (id: string): Promise<void> => {
  try {
    await apiClass.delete(`/${id}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar la clase");
  }
};

// ══════════════════════════════════════════════════════
// SESIONES
// ══════════════════════════════════════════════════════

export interface SessionFilters {
  from?: string;
  to?: string;
  classId?: string;
  employeeId?: string;
  roomId?: string;
  status?: string;
}

export const getSessions = async (filters: SessionFilters = {}): Promise<ClassSession[]> => {
  try {
    const res = await apiClass.get<ApiResponse<ClassSession[]>>("/sessions", { params: filters });
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las sesiones");
    return [];
  }
};

export const getAvailableSessions = async (
  organizationId: string,
  filters: { classId?: string; from?: string; to?: string } = {}
): Promise<ClassSession[]> => {
  try {
    const res = await apiClassPublic.get<ApiResponse<ClassSession[]>>("/sessions/available", {
      params: { organizationId, ...filters },
    });
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las sesiones disponibles");
    return [];
  }
};

export const createSession = async (data: {
  classId: string;
  employeeId: string;
  roomId: string;
  startDate: string;
  endDate: string;
  capacity?: number;
  notes?: string;
}): Promise<ClassSession | undefined> => {
  try {
    const res = await apiClass.post<ApiResponse<ClassSession>>("/sessions", data);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear la sesión");
  }
};

export const updateSession = async (id: string, data: Partial<ClassSession>): Promise<ClassSession | undefined> => {
  try {
    const res = await apiClass.put<ApiResponse<ClassSession>>(`/sessions/${id}`, data);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al actualizar la sesión");
  }
};

export interface BulkSessionPayload {
  classId: string;
  employeeId: string;
  roomId: string;
  weekdays: number[];      // 0=Dom, 1=Lun … 6=Sáb
  time: string;            // "HH:MM"
  periodStart: string;     // ISO date
  periodEnd: string;       // ISO date
  capacity?: number;
  notes?: string;
}

export interface BulkSessionResult {
  created: ClassSession[];
  skipped: { startDate: string; endDate: string; reason: string }[];
}

export const bulkCreateSessions = async (data: BulkSessionPayload): Promise<BulkSessionResult | undefined> => {
  try {
    const res = await apiClass.post<ApiResponse<BulkSessionResult>>("/sessions/bulk", data);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al programar las sesiones");
  }
};

export const deleteSession = async (id: string): Promise<void> => {
  try {
    await apiClass.delete(`/sessions/${id}`);
  } catch (error) {
    handleAxiosError(error, "Error al eliminar la sesión");
  }
};

export const deleteSessionsBulk = async (ids: string[]): Promise<void> => {
  try {
    await apiClass.post(`/sessions/bulk-delete`, { ids });
  } catch (error) {
    handleAxiosError(error, "Error al eliminar las sesiones");
  }
};

export const cancelSession = async (id: string): Promise<void> => {
  try {
    await apiClass.patch(`/sessions/${id}/cancel`);
  } catch (error) {
    handleAxiosError(error, "Error al cancelar la sesión");
  }
};

export const completeSession = async (id: string): Promise<void> => {
  try {
    await apiClass.patch(`/sessions/${id}/complete`);
  } catch (error) {
    handleAxiosError(error, "Error al completar la sesión");
  }
};

// ══════════════════════════════════════════════════════
// INSCRIPCIONES
// ══════════════════════════════════════════════════════

export interface EnrollmentFilters {
  status?: string;
  sessionId?: string;
  classId?: string;
  page?: number;
  limit?: number;
}

export const getEnrollments = async (filters: EnrollmentFilters = {}): Promise<{ enrollments: Enrollment[]; total: number }> => {
  try {
    const res = await apiEnrollment.get<ApiResponse<{ enrollments: Enrollment[]; total: number }>>("/", { params: filters });
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las inscripciones");
    return { enrollments: [], total: 0 };
  }
};

export const getSessionEnrollments = async (sessionId: string, status?: string): Promise<Enrollment[]> => {
  try {
    const res = await apiEnrollment.get<ApiResponse<Enrollment[]>>(`/session/${sessionId}`, {
      params: status ? { status } : {},
    });
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al obtener las inscripciones de la sesión");
    return [];
  }
};

export const adminCreateEnrollments = async (data: {
  sessionId: string;
  attendees: Attendee[];
  applyDiscount?: boolean;
  notes?: string;
}): Promise<Enrollment[] | undefined> => {
  try {
    const res = await apiEnrollment.post<ApiResponse<Enrollment[]>>("/", data);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear las inscripciones");
  }
};

export const createPublicEnrollment = async (data: {
  organizationId: string;
  sessionId: string;
  attendee: Attendee;
  companion?: Attendee;
  notes?: string;
}): Promise<Enrollment[] | undefined> => {
  try {
    const res = await apiEnrollmentPublic.post<ApiResponse<Enrollment[]>>("/public", data);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al crear la inscripción");
  }
};

export const approveEnrollment = async (id: string): Promise<void> => {
  try {
    await apiEnrollment.patch(`/${id}/approve`);
  } catch (error) {
    handleAxiosError(error, "Error al aprobar la inscripción");
  }
};

export const cancelEnrollment = async (id: string): Promise<void> => {
  try {
    await apiEnrollment.patch(`/${id}/cancel`);
  } catch (error) {
    handleAxiosError(error, "Error al cancelar la inscripción");
  }
};

export const updateAttendance = async (id: string, status: "attended" | "no_show"): Promise<void> => {
  try {
    await apiEnrollment.patch(`/${id}/attendance`, { status });
  } catch (error) {
    handleAxiosError(error, "Error al actualizar la asistencia");
  }
};

export const addEnrollmentPayment = async (id: string, payment: PaymentRecord): Promise<Enrollment | undefined> => {
  try {
    const res = await apiEnrollment.post<ApiResponse<Enrollment>>(`/${id}/payments`, payment);
    return res.data.data;
  } catch (error) {
    handleAxiosError(error, "Error al registrar el pago");
  }
};
