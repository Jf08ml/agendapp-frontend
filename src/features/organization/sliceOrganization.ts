import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import {
  Organization,
  getOrganizationById,
} from "../../services/organizationService";

interface OrganizationState {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  whatsappStatus: string; // <-- NUEVO CAMPO
}

// Estado inicial
const initialState: OrganizationState = {
  organization: null,
  loading: true,
  error: null,
  whatsappStatus: "", // <-- INICIALIZA VACÍO
};

// Thunk para obtener la organización
export const fetchOrganization = createAsyncThunk(
  "organization/fetchOrganization",
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const organization = await getOrganizationById(organizationId);
      return organization;
    } catch (error) {
      console.log("Error al cargar la información de la organización:", error);
      return rejectWithValue(
        "Error al cargar la información de la organización"
      );
    }
  }
);

const organizationSlice = createSlice({
  name: "organization",
  initialState,
  reducers: {
    clearOrganization: (state) => {
      state.organization = null;
      state.loading = false;
      state.error = null;
      state.whatsappStatus = ""; // limpia también el estado de WhatsApp
    },
    updateOrganizationState: (state, action: PayloadAction<Organization>) => {
      state.organization = action.payload;
    },
    setWhatsappStatus: (state, action: PayloadAction<string>) => {
      state.whatsappStatus = action.payload; // NUEVA ACCIÓN
    },
  },
  extraReducers: (builder) => {
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
  },
});

export const { clearOrganization, updateOrganizationState, setWhatsappStatus } =
  organizationSlice.actions;

export default organizationSlice.reducer;
