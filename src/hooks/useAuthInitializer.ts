import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setOrganizationId, setPermissions } from "../features/auth/sliceAuth";
import { getEmployeeById } from "../services/employeeService";
import { RootState, AppDispatch } from "../app/store";

const useAuthInitializer = () => {
  const dispatch: AppDispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = useSelector((state: RootState) => state.auth.userId);
  const role = useSelector((state: RootState) => state.auth.role);
  const organization = useSelector(
    (state: RootState) => state.organization.organization
  );
  const organizationLoading = useSelector(
    (state: RootState) => state.organization.loading
  );

const useAuthInitializer = () => {
  const dispatch: AppDispatch = useDispatch();
  const token = useSelector((state: RootState) => state.auth.token);
  const userId = useSelector((state: RootState) => state.auth.userId);
  const authRole = useSelector((state: RootState) => state.auth.role); // "admin" | "employee" | ...
  const organization = useSelector(
    (state: RootState) => state.organization.organization as Organization | null
  );
  const organizationLoading = useSelector(
    (state: RootState) => state.organization.loading
  );

  useEffect(() => {
    if (!organizationLoading && organization && token) {
      const fetchPermissions = async () => {
        try {
          if (authRole === "admin" && userId) {
            if (organization._id) {
              dispatch(setOrganizationId(organization._id));
            }

            // organization.role puede ser Role o string (id)
            let orgPermissions: string[] = [];
            if (isRole(organization.role)) {
              orgPermissions = organization.role.permissions ?? [];
            } else {
              // viene como string (id) -> resolver desde API
              const roleDoc = await getRoleById(organization.role).catch(() => null);
              orgPermissions = roleDoc?.permissions ?? [];
            }

            dispatch(setPermissions(orgPermissions));
          } else if (authRole === "employee" && userId) {
            const employeeData = await getEmployeeById(userId);
            if (!employeeData) return;

            // employeeData.role también puede ser Role | string
            let basePermissions: string[] = [];
            if (employeeData.role && typeof employeeData.role !== "string") {
              basePermissions = employeeData.role.permissions ?? [];
            } else if (typeof employeeData.role === "string") {
              const roleDoc = await getRoleById(employeeData.role).catch(() => null);
              basePermissions = roleDoc?.permissions ?? [];
            }

            const custom = employeeData.customPermissions ?? [];
            const merged = Array.from(new Set([...basePermissions, ...custom]));

            if (employeeData.organizationId) {
              dispatch(setOrganizationId(employeeData.organizationId));
            }
            dispatch(setPermissions(merged));
          }
        } catch (error) {
          console.error("Error al obtener los permisos:", error);
          dispatch(setPermissions([]));
        }
      };

      fetchPermissions();
    }
  }, [token, organization, organizationLoading, dispatch, authRole, userId]);
};

export default useAuthInitializer;
