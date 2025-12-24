// features/organization/sliceOrganization.ts
import {
  createSlice,
  PayloadAction,
  createAsyncThunk,
  createAction,
} from "@reduxjs/toolkit";
import {
  Organization,
  ReservationPolicy,
  getOrganizationById,
  getOrganizationConfig,
  updateOrganization,
} from "../../services/organizationService";

// === Tipos opcionales para WA ===
export type WaCode =
  | "connecting"
  | "waiting_qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "auth_failure"
  | "reconnecting"
  | "error";

export interface WaMe {
  id?: string;
  name?: string;
}

// ---- STATE ----
interface OrganizationState {
  organization: Organization | null;
  loading: boolean;
  error: string | null;

  // WhatsApp status (UI)
  whatsappStatus: WaCode | ""; // estado principal
  whatsappReason: string | null; // explicación (quiet hours, not_ready, rate limit, etc.)
  whatsappReadySince?: number | null; // epoch ms cuando pasó a ready (si lo envías)
  whatsappMe?: WaMe | null; // info de la cuenta, si la envías
  savingPolicy?: boolean; // para el updateReservationPolicy thunk
}

const initialState: OrganizationState = {
  organization: null,
  loading: true,
  error: null,

  whatsappStatus: "",
  whatsappReason: null,
  whatsappReadySince: null,
  whatsappMe: null,

  savingPolicy: false,
};

// ---- THUNKS ----

// 1) Por ID
export const fetchOrganization = createAsyncThunk(
  "organization/fetchOrganization",
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const organization = await getOrganizationById(organizationId);
      return organization;
    } catch (error) {
      console.error("Error fetching organization:", error);
      return rejectWithValue(
        "Error al cargar la información de la organización"
      );
    }
  }
);

// 2) Por dominio (branding)
export const fetchOrganizationConfig = createAsyncThunk(
  "organization/fetchOrganizationConfig",
  async (_, { rejectWithValue }) => {
    try {
      const organization = await getOrganizationConfig();
      return organization;
    } catch (error) {
      console.error("Error fetching organization by domain:", error);
      return rejectWithValue("Error al cargar la organización por dominio");
    }
  }
);

export const updateReservationPolicy = createAsyncThunk(
  "organization/updateReservationPolicy",
  async (
    {
      organizationId,
      policy,
    }: { organizationId: string; policy: ReservationPolicy },
    { rejectWithValue }
  ) => {
    try {
      const updated = await updateOrganization(organizationId, {
        reservationPolicy: policy,
      });
      return updated; // Organization
    } catch (error) {
      console.error("Error updating reservation policy:", error);
      return rejectWithValue(
        "No se pudo actualizar la política de agendamiento"
      );
    }
  }
);

// ---- ACTION (para code + reason) ----
// La usamos desde el socket y desde getWaStatus()
export const setWhatsappMeta = createAction<{
  code?: WaCode | "";
  reason?: string | null;
  readySince?: number | null;
  me?: WaMe | null;
}>("organization/setWhatsappMeta");

// ---- SLICE ----
const organizationSlice = createSlice({
  name: "organization",
  initialState,
  reducers: {
    clearOrganization: (state) => {
      state.organization = null;
      state.loading = false;
      state.error = null;

      state.whatsappStatus = "";
      state.whatsappReason = null;
      state.whatsappReadySince = null;
      state.whatsappMe = null;
    },
    updateOrganizationState: (state, action: PayloadAction<Organization>) => {
      state.organization = action.payload;
    },

    // Compatibilidad hacia atrás (si en algunos lados sólo envías el code)
    setWhatsappStatus: (state, action: PayloadAction<string>) => {
      state.whatsappStatus = action.payload as WaCode;
      // no toca reason ni otros campos
    },
  },
  extraReducers: (builder) => {
    // fetchOrganization por ID
    builder
      .addCase(fetchOrganization.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchOrganization.fulfilled,
        (state, action: PayloadAction<Organization | null>) => {
          state.loading = false;
          state.organization = action.payload;
        }
      )
      .addCase(fetchOrganization.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchOrganizationConfig por dominio
    builder
      .addCase(fetchOrganizationConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchOrganizationConfig.fulfilled,
        (state, action: PayloadAction<Organization | null>) => {
          state.loading = false;
          state.organization = action.payload;
        }
      )
      .addCase(fetchOrganizationConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // setWhatsappMeta (code + reason + extra)
    builder.addCase(setWhatsappMeta, (state, { payload }) => {
      if (payload.code !== undefined) state.whatsappStatus = payload.code;
      if (payload.reason !== undefined) state.whatsappReason = payload.reason;
      if (payload.readySince !== undefined)
        state.whatsappReadySince = payload.readySince;
      if (payload.me !== undefined) state.whatsappMe = payload.me;
    });

    builder
      .addCase(updateReservationPolicy.pending, (state) => {
        state.savingPolicy = true;
      })
      .addCase(
        updateReservationPolicy.fulfilled,
        (state, action: PayloadAction<Organization | null>) => {
          state.savingPolicy = false;
          if (action.payload) {
            state.organization = action.payload; // ya trae reservationPolicy actualizada
          }
        }
      )
      .addCase(updateReservationPolicy.rejected, (state, action) => {
        state.savingPolicy = false;
        state.error =
          (action.payload as string) ?? "Error al guardar la política";
      });
  },
});

export const {
  clearOrganization,
  updateOrganizationState,
  setWhatsappStatus, // legacy-compatible
} = organizationSlice.actions;

export default organizationSlice.reducer;

// ---- Selectores útiles (opcional) ----
export const selectOrganization = (s: { organization: OrganizationState }) =>
  s.organization.organization;
export const selectOrgLoading = (s: { organization: OrganizationState }) =>
  s.organization.loading;
export const selectWaStatus = (s: { organization: OrganizationState }) =>
  s.organization.whatsappStatus;
export const selectWaReason = (s: { organization: OrganizationState }) =>
  s.organization.whatsappReason;
export const selectWaIsReady = (s: { organization: OrganizationState }) =>
  s.organization.whatsappStatus === "ready";

export const selectReservationPolicy = (s: {
  organization: OrganizationState;
}) => s.organization.organization?.reservationPolicy ?? "manual";

export const selectSavingPolicy = (s: { organization: OrganizationState }) =>
  Boolean(s.organization.savingPolicy);
