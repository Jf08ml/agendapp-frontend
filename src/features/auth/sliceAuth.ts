import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  organizationId: string | null;
  token: string | null;
  role: string | null;
  permissions: string[];
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

const initialState: AuthState = {
  isAuthenticated: !!storedToken,
  userId: storedUserId,
  organizationId: null,
  token: storedToken,
  role: storedRole,
  permissions: [],
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
      }>
    ) => {
      state.isAuthenticated = true;
      state.userId = action.payload.userId;
      state.organizationId = action.payload.organizationId;
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.permissions = action.payload.permissions;

      // Guardar los datos en localStorage
      setStorageItem("userId", action.payload.userId);
      setStorageItem("token", action.payload.token);
      setStorageItem("role", action.payload.role);
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

      // Eliminar datos de localStorage
      removeStorageItem("userId");
      removeStorageItem("token");
      removeStorageItem("role");
    },
  },
});

export const { loginSuccess, logout, setOrganizationId, setPermissions } =
  authSlice.actions;
export default authSlice.reducer;
