// Sugerencia "¿Quisiste decir …@gmail.com?" para correos con el dominio mal
// escrito (gamil.com, hotmial.com, gmail.con…). Un correo así hace que la
// bienvenida rebote y que el dueño no pueda recuperar su cuenta por correo.
// Sin imports a propósito: se prueba con `node --test` (ver tests/).

// Dominios a los que se sugiere corregir.
const COMMON_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "live.com",
  "hotmail.es",
  "outlook.es",
  "yahoo.es",
  "msn.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "yahoo.com.mx",
  "hotmail.com.mx",
  "live.com.mx",
  "outlook.com.mx",
  "yahoo.com.ar",
  "hotmail.com.ar",
];

// Dominios reales parecidos a los comunes: nunca se "corrigen".
const OTHER_VALID_DOMAINS = ["gmx.com", "gmx.es", "ymail.com", "mail.com", "email.com", "une.net.co"];

const KNOWN = new Set([...COMMON_DOMAINS, ...OTHER_VALID_DOMAINS]);

// Nombres sin terminación ("juan@gmail") → dominio completo.
const BARE_NAMES: Record<string, string> = {
  gmail: "gmail.com",
  hotmail: "hotmail.com",
  outlook: "outlook.com",
  yahoo: "yahoo.com",
  icloud: "icloud.com",
};

/** Distancia de Damerau-Levenshtein (con transposición de letras vecinas). */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Correo corregido si el dominio parece un error de tipeo de un proveedor
 * común; null si está bien o no hay una sugerencia clara.
 */
export function suggestEmailFix(raw: string | null | undefined): string | null {
  const email = String(raw ?? "").replace(/\s+/g, "").toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).replace(/\.+$/, "");
  if (!domain || KNOWN.has(domain)) return null;

  if (BARE_NAMES[domain]) return `${local}@${BARE_NAMES[domain]}`;

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of COMMON_DOMAINS) {
    const distance = editDistance(domain, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  if (!best) return null;
  // 1 cambio siempre; 2 solo en dominios largos que empiezan igual
  // ("gmal.co" → gmail.com), para no "corregir" dominios propios cortos.
  const ok = bestDistance === 1 || (bestDistance === 2 && domain.length >= 7 && domain[0] === best[0]);
  return ok ? `${local}@${best}` : null;
}
