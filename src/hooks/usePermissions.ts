import { useSelector } from "react-redux";

export const usePermissions = () => {
  const permissions =
    useSelector(
      (state: { auth: { permissions: string[] } }) => state.auth.permissions
    ) ?? [];

  const role = useSelector(
    (state: { auth: { role: string | null } }) => state.auth.role
  );

  const hasPermission = (permission: string) => {
    // Superadmin de plataforma tiene acceso total sin permisos explícitos
    if (role === "superadmin") return true;
    return Array.isArray(permissions) && permissions.includes(permission);
  };

  return { hasPermission };
};
