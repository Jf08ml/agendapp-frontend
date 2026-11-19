// Pruebas de los enlaces de acceso al panel.
// Ejecutar: npm test  (node --test con TypeScript nativo de Node 24, sin navegador)
import { test } from "node:test";
import assert from "node:assert/strict";

import { ingresarTarget, loginFailureMessage, normalizeSlug, panelLoginUrl, recoveryExchangeUrl } from "../src/utils/panelAccess.ts";

test("el enlace del panel es el login del subdominio, no la página pública de reservas", () => {
  assert.equal(panelLoginUrl("mibarberia"), "https://mibarberia.agenditapp.com/login-admin");
});

test("/ingresar/:slug lleva al login del negocio", () => {
  assert.equal(ingresarTarget("mibarberia", "app.agenditapp.com"), "https://mibarberia.agenditapp.com/login-admin");
  assert.equal(ingresarTarget("  MiBarberia ", "app.agenditapp.com"), "https://mibarberia.agenditapp.com/login-admin");
});

test("/ingresar/:slug tolera el {{1}} literal de la primera plantilla cuenta_creada", () => {
  assert.equal(ingresarTarget("{{1}}alejanails", "app.agenditapp.com"), "https://alejanails.agenditapp.com/login-admin");
  assert.equal(ingresarTarget("%7B%7B1%7D%7Dalejanails", "app.agenditapp.com"), "https://alejanails.agenditapp.com/login-admin");
  assert.equal(ingresarTarget("{{1}}", "app.agenditapp.com"), null);
});

test("/ingresar/:slug en local conserva el tenant con ?slug=", () => {
  assert.equal(ingresarTarget("mibarberia", "localhost"), "/login-admin?slug=mibarberia");
});

test("/ingresar/:slug rechaza slugs que no son un subdominio válido", () => {
  for (const bad of ["", "app", "www", "evil.com/x", "-abc", "a b", "javascript:alert(1)", undefined]) {
    assert.equal(ingresarTarget(bad, "app.agenditapp.com"), null, `debería rechazar ${String(bad)}`);
  }
  assert.equal(normalizeSlug("salon-luna-2"), "salon-luna-2");
});

test("un fallo de red o el límite de intentos no se muestran como credenciales incorrectas", () => {
  assert.match(loginFailureMessage(undefined), /conexión/);
  assert.match(loginFailureMessage(429), /demasiados intentos/i);
  assert.match(loginFailureMessage(500), /problema/);
  for (const status of [undefined, 429, 500]) {
    assert.doesNotMatch(loginFailureMessage(status), /incorrect/i);
  }
});

test("tras recuperar el acceso se entra por /exchange en el dominio correcto", () => {
  const code = "abc";
  // En la página del negocio: se queda en su dominio (subdominio o propio).
  assert.equal(recoveryExchangeUrl({ hostname: "mibarberia.agenditapp.com", scoped: true, exchangeCode: code, slug: "mibarberia" }), "/exchange?code=abc");
  assert.equal(recoveryExchangeUrl({ hostname: "www.minegocio.com", scoped: true, exchangeCode: code, slug: "minegocio" }), "/exchange?code=abc");
  // Desde app.agenditapp.com: al subdominio, o al dominio propio si no hay slug.
  assert.equal(recoveryExchangeUrl({ hostname: "app.agenditapp.com", scoped: false, exchangeCode: code, slug: "mibarberia" }), "https://mibarberia.agenditapp.com/exchange?code=abc");
  assert.equal(recoveryExchangeUrl({ hostname: "app.agenditapp.com", scoped: false, exchangeCode: code, domain: "www.minegocio.com" }), "https://www.minegocio.com/exchange?code=abc");
  assert.equal(recoveryExchangeUrl({ hostname: "app.agenditapp.com", scoped: false, exchangeCode: code }), null);
  // En local se conserva el tenant con ?slug=.
  assert.equal(recoveryExchangeUrl({ hostname: "localhost", scoped: true, exchangeCode: code, slug: "mibarberia" }), "/exchange?code=abc&slug=mibarberia");
});
