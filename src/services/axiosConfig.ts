import axios, { AxiosInstance } from "axios";

const API_BASE_URL: string =
  import.meta.env.VITE_NODE_ENV === "production"
    ? (import.meta.env.VITE_APP_API_URL as string)
    : (import.meta.env.VITE_APP_API_URL_DEPLOYMENT as string);

// Cache del hostname para no leer window.location en cada request
const TENANT_HOSTNAME = window.location.hostname;

// Control de refresh token en progreso
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];
let refreshDeadlineTimer: ReturnType<typeof setTimeout> | null = null;

const REFRESH_TIMEOUT_MS = 8_000; // 8 segundos máximo para renovar el token

const subscribeTokenRefresh = (callback: (token: string | null) => void) => {
  refreshSubscribers.push(callback);
};

const notifyTokenRefresh = (token: string) => {
  if (refreshDeadlineTimer) clearTimeout(refreshDeadlineTimer);
  refreshDeadlineTimer = null;
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Desbloquea todos los subscribers con null → cada uno decide si reintentar o fallar
const notifyTokenRefreshFailed = () => {
  if (refreshDeadlineTimer) clearTimeout(refreshDeadlineTimer);
  refreshDeadlineTimer = null;
  refreshSubscribers.forEach((cb) => cb(null));
  refreshSubscribers = [];
};

// Instancia dedicada para refresh — timeout corto para no bloquear el queue
const refreshAxios = axios.create({ baseURL: API_BASE_URL, timeout: REFRESH_TIMEOUT_MS });

const addAuthHeader = (api: AxiosInstance) => {
  api.interceptors.request.use((config) => {
    // Enviar hostname del tenant para que el backend resuelva la organización
    config.headers["X-Tenant-Domain"] = TENANT_HOSTNAME;

    // En dev, enviar slug como header para override
    if (import.meta.env.DEV) {
      // Leer de URL (?slug=) y persistir en localStorage para navegación interna
      const urlParams = new URLSearchParams(window.location.search);
      const urlSlug = urlParams.get("slug");
      if (urlSlug) {
        localStorage.setItem("app_dev_slug", urlSlug);
      }
      const devSlug = urlSlug || localStorage.getItem("app_dev_slug");
      if (devSlug) {
        config.headers["X-Dev-Tenant-Slug"] = devSlug;
      }
    }

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

            // Válvula de seguridad: si tras REFRESH_TIMEOUT_MS + 1s el refresh sigue
            // sin resolverse (p.ej. red colgada), desbloqueamos el queue para que las
            // requests no queden atrapadas indefinidamente.
            refreshDeadlineTimer = setTimeout(() => {
              console.warn("[Auth] Refresh timeout — desbloqueando queue");
              notifyTokenRefreshFailed();
              isRefreshing = false;
            }, REFRESH_TIMEOUT_MS + 1_000);

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
              .catch(() => {
                notifyTokenRefreshFailed();
              })
              .finally(() => {
                isRefreshing = false;
              });
          }

          // Encolar la request actual hasta que el refresh termine
          if (isRefreshing) {
            return new Promise((resolve) => {
              subscribeTokenRefresh((newToken) => {
                if (newToken) {
                  config.headers["Authorization"] = `Bearer ${newToken}`;
                  resolve(config);
                } else {
                  // Refresh falló: dejar pasar con el token actual (el 401 lo manejará)
                  resolve(config);
                }
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

const addNoAuthInterceptor = (api: AxiosInstance) => {
  // No auth token, pero enviar hostname del tenant
  api.interceptors.request.use((config) => {
    config.headers["X-Tenant-Domain"] = TENANT_HOSTNAME;

    if (import.meta.env.DEV) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSlug = urlParams.get("slug");
      if (urlSlug) {
        localStorage.setItem("app_dev_slug", urlSlug);
      }
      const devSlug = urlSlug || localStorage.getItem("app_dev_slug");
      if (devSlug) {
        config.headers["X-Dev-Tenant-Slug"] = devSlug;
      }
    }
    return config;
  });
  return api;
};

const forceLogout = () => {
  const publicPaths = ["/login", "/login-admin", "/planes", "/servicios-precios", "/"];
  const currentPath = window.location.pathname;
  const isPublic = publicPaths.some((p) => currentPath === p || currentPath.startsWith(p));

  localStorage.removeItem("app_token");
  localStorage.removeItem("app_userId");
  localStorage.removeItem("app_role");
  localStorage.removeItem("app_token_expires_at");
  localStorage.removeItem("app_dev_slug");

  if (!isPublic && !currentPath.includes("/login")) {
    window.dispatchEvent(
      new CustomEvent("session-expired", {
        detail: {
          message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
          type: "token-expired",
        },
      })
    );
    setTimeout(() => {
      window.location.href = "/login-admin";
    }, 2000);
  }
};

const addMembershipInterceptor = (api: AxiosInstance) => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Detectar error 403 por membresía suspendida
      if (
        error.response?.status === 403 &&
        error.response?.data?.reason === "membership_suspended"
      ) {
        window.dispatchEvent(new CustomEvent("membership-suspended", {
          detail: { message: error.response.data.message, orgId: error.response.data.orgId },
        }));
      }

      // Detectar error 403 por membresía past_due (read-only)
      if (
        error.response?.status === 403 &&
        error.response?.data?.reason === "membership_past_due"
      ) {
        window.dispatchEvent(new CustomEvent("membership-past-due", {
          detail: { message: error.response.data.message, data: error.response.data.data },
        }));
      }

      // Detectar error 403 por no tener membresía activa
      if (
        error.response?.status === 403 &&
        error.response?.data?.reason === "no_active_membership"
      ) {
        window.dispatchEvent(new CustomEvent("membership-suspended", {
          detail: { message: error.response.data.message },
        }));
      }

      // 401: intentar refresh antes de hacer logout.
      // _retry evita un loop infinito si el propio endpoint de refresh devuelve 401.
      if (error.response?.status === 401 && !error.config?._retry) {
        const token = localStorage.getItem("app_token");

        if (token && !isRefreshing) {
          error.config._retry = true;
          isRefreshing = true;

          try {
            const res = await refreshAxios.post(
              "/refresh",
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = res.data?.data;
            if (data?.token) {
              localStorage.setItem("app_token", data.token);
              if (data.expiresAt) {
                localStorage.setItem("app_token_expires_at", data.expiresAt);
              }
              notifyTokenRefresh(data.token);
              // Reintentar la request original con el nuevo token
              error.config.headers["Authorization"] = `Bearer ${data.token}`;
              return api(error.config);
            }
          } catch {
            notifyTokenRefreshFailed();
          } finally {
            isRefreshing = false;
          }
        } else if (token && isRefreshing) {
          // Refresh ya en curso — encolar y reintentar cuando termine
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              if (newToken) {
                error.config.headers["Authorization"] = `Bearer ${newToken}`;
                resolve(api(error.config));
              } else {
                reject(error);
              }
            });
          });
        }

        forceLogout();
      }

      return Promise.reject(error);
    }
  );
  return api;
};

const createAxiosInstance = (baseURL: string): AxiosInstance => {
  const api = axios.create({ baseURL });
  addAuthHeader(api);
  addMembershipInterceptor(api);
  return api;
};

const createPublicAxiosInstance = (baseURL: string): AxiosInstance => {
  const api = axios.create({ baseURL });
  addNoAuthInterceptor(api);
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
const apiPackage: AxiosInstance = createAxiosInstance(
  `${API_BASE_URL}/packages`
);
const apiPackagePublic: AxiosInstance = createPublicAxiosInstance(
  `${API_BASE_URL}/packages`
);
const apiPlansPublic: AxiosInstance = createPublicAxiosInstance(
  `${API_BASE_URL}/plans`
);

// Módulo de Clases
const apiClass: AxiosInstance = createAxiosInstance(`${API_BASE_URL}/classes`);
const apiClassPublic: AxiosInstance = createPublicAxiosInstance(`${API_BASE_URL}/classes`);
const apiEnrollment: AxiosInstance = createAxiosInstance(`${API_BASE_URL}/enrollments`);
const apiEnrollmentPublic: AxiosInstance = createPublicAxiosInstance(`${API_BASE_URL}/enrollments`);

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
  apiPackage,
  apiPackagePublic,
  apiPlansPublic,
  apiClass,
  apiClassPublic,
  apiEnrollment,
  apiEnrollmentPublic,
};
