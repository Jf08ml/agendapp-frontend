import { useSelector } from "react-redux";

export const usePermissions = () => {
  const permissions =
    useSelector(
      (state: { auth: { permissions: string[] } }) => state.auth.permissions
    ) ?? [];

  const hasPermission = (permission: string) => {
    return Array.isArray(permissions) && permissions.includes(permission);
  };

  return { hasPermission };
};
