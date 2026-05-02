// Componentes compartidos: estado WhatsApp, menú de acciones, modo recordatorios
// Cada variante los recibe con su propio "theme" (colores, radii, fuentes).

const WhatsAppStatus = ({ theme, status = "connected", onClick }) => {
  // status: "connected" | "syncing" | "disconnected" | "warning"
  const config = {
    connected: {
      bg: theme.waBg || "#E8F8EE",
      color: theme.waColor || "#1FA653",
      dot: "#1FA653",
      label: "WhatsApp conectado",
      detail: "Listo para enviar",
    },
    syncing: {
      bg: "#FEF6E0",
      color: "#A1740A",
      dot: "#E0B025",
      label: "Sincronizando...",
      detail: "Reconectando",
    },
    disconnected: {
      bg: "#FDECEC",
      color: "#B23A3A",
      dot: "#D14747",
      label: "WhatsApp desconectado",
      detail: "Toca para reconectar",
    },
    warning: {
      bg: "#FFF1E6",
      color: "#B25A1B",
      dot: "#E07825",
      label: "Cola pendiente",
      detail: "12 mensajes esperando",
    },
  }[status];

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 12px 7px 10px",
        background: config.bg,
        borderRadius: theme.radius || 10,
        cursor: "pointer",
        border: theme.border ? `1px solid ${theme.border}` : "none",
        fontFamily: theme.font || "inherit",
      }}
    >
      <div style={{ position: "relative", width: 22, height: 22 }}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill={config.color}>
          <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.2-1.4c1.4.7 3 1.2 4.8 1.2h.1c5.5 0 10-4.5 10-10S17.5 2 12 2z M12 20c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3C3.9 14.7 3.5 13.4 3.5 12 3.5 7.3 7.3 3.5 12 3.5s8.5 3.8 8.5 8.5S16.7 20 12 20z"/>
        </svg>
        <div style={{
          position: "absolute",
          bottom: -1, right: -1,
          width: 9, height: 9,
          borderRadius: "50%",
          background: config.dot,
          border: `2px solid ${config.bg}`,
          animation: status === "syncing" ? "pulse 1.4s infinite" : "none",
        }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: config.color }}>
          {config.label}
        </span>
        <span style={{ fontSize: 10, color: config.color, opacity: 0.75 }}>
          {config.detail}
        </span>
      </div>
    </div>
  );
};

const ActionsMenu = ({ theme, onAction, open, onToggle }) => {
  const items = [
    { id: "search", icon: "⌕", label: "Buscar citas", shortcut: "⌘K" },
    { id: "reload", icon: "↻", label: "Recargar agenda" },
    { id: "reorder", icon: "⇅", label: "Reordenar profesionales" },
    { id: "remind", icon: "✉", label: "Enviar recordatorios", highlight: true },
    { id: "export", icon: "↧", label: "Exportar mes" },
  ];

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={onToggle}
        style={{
          width: 36, height: 36,
          borderRadius: theme.radius || 10,
          background: open ? (theme.deep || "#1E3A8A") : (theme.surface || "#fff"),
          color: open ? "#fff" : (theme.body || "#444"),
          border: `1px solid ${open ? (theme.deep || "#1E3A8A") : (theme.border || "#E6E9F2")}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          fontWeight: 700,
          transition: "all 0.15s",
        }}
      >
        ⋮
      </div>

      {open && (
        <>
          <div
            onClick={onToggle}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
            }}
          />
          <div style={{
            position: "absolute",
            top: 44,
            right: 0,
            width: 240,
            background: theme.surface || "#fff",
            border: `1px solid ${theme.border || "#E6E9F2"}`,
            borderRadius: theme.radius || 10,
            boxShadow: "0 10px 30px rgba(15,23,41,0.12), 0 2px 6px rgba(15,23,41,0.06)",
            padding: 6,
            zIndex: 101,
            fontFamily: theme.font || "inherit",
          }}>
            {items.map((item, i) => (
              <React.Fragment key={item.id}>
                {item.highlight && i > 0 && (
                  <div style={{ height: 1, background: theme.border || "#E6E9F2", margin: "4px 0" }} />
                )}
                <div
                  onClick={() => { onAction(item.id); onToggle(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    color: item.highlight ? (theme.deep || "#1E3A8A") : (theme.ink || "#0F1729"),
                    fontWeight: item.highlight ? 600 : 500,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = theme.hoverBg || "#F4F6FB"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{
                    fontSize: 14,
                    width: 20,
                    textAlign: "center",
                    color: item.highlight ? (theme.deep || "#1E3A8A") : (theme.muted || "#8A92A6"),
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.shortcut && (
                    <span style={{
                      fontSize: 10,
                      color: theme.muted || "#8A92A6",
                      background: theme.hoverBg || "#F4F6FB",
                      padding: "2px 5px",
                      borderRadius: 4,
                      fontFamily: "ui-monospace, monospace",
                    }}>
                      {item.shortcut}
                    </span>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Banner de modo recordatorios (cuando está activo, las celdas son seleccionables)
const ReminderBanner = ({ theme, count, day, onCancel, onSend }) => {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 16px",
      background: theme.waBg || "#E8F8EE",
      border: `1px solid ${theme.waColor || "#1FA653"}33`,
      borderRadius: theme.radius || 10,
      gap: 12,
      fontFamily: theme.font || "inherit",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 28, height: 28,
          borderRadius: "50%",
          background: theme.waColor || "#1FA653",
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
        }}>✉</div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.waColor || "#1FA653" }}>
            {day ? `Listo para enviar — ${day} de Abril` : "Selecciona un día para enviar recordatorios"}
          </div>
          <div style={{ fontSize: 11, color: theme.body || "#454C61" }}>
            {day
              ? `Se enviarán ${count} recordatorios de WhatsApp a los clientes con cita ese día.`
              : "Toca cualquier día con citas para preparar los mensajes."}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div
          onClick={onCancel}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "transparent",
            color: theme.body || "#454C61",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >Cancelar</div>
        <div
          onClick={day ? onSend : undefined}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            background: day ? (theme.waColor || "#1FA653") : "#C8D5CD",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: day ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Enviar {count > 0 ? `(${count})` : ""}
        </div>
      </div>
    </div>
  );
};

// Hook compartido para el estado de "modo recordatorio"
const useReminderMode = () => {
  const [reminderMode, setReminderMode] = React.useState(false);
  const [reminderDay, setReminderDay] = React.useState(null);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleAction = (id) => {
    if (id === "remind") {
      setReminderMode(true);
      setReminderDay(null);
    }
  };

  const cancelReminder = () => {
    setReminderMode(false);
    setReminderDay(null);
  };

  const sendReminder = () => {
    setReminderMode(false);
    setReminderDay(null);
    // toast simulado
  };

  return {
    reminderMode, reminderDay, setReminderDay,
    menuOpen, setMenuOpen,
    handleAction, cancelReminder, sendReminder,
  };
};

Object.assign(window, {
  WhatsAppStatus, ActionsMenu, ReminderBanner, useReminderMode,
});
