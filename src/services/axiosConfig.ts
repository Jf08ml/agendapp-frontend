import axios, { AxiosInstance } from "axios";

const API_BASE_URL: string =
  import.meta.env.VITE_NODE_ENV === "production"
    ? (import.meta.env.VITE_APP_API_URL as string)
    : (import.meta.env.VITE_APP_API_URL_DEPLOYMENT as string);

// Control de refresh token en progreso
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const notifyTokenRefresh = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Notificar a los subscribers que el refresh falló (desbloquear peticiones)
const notifyTokenRefreshFailed = () => {
  // Resolver con el token actual (o vacío) para desbloquear las peticiones
  const currentToken = localStorage.getItem("app_token") || "";
  refreshSubscribers.forEach((callback) => callback(currentToken));
  refreshSubscribers = [];
};

// Instancia dedicada para refresh (sin interceptores de auth para evitar deadlock)
const refreshAxios = axios.create({ baseURL: API_BASE_URL });

const addTenantHeader = (api: AxiosInstance) => {
  api.interceptors.request.use((config) => {
    // window.location.hostname: el dominio actual donde está corriendo tu frontend
    config.headers["X-Tenant-Domain"] = window.location.hostname;

    // Agregar token de autenticación si existe
    const token = localStorage.getItem("app_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;

      // Verificar si el token está a punto de expirar durante esta solicitud
      const expiresAtStr = localStorage.getItem("app_token_expires_at");
      if (expiresAtStr) {
        const expiresAt = new Date(expiresAtStr).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const refreshThreshold = 5 * 60 * 1000; // 5 minutos

        // Si el token expira en menos de 5 minutos, intenta renovarlo
        if (timeUntilExpiry < refreshThreshold && timeUntilExpiry > 0) {
          if (!isRefreshing) {
            isRefreshing = true;
            // Usar refreshAxios directamente para evitar deadlock con interceptores
            refreshAxios.post("/refresh", {}, {
              headers: { Authorization: `Bearer ${token}` }
            })
              .then((response) => {
                const data = response.data?.data;
                if (data?.token) {
                  localStorage.setItem("app_token", data.token);
                  if (data.expiresAt) {
                    localStorage.setItem("app_token_expires_at", data.expiresAt);
                  }
                  notifyTokenRefresh(data.token);
                } else {
                  notifyTokenRefreshFailed();
                }
              })
              .catch((error) => {
                console.error("Error renovando token:", error);
                notifyTokenRefreshFailed();
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          // Si ya estamos renovando, esperar a que termine
          if (isRefreshing) {
            return new Promise((resolve) => {
              subscribeTokenRefresh((newToken: string) => {
                config.headers["Authorization"] = `Bearer ${newToken}`;
                resolve(config);
              });
            });
          }
        }
      }
    }

    return config;
  });
  return api;
};

const addTenantHeaderWithoutAuth = (api: AxiosInstance) => {
  api.interceptors.request.use((config) => {
    // Solo agregar el header del tenant, NO el token de autenticación
    config.headers["X-Tenant-Domain"] = window.location.hostname;
    return config;
  });
  return api;
};

const addMembershipInterceptor = (api: AxiosInstance) => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      // Detectar error 403 por membresía suspendida
      if (
        error.response?.status === 403 &&
        error.response?.data?.reason === "membership_suspended"
      ) {
        // Dispatch de evento personalizado para mostrar modal/notificación
        const event = new CustomEvent("membership-suspended", {
          detail: {
            message: error.response.data.message,
            orgId: error.response.data.orgId,
          },
        });
        window.dispatchEvent(event);
      }
      
      // Detectar error 401 por token expirado o inválido
      if (error.response?.status === 401) {
        // Limpiar datos de autenticación
        localStorage.removeItem("app_token");
        localStorage.removeItem("app_userId");
        localStorage.removeItem("app_role");
        localStorage.removeItem("app_token_expires_at");
        
        // Solo redirigir a login si estamos en rutas protegidas
        // No redirigir si estamos en landing, login, o rutas públicas
        const publicPaths = ['/login', '/login-admin', '/planes', '/servicios-precios', '/'];
        const currentPath = window.location.pathname;
        
        const isPublicPath = publicPaths.some(path => currentPath === path || currentPath.startsWith(path));
        
        if (!isPublicPath && !currentPath.includes('/login')) {
          // Dispatch evento para mostrar notificación
          const event = new CustomEvent("session-expired", {
            detail: {
              message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
              type: "token-expired",
            },
          });
          window.dispatchEvent(event);
          
          // Redirigir después de un breve delay para que se vea la notificación
          setTimeout(() => {
            window.location.href = '/login-admin';
          }, 2000);
        }
      }
      
      return Promise.reject(error);
    }
  );
  return api;
};

const createAxiosInstance = (baseURL: string): AxiosInstance => {
  const api = axios.create({ baseURL });
  addTenantHeader(api);
  addMembershipInterceptor(api);
  return api;
};

const createPublicAxiosInstance = (baseURL: string): AxiosInstance => {
  const api = axios.create({ baseURL });
  addTenantHeaderWithoutAuth(api);
  // No agregamos el interceptor de membresía para rutas públicas
  return api;
};

// Crear instancias de Axios para diferentes partes de la API
const apiGeneral: AxiosInstance = createAxiosInstance(API_BASE_URL);

const apiClient: AxiosInstance = createAxiosInstance(`${API_BASE_URL}/clients`);

const apiAppointment: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/appointments`
);
const apiService: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/services`
);
const apiServicePublic: AxiosInstance = createPublicAxiosInstance(
  `${API_BASE_URL}/services`
);
const apiImage: AxiosInstance = createAxiosInstance(`${API_BASE_URL}/images`);
const apiEmployee: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/employees`
);
const apiEmployeePublic: AxiosInstance = createPublicAxiosInstance(
  `${API_BASE_URL}/employees`
);
const apiAdvance: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/advances`
);
const apiAuth: AxiosInstance = createAxiosInstance(`${API_BASE_URL}/login`);
const apiOrganization: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/organizations`
);
const apiSubscribe: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/subscribe`
);
const apiCron: AxiosInstance = createAxiosInstance(`${API_BASE_URL}/cron`);
const apiReservation: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/reservations`
);
const apiNotification: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/notifications`
);
const apiPayments: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/payments`
);
const apiPackage: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/packages`
);
const apiPackagePublic: AxiosInstance = createPublicAxiosInstance(
  `${API_BASE_URL}/packages`
);
const apiPlansPublic: AxiosInstance = createPublicAxiosInstance(
  `${API_BASE_URL}/plans`
);

export {
  apiGeneral,
  apiClient,
  apiAppointment,
  apiService,
  apiServicePublic,
  apiImage,
  apiEmployee,
  apiEmployeePublic,
  apiAdvance,
  apiAuth,
  apiOrganization,
  apiSubscribe,
  apiCron,
  apiReservation,
  apiNotification,
  apiPayments,
  apiPackage,
  apiPackagePublic,
  apiPlansPublic,
};
