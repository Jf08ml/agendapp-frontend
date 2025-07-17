import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import {
  Organization,
  getOrganizationById,
  getOrganizationConfig, // nuevo: fetch a /api/organization-config
} from "../../services/organizationService";

// ---- STATE ----
interface OrganizationState {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  whatsappStatus: string;
}

const initialState: OrganizationState = {
  organization: null,
  loading: true,
  error: null,
  whatsappStatus: "",
};

// ---- THUNKS ----

// 1. Por ID (panel admin, multi-sede, etc)
export const fetchOrganization = createAsyncThunk(
  "organization/fetchOrganization",
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const organization = await getOrganizationById(organizationId);
      return organization;
    } catch (error) {
      console.log("Error fetching organization:", error);
      return rejectWithValue(
        "Error al cargar la información de la organización"
      );
    }
  }
);

// 2. Por dominio (branding automático)
export const fetchOrganizationConfig = createAsyncThunk(
  "organization/fetchOrganizationConfig",
  async (_, { rejectWithValue }) => {
    try {
      const organization = await getOrganizationConfig();
      return organization;
    } catch (error) {
      console.log("Error fetching organization by domain:", error);
      return rejectWithValue("Error al cargar la organización por dominio");
    }
  }
);

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
    },
    updateOrganizationState: (state, action: PayloadAction<Organization>) => {
      state.organization = action.payload;
    },
    setWhatsappStatus: (state, action: PayloadAction<string>) => {
      state.whatsappStatus = action.payload;
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
  },
});

export const { clearOrganization, updateOrganizationState, setWhatsappStatus } =
  organizationSlice.actions;

export default organizationSlice.reducer;
