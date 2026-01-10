import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import authReducer from "../features/auth/sliceAuth";
import organizationReducer from "../features/organization/sliceOrganization";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    organization: organizationReducer,
  },
});

// Tipos derivados del store para usarlos en otros archivos
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks tipados para usar en lugar de useDispatch y useSelector
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
