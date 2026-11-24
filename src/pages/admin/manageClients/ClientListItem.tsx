// Fila de cliente (rediseño, ClientesPanel): en escritorio, fila de tabla
// (Cliente con nombre y teléfono · Servicios · Referidos · Premio · «⋯»); en
// móvil, fila compacta con los mismos datos en texto normal. Tocar la fila abre
// la ficha lateral; las acciones van en el menú «⋯».
import React from "react";
import { useSelector } from "react-redux";
import { ActionIcon, Menu } from "@mantine/core";
import { IconCirclePlus, IconDots, IconEye, IconGift, IconPencil, IconUserPlus } from "@tabler/icons-react";
import { RootState } from "../../../app/store";
import { selectOrganization } from "../../../features/organization/sliceOrganization";
import { Client } from "../../../services/clientService";
import { getCountryFlag } from "../../../utils/countryHelper";
import { formatCurrency } from "../../../utils/formatCurrency";
import { lastVisitLabel, type ClientStat } from "./clientSegments";

interface ClientListItemProps {
  client: Client;
  /** Cifras del servidor; undefined mientras cargan. */
  stat?: ClientStat;
  /** Mostrar las cifras de visitas (ya cargaron). */
  showStats?: boolean;
  isMobile: boolean;
  selected?: boolean;
  onOpenDetail: (clientId: string) => void;
  onRegisterService: (clientId: string) => void;
  onReferral: (clientId: string) => void;
  onEditClient: (client: Client) => void;
}

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

function ActionsMenu({
  client,
  onOpenDetail,
  onRegisterService,
  onReferral,
  onEditClient,
}: Omit<ClientListItemProps, "isMobile" | "selected" | "stat" | "showStats">) {
  return (
    <Menu position="bottom-end" withinPortal shadow="lg">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`Acciones de ${client.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
        <Menu.Item leftSection={<IconEye size={16} />} onClick={() => onOpenDetail(client._id)}>
          Ver ficha
        </Menu.Item>
        <Menu.Item leftSection={<IconCirclePlus size={16} />} onClick={() => onRegisterService(client._id)}>
          Registrar servicio
        </Menu.Item>
        <Menu.Item leftSection={<IconUserPlus size={16} />} onClick={() => onReferral(client._id)}>
          Registrar referido
        </Menu.Item>
        <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEditClient(client)}>
          Editar cliente
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

const ClientListItem: React.FC<ClientListItemProps> = React.memo((props) => {
  const { client, isMobile, selected, onOpenDetail, stat, showStats } = props;
  const organization = useSelector((state: RootState) => selectOrganization(state));
  const currency = organization?.currency || "COP";
  const loyaltyEnabled = organization?.showLoyaltyProgram !== false;
  const rewardReady = loyaltyEnabled && !!(client.hasServiceDiscount || client.hasReferralBenefit);
  const phone = `${client.phone_country ? `${getCountryFlag(client.phone_country)} ` : ""}${client.phoneNumber ?? ""}`;

  const who = (
    <div className="ag-who" style={{ minWidth: 0 }}>
      <span className="ag-avatar">{initials(client.name)}</span>
      <div style={{ minWidth: 0 }}>
        <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.name}</b>
        <span className="ag-num" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {phone}
        </span>
      </div>
    </div>
  );

  const reward = rewardReady && (
    <span className="ag-badge ag-badge--success">
      <IconGift size={14} stroke={2} /> Premio listo
    </span>
  );

  if (isMobile) {
    return (
      <div
        className="ag-list-row"
        role="button"
        tabIndex={0}
        aria-selected={selected}
        onClick={() => onOpenDetail(client._id)}
        onKeyDown={(e) => e.key === "Enter" && onOpenDetail(client._id)}
        style={{ cursor: "pointer", padding: "var(--space-3) var(--space-3)", background: selected ? "var(--brand-soft)" : undefined }}
      >
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {who}
          {showStats && (
            <div className="ag-subtle" style={{ paddingLeft: 44 }}>
              {lastVisitLabel(stat?.lastVisit)}
              {stat?.visits ? ` · ${stat.visits} ${stat.visits === 1 ? "visita" : "visitas"}` : ""}
            </div>
          )}
          {(loyaltyEnabled || rewardReady) && (
            <div className="ag-row" style={{ paddingLeft: 44, gap: 8 }}>
              {loyaltyEnabled && (
                <span className="ag-subtle">
                  {client.servicesTaken} {client.servicesTaken === 1 ? "servicio" : "servicios"} · {client.referralsMade}{" "}
                  {client.referralsMade === 1 ? "referido" : "referidos"}
                </span>
              )}
              {reward}
            </div>
          )}
        </div>
        <ActionsMenu {...props} />
      </div>
    );
  }

  return (
    <tr
      aria-selected={selected}
      onClick={() => onOpenDetail(client._id)}
      style={{ cursor: "pointer" }}
    >
      <td>{who}</td>
      {showStats && <td style={{ whiteSpace: "nowrap" }}>{lastVisitLabel(stat?.lastVisit)}</td>}
      {showStats && <td className="num">{stat?.visits ?? 0}</td>}
      {showStats && <td className="num">{stat?.totalSpent ? formatCurrency(stat.totalSpent, currency) : "—"}</td>}
      {loyaltyEnabled && <td className="num">{client.servicesTaken}</td>}
      {loyaltyEnabled && <td className="num">{client.referralsMade}</td>}
      {loyaltyEnabled && <td>{reward || <span className="ag-subtle">—</span>}</td>}
      <td style={{ width: 48, textAlign: "right" }}>
        <ActionsMenu {...props} />
      </td>
    </tr>
  );
});

ClientListItem.displayName = "ClientListItem";

export default ClientListItem;
