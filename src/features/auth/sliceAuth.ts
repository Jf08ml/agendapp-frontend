import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  organizationId: string | null;
  token: string | null;
  role: string | null;
  permissions: string[];
  expiresAt: string | null; // ISO timestamp de expiración del token
}

// Utilidades para manejar localStorage
const storagePrefix = "app_";
const getStorageItem = (key: string) =>
  localStorage.getItem(`${storagePrefix}${key}`);
const setStorageItem = (key: string, value: string) =>
  localStorage.setItem(`${storagePrefix}${key}`, value);
const removeStorageItem = (key: string) =>
  localStorage.removeItem(`${storagePrefix}${key}`);

// Comprueba si hay datos en localStorage
const storedUserId = getStorageItem("userId");
const storedToken = getStorageItem("token");
const storedRole = getStorageItem("role");
const storedExpiresAt = getStorageItem("token_expires_at");

const initialState: AuthState = {
  isAuthenticated: !!storedToken,
  userId: storedUserId,
  organizationId: null,
  token: storedToken,
  role: storedRole,
  permissions: [],
  expiresAt: storedExpiresAt,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{
        userId: string;
        organizationId: string;
        token: string;
        role: string;
        permissions: string[];
        expiresAt?: string;
      }>
    ) => {
      state.isAuthenticated = true;
      state.userId = action.payload.userId;
      state.organizationId = action.payload.organizationId;
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.permissions = action.payload.permissions;
      state.expiresAt = action.payload.expiresAt || null;

      // Guardar los datos en localStorage
      setStorageItem("userId", action.payload.userId);
      setStorageItem("token", action.payload.token);
      setStorageItem("role", action.payload.role);
      if (action.payload.expiresAt) {
        setStorageItem("token_expires_at", action.payload.expiresAt);
      }
    },
    refreshTokenSuccess: (
      state,
      action: PayloadAction<{
        token: string;
        expiresAt?: string;
      }>
    ) => {
      state.token = action.payload.token;
      state.expiresAt = action.payload.expiresAt || null;

      // Actualizar únicamente el token en localStorage
      setStorageItem("token", action.payload.token);
      if (action.payload.expiresAt) {
        setStorageItem("token_expires_at", action.payload.expiresAt);
      }
    },
    setOrganizationId: (state, action: PayloadAction<string>) => {
      state.organizationId = action.payload;
    },
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.userId = null;
      state.organizationId = null;
      state.token = null;
      state.role = null;
      state.permissions = [];
      state.expiresAt = null;

      // Eliminar datos de localStorage
      removeStorageItem("userId");
      removeStorageItem("token");
      removeStorageItem("role");
      removeStorageItem("token_expires_at");
      // Limpiar slug de dev para no quedar pegado a una org
      localStorage.removeItem("app_dev_slug");
      // Limpiar flags de sesión de impersonación de superadmin
      localStorage.removeItem("sa_is_impersonating");
      localStorage.removeItem("sa_backup");
    },
  },
});

export const { loginSuccess, refreshTokenSuccess, logout, setOrganizationId, setPermissions } = authSlice.actions;
export default authSlice.reducer;
