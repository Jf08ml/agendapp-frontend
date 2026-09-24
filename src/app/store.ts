import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import authReducer from "../features/auth/sliceAuth";
import organizationReducer from "../features/organization/sliceOrganization";
import { clearOfflineCache } from "../utils/offlineCache";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    organization: organizationReducer,
  },
});

// Al cerrar sesión (voluntaria, expirada o revocada) se borra la copia offline
// de la agenda: contiene datos de clientes y no debe quedar en el dispositivo.
// (El cierre forzado por 401 en axiosConfig.ts lo hace por su cuenta porque
// recarga la página sin pasar por el store.)
let wasAuthenticated = store.getState().auth.isAuthenticated;
store.subscribe(() => {
  const isAuthenticated = store.getState().auth.isAuthenticated;
  if (wasAuthenticated && !isAuthenticated) {
    void clearOfflineCache();
  }
  wasAuthenticated = isAuthenticated;
});

// Tipos derivados del store para usarlos en otros archivos
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks tipados para usar en lugar de useDispatch y useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
