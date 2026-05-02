// V3 — "Día partido": calendario + panel lateral con detalle del día seleccionado.
// Más cálido (azul + crema), tipografía editorial. Click en cualquier día → panel se actualiza.
const V3SidePanel = () => {
  const D = window.CALENDAR_DATA;
  const [selected, setSelected] = React.useState(D.today);
  const RM = useReminderMode();

  const BRAND = {
    deep: "#1E3A8A",
    primary: "#3B5BDB",
    primarySoft: "#EEF1FF",
    cream: "#FAF7F2",
    creamDark: "#F1ECE2",
    ink: "#101526",
    body: "#404760",
    muted: "#8B92A6",
    line: "#E7E2D6",
    lineSoft: "#F0EBE0",
    surface: "#FFFFFF",
    accent: "#D97A4A", // terracota cálido como complemento
    accentSoft: "#FDF1E8",
  };

  const PRO = {
    Ana: { color: "#3B5BDB", initials: "A" },
    Pedro: { color: "#10B981", initials: "P" },
    Lucía: { color: "#D97A4A", initials: "L" },
  };

  const COLOR_TO_PRO = { azul: "Ana", verde: "Pedro", rosa: "Lucía" };

  const v3 = {
    wrap: {
      width: "100%", height: "100%",
      background: BRAND.cream,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      color: BRAND.ink,
      display: "grid",
      gridTemplateColumns: "1fr 340px",
      padding: 22,
      gap: 16,
      boxSizing: "border-box",
    },

    // LEFT: calendar
    left: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minWidth: 0,
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    titleWrap: { display: "flex", flexDirection: "column", gap: 2 },
    eyebrow: {
      fontSize: 10.5,
      letterSpacing: 2,
      color: BRAND.muted,
      textTransform: "uppercase",
      fontWeight: 700,
    },
    title: {
      fontFamily: "'Fraunces', 'Plus Jakarta Sans', serif",
      fontSize: 30,
      fontWeight: 600,
      letterSpacing: -1,
      color: BRAND.ink,
      lineHeight: 1,
    },
    titleYear: { color: BRAND.muted, fontStyle: "italic", fontWeight: 400 },

    rightHeader: { display: "flex", alignItems: "center", gap: 10 },
    segmented: {
      display: "inline-flex",
      background: BRAND.surface,
      border: `1px solid ${BRAND.line}`,
      borderRadius: 999,
      padding: 3,
    },
    segItem: (active) => ({
      padding: "6px 16px",
      fontSize: 12.5,
      fontWeight: 600,
      borderRadius: 999,
      cursor: "pointer",
      background: active ? BRAND.deep : "transparent",
      color: active ? "#fff" : BRAND.body,
    }),
    iconBtn: {
      width: 36, height: 36,
      borderRadius: 999,
      background: BRAND.surface,
      border: `1px solid ${BRAND.line}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: BRAND.body,
      cursor: "pointer",
    },

    toolbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 4px",
    },
    leftTools: { display: "flex", alignItems: "center", gap: 10 },
    todayPill: {
      padding: "7px 14px",
      borderRadius: 999,
      background: BRAND.surface,
      border: `1px solid ${BRAND.line}`,
      fontSize: 12,
      fontWeight: 600,
      color: BRAND.body,
      cursor: "pointer",
    },
    proLegend: { display: "flex", gap: 12, alignItems: "center" },
    proItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: BRAND.body, fontWeight: 500 },
    proDot: (c) => ({ width: 8, height: 8, borderRadius: "50%", background: c }),

    calendar: {
      flex: 1,
      background: BRAND.surface,
      border: `1px solid ${BRAND.line}`,
      borderRadius: 18,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    weekHeader: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      borderBottom: `1px solid ${BRAND.line}`,
      background: BRAND.cream,
    },
    weekHeaderCell: (i) => ({
      textAlign: "center",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1.5,
      color: i === 0 || i === 6 ? BRAND.deep : BRAND.muted,
      padding: "12px 0",
    }),
    grid: {
      flex: 1,
      display: "grid",
      gridTemplateRows: "repeat(5, 1fr)",
    },
    row: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      borderBottom: `1px solid ${BRAND.lineSoft}`,
    },
    cell: (state) => {
      const base = {
        borderRight: `1px solid ${BRAND.lineSoft}`,
        padding: "10px 9px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 0,
        cursor: "pointer",
        position: "relative",
        background: BRAND.surface,
        transition: "background 0.15s",
      };
      if (state.outside) {
        base.background = BRAND.cream;
        base.opacity = 0.7;
      }
      if (state.holiday && !state.outside) {
        base.background = BRAND.accentSoft;
      }
      if (state.selected) {
        base.background = BRAND.deep;
      }
      return base;
    },
    dayNum: (state) => {
      const base = {
        fontFamily: "'Fraunces', serif",
        fontSize: 18,
        fontWeight: 500,
        color: BRAND.ink,
        letterSpacing: -0.4,
      };
      if (state.outside) base.color = "#C9C2B5";
      if (state.holiday && !state.outside) base.color = BRAND.accent;
      if (state.weekend && !state.outside && !state.holiday) base.color = BRAND.body;
      if (state.today && !state.selected) {
        base.color = BRAND.deep;
        base.fontWeight = 700;
      }
      if (state.selected) base.color = "#fff";
      return base;
    },
    todayBadge: {
      fontSize: 8.5,
      fontWeight: 800,
      letterSpacing: 1,
      color: BRAND.deep,
      textTransform: "uppercase",
      marginLeft: 6,
    },
    holBadge: {
      fontSize: 8.5,
      fontWeight: 800,
      letterSpacing: 1,
      color: BRAND.accent,
      textTransform: "uppercase",
    },

    avatarsRow: {
      display: "flex",
      alignItems: "center",
      gap: -4,
      marginTop: "auto",
    },
    avatar: (color, selected) => ({
      width: 18, height: 18,
      borderRadius: "50%",
      background: color,
      color: "#fff",
      fontSize: 9,
      fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: `1.5px solid ${selected ? BRAND.deep : "#fff"}`,
      marginLeft: -4,
    }),
    countText: (selected) => ({
      fontSize: 10.5,
      color: selected ? "rgba(255,255,255,0.8)" : BRAND.muted,
      fontWeight: 600,
      marginLeft: 6,
    }),

    // RIGHT: detail panel
    panel: {
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minHeight: 0,
    },
    statsCard: {
      background: BRAND.deep,
      color: "#fff",
      borderRadius: 16,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      backgroundImage: "radial-gradient(circle at 90% 0%, rgba(255,255,255,0.08), transparent 60%)",
    },
    statsLabel: { fontSize: 10.5, letterSpacing: 2, opacity: 0.7, textTransform: "uppercase", fontWeight: 700 },
    statsRow: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
    statsBig: { fontFamily: "'Fraunces', serif", fontSize: 48, fontWeight: 500, letterSpacing: -2, lineHeight: 1 },
    statsSmall: { fontSize: 13, opacity: 0.85, fontWeight: 500 },
    miniBars: { display: "flex", alignItems: "flex-end", gap: 3, height: 28 },
    miniBar: (h) => ({
      width: 5,
      height: `${h}%`,
      background: "rgba(255,255,255,0.6)",
      borderRadius: 2,
    }),

    detailCard: {
      flex: 1,
      background: BRAND.surface,
      border: `1px solid ${BRAND.line}`,
      borderRadius: 16,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minHeight: 0,
    },
    detailHead: { display: "flex", alignItems: "baseline", justifyContent: "space-between" },
    detailDate: {
      fontFamily: "'Fraunces', serif",
      fontSize: 22,
      fontWeight: 600,
      letterSpacing: -0.5,
      color: BRAND.ink,
    },
    detailWeek: { fontSize: 11, color: BRAND.muted, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" },
    detailCount: {
      fontSize: 11.5,
      color: BRAND.body,
      fontWeight: 600,
    },

    apptScroll: {
      flex: 1,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      paddingRight: 4,
    },
    appt: {
      display: "grid",
      gridTemplateColumns: "44px 1fr auto",
      gap: 10,
      alignItems: "center",
      padding: "10px 12px",
      background: BRAND.cream,
      borderRadius: 10,
      borderLeft: `3px solid transparent`,
    },
    apptTime: {
      fontFamily: "'Fraunces', serif",
      fontSize: 14,
      fontWeight: 600,
      color: BRAND.ink,
    },
    apptClient: { fontSize: 13, fontWeight: 600, color: BRAND.ink, lineHeight: 1.2 },
    apptService: { fontSize: 11, color: BRAND.muted, marginTop: 2 },
    apptPro: (color) => ({
      width: 26, height: 26,
      borderRadius: "50%",
      background: color,
      color: "#fff",
      fontSize: 11,
      fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center",
    }),

    emptyState: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      color: BRAND.muted,
      fontSize: 13,
      textAlign: "center",
    },

    bookBtn: {
      background: BRAND.deep,
      color: "#fff",
      borderRadius: 10,
      padding: "11px 14px",
      fontSize: 13,
      fontWeight: 600,
      textAlign: "center",
      cursor: "pointer",
      boxShadow: "0 2px 6px rgba(30,58,138,0.2)",
    },
  };

  const selectedDate = selected;
  const selectedApts = D.appointments[selectedDate] || [];

  return (
    <div style={v3.wrap}>
      {/* LEFT */}
      <div style={v3.left}>
        <div style={v3.header}>
          <div style={v3.titleWrap}>
            <div style={v3.eyebrow}>Galaxia Glamour · Calendario</div>
            <div style={v3.title}>
              Abril <span style={v3.titleYear}>2026</span>
            </div>
          </div>
          <div style={v3.rightHeader}>
            <WhatsAppStatus
              theme={{ waBg: "#E8F8EE", waColor: "#1FA653", radius: 999, font: "'Plus Jakarta Sans', sans-serif" }}
              status="connected"
            />
            <div style={v3.segmented}>
              <div style={v3.segItem(true)}>Mes</div>
              <div style={v3.segItem(false)}>Semana</div>
              <div style={v3.segItem(false)}>Día</div>
            </div>
            <ActionsMenu
              theme={{ deep: BRAND.deep, surface: BRAND.surface, body: BRAND.body, ink: BRAND.ink, muted: BRAND.muted, border: BRAND.line, hoverBg: BRAND.cream, radius: 999, font: "'Plus Jakarta Sans', sans-serif" }}
              open={RM.menuOpen}
              onToggle={() => RM.setMenuOpen(!RM.menuOpen)}
              onAction={RM.handleAction}
            />
          </div>
        </div>

        <div style={v3.toolbar}>
          <div style={v3.leftTools}>
            <div style={v3.iconBtn}>‹</div>
            <div style={v3.todayPill}>Hoy</div>
            <div style={v3.iconBtn}>›</div>
          </div>
          <div style={v3.proLegend}>
            {Object.entries(PRO).map(([name, p]) => (
              <div key={name} style={v3.proItem}>
                <div style={v3.proDot(p.color)}></div>
                {name}
              </div>
            ))}
          </div>
        </div>

        {RM.reminderMode && (
          <ReminderBanner
            theme={{ waBg: "#E8F8EE", waColor: "#1FA653", body: BRAND.body, radius: 12, font: "'Plus Jakarta Sans', sans-serif" }}
            day={RM.reminderDay}
            count={RM.reminderDay ? (D.appointments[RM.reminderDay] || []).length : 0}
            onCancel={RM.cancelReminder}
            onSend={RM.sendReminder}
          />
        )}

        <div style={{ ...v3.calendar, ...(RM.reminderMode ? { borderColor: "#1FA653", boxShadow: "0 0 0 3px rgba(31,166,83,0.12)" } : {}) }}>
          <div style={v3.weekHeader}>
            {D.weekdaysShort.map((d, i) => (
              <div key={d} style={v3.weekHeaderCell(i)}>{d}</div>
            ))}
          </div>
          <div style={v3.grid}>
            {D.weeks.map((week, wi) => (
              <div key={wi} style={v3.row}>
                {week.map((cell, ci) => {
                  const isOutside = cell.prevMonth || cell.nextMonth;
                  const isHoliday = !isOutside && D.holidays.includes(cell.day);
                  const isWeekend = ci === 0 || ci === 6;
                  const isToday = !isOutside && cell.day === D.today;
                  const apts = !isOutside ? (D.appointments[cell.day] || []) : [];
                  const isReminderTarget = RM.reminderMode && cell.day === RM.reminderDay && !isOutside;
                  const isSelected = (!isOutside && cell.day === selected) || isReminderTarget;
                  const dimReminder = RM.reminderMode && apts.length === 0 && !isOutside;
                  const uniquePros = [...new Set(apts.map((a) => COLOR_TO_PRO[a.color]))];

                  return (
                    <div
                      key={ci}
                      style={{
                        ...v3.cell({
                          outside: isOutside,
                          holiday: isHoliday,
                          weekend: isWeekend,
                          today: isToday,
                          selected: isSelected,
                        }),
                        ...(isReminderTarget ? { background: "#1FA653" } : {}),
                        ...(dimReminder ? { opacity: 0.4 } : {}),
                      }}
                      onClick={() => {
                        if (isOutside) return;
                        if (RM.reminderMode) {
                          if (apts.length > 0) RM.setReminderDay(cell.day);
                        } else {
                          setSelected(cell.day);
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "baseline" }}>
                          <span style={v3.dayNum({
                            outside: isOutside,
                            holiday: isHoliday,
                            weekend: isWeekend,
                            today: isToday,
                            selected: isSelected,
                          })}>
                            {cell.day}
                          </span>
                          {isToday && !isSelected && <span style={v3.todayBadge}>Hoy</span>}
                        </div>
                        {isHoliday && (
                          <span style={{ ...v3.holBadge, color: isSelected ? "#FFB48A" : BRAND.accent }}>
                            Festivo
                          </span>
                        )}
                      </div>

                      {apts.length > 0 && (
                        <div style={v3.avatarsRow}>
                          {uniquePros.slice(0, 3).map((proName, i) => (
                            <div key={i} style={v3.avatar(PRO[proName].color, isSelected)}>
                              {PRO[proName].initials}
                            </div>
                          ))}
                          <span style={v3.countText(isSelected)}>
                            {apts.length} {apts.length === 1 ? "cita" : "citas"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT panel */}
      <div style={v3.panel}>
        <div style={v3.statsCard}>
          <div style={v3.statsLabel}>Citas este mes</div>
          <div style={v3.statsRow}>
            <div style={v3.statsBig}>35</div>
            <div style={v3.miniBars}>
              {[40, 70, 55, 90, 60, 35, 80, 65, 45, 75, 50, 30].map((h, i) => (
                <div key={i} style={v3.miniBar(h)} />
              ))}
            </div>
          </div>
          <div style={v3.statsSmall}>
            <span style={{ color: "#7DE5C0", fontWeight: 700 }}>↑ 18%</span> vs marzo · 72% ocupación
          </div>
        </div>

        <div style={v3.detailCard}>
          <div style={v3.detailHead}>
            <div>
              <div style={v3.detailWeek}>
                {D.weekdays[(D.weeks.flat().find((c) => c.day === selectedDate && !c.prevMonth && !c.nextMonth) ?
                  D.weeks.flat().findIndex((c) => c.day === selectedDate && !c.prevMonth && !c.nextMonth) % 7 : 0)]}
              </div>
              <div style={v3.detailDate}>{selectedDate} de Abril</div>
            </div>
            <div style={v3.detailCount}>
              {selectedApts.length === 0 ? "Sin citas" :
                `${selectedApts.length} ${selectedApts.length === 1 ? "cita" : "citas"}`}
            </div>
          </div>

          {selectedApts.length === 0 ? (
            <div style={v3.emptyState}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>○</div>
              <div>Día libre</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Sin citas agendadas</div>
            </div>
          ) : (
            <div style={v3.apptScroll}>
              {selectedApts.map((a, i) => {
                const proName = COLOR_TO_PRO[a.color];
                const pro = PRO[proName];
                return (
                  <div
                    key={i}
                    style={{
                      ...v3.appt,
                      borderLeftColor: pro.color,
                    }}
                  >
                    <div style={v3.apptTime}>{a.time}</div>
                    <div>
                      <div style={v3.apptClient}>{a.client}</div>
                      <div style={v3.apptService}>{a.service} · {proName}</div>
                    </div>
                    <div style={v3.apptPro(pro.color)}>{pro.initials}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={v3.bookBtn}>+ Crear cita para este día</div>
        </div>
      </div>
    </div>
  );
};

window.V3SidePanel = V3SidePanel;
