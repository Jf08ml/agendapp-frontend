import { memo, useMemo, type ReactNode } from "react";
import classes from "./ChristmasDecorations.module.css";

// Tema navideño decorativo (Organization.seasonalTheme === "christmas").
// No toca los colores de marca: solo agrega nieve, una guirnalda de luces y un
// gorro sobre el logo. Cuándo se muestra lo decide utils/seasonalTheme.ts.

const BULB_COLORS = ["#e03131", "#f59f00", "#2f9e44", "#1c7ed6", "#e64980"];

// Pseudo-aleatorio determinista: los copos no "saltan" entre renders.
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Snow({ count, contained }: { count: number; contained: boolean }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${seeded(i, 1) * 100}%`,
        size: 8 + seeded(i, 2) * 10,
        duration: (contained ? 5 : 9) + seeded(i, 3) * (contained ? 4 : 9),
        delay: -seeded(i, 4) * 18,
        opacity: 0.55 + seeded(i, 5) * 0.4,
        char: seeded(i, 6) > 0.6 ? "❄" : "•",
      })),
    [count, contained]
  );

  return (
    <>
      {flakes.map((f, i) => (
        <span
          key={i}
          className={classes.flake}
          aria-hidden
          style={{
            left: f.left,
            fontSize: f.char === "•" ? f.size * 1.4 : f.size,
            opacity: f.opacity,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
          }}
        >
          {f.char}
        </span>
      ))}
    </>
  );
}

function Garland({ bulbs, top }: { bulbs: number; top: number }) {
  return (
    <div className={classes.garland} style={{ top }} aria-hidden>
      {Array.from({ length: bulbs }, (_, i) => {
        const color = BULB_COLORS[i % BULB_COLORS.length];
        return (
          <span
            key={i}
            className={classes.bulb}
            style={{
              background: color,
              boxShadow: `0 2px 8px ${color}`,
              animationDelay: `${(i % 4) * 0.4}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Capa de nieve + guirnalda.
 * - Normal: fija sobre toda la ventana, con la guirnalda bajo el header (50 px).
 * - `contained`: dentro del contenedor padre (que debe ser position: relative),
 *   para la vista previa en Mi negocio → Branding.
 */
export const ChristmasDecorations = memo(function ChristmasDecorations({
  contained = false,
  headerOffset = 50,
}: {
  contained?: boolean;
  headerOffset?: number;
}) {
  const isSmall = typeof window !== "undefined" && window.innerWidth < 600;
  const flakeCount = contained ? 14 : isSmall ? 18 : 32;
  const bulbCount = contained ? 10 : isSmall ? 12 : 24;

  return (
    <div className={`${classes.layer} ${contained ? classes.contained : ""}`} aria-hidden>
      <Snow count={flakeCount} contained={contained} />
      <Garland bulbs={bulbCount} top={contained ? 0 : headerOffset} />
    </div>
  );
});

/** Gorro navideño sobre el elemento hijo (pensado para el avatar/logo). */
export function SantaHat({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return <>{children}</>;
  return (
    <span className={classes.hatWrap}>
      {children}
      <svg className={classes.hat} viewBox="0 0 52 44" aria-hidden>
        <path d="M6 34 C 12 14, 28 2, 44 8 C 38 14, 36 22, 40 32 Z" fill="#d62828" />
        <circle cx="45" cy="9" r="5" fill="#fff" />
        <rect x="2" y="30" width="42" height="10" rx="5" fill="#fff" />
      </svg>
    </span>
  );
}
