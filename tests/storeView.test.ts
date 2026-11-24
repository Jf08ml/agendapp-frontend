import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isLowStock,
  lowStockSummary,
  productCommissionText,
  publicationState,
  orderPaymentState,
  orderFulfillmentState,
  orderActions,
  orderNumber,
} from "../src/pages/admin/inventory/storeView.ts";

const money = (n: number) => `$${n}`;

test("stock bajo en el umbral", () => {
  assert.equal(isLowStock({ trackStock: true, stockQuantity: 3, lowStockThreshold: 3 }), true);
  assert.equal(isLowStock({ trackStock: true, stockQuantity: 4, lowStockThreshold: 3 }), false);
  assert.equal(isLowStock({ trackStock: true, stockQuantity: 0, lowStockThreshold: 0 }), false);
  assert.equal(isLowStock({ trackStock: false, stockQuantity: 0, lowStockThreshold: 5 }), false);
});

test("comisión en texto claro", () => {
  assert.equal(productCommissionText(null, 10, money), "La del profesional");
  assert.equal(productCommissionText("percentage", 10, money), "10 % de la venta");
  assert.equal(productCommissionText("fixed", 1000, money), "$1000 por unidad");
  assert.equal(productCommissionText("fixed", 0, money), "Sin comisión");
});

test("publicación", () => {
  assert.equal(publicationState({ active: false, visibleInStore: true }).label, "Inactivo");
  assert.equal(publicationState({ active: true, visibleInStore: true }).label, "En la tienda");
  assert.equal(publicationState({ active: true }).label, "Solo en caja");
});

test("estados del pedido", () => {
  assert.equal(orderPaymentState({ status: "pending", provider: "cod" }).label, "Pendiente de pago");
  assert.equal(orderPaymentState({ status: "pending", provider: "mercadopago" }).label, "Sin pagar");
  assert.equal(orderPaymentState({ status: "expired", provider: "receipt" }).label, "Cancelado");
  assert.equal(orderFulfillmentState({ status: "paid", provider: "cod" }).label, "Por entregar");
  assert.equal(orderFulfillmentState({ status: "paid", provider: "cod", store: { fulfillmentStatus: "delivered" } }).label, "Entregado");
});

test("una sola acción principal", () => {
  const cod = orderActions({ status: "pending", provider: "cod" }, true);
  assert.equal(cod.primary, "collect");
  assert.equal(cod.canCancel, true);
  assert.equal(cod.canDelete, true);
  const paid = orderActions({ status: "paid", provider: "mercadopago" }, true);
  assert.equal(paid.primary, "deliver");
  assert.equal(paid.canCancel, false);
  assert.equal(paid.canDelete, false);
  const review = orderActions({ status: "in_review", provider: "receipt" }, true);
  assert.equal(review.primary, null);
  assert.equal(review.inReview, true);
  assert.equal(review.canDelete, false);
  const delivered = orderActions({ status: "paid", provider: "cod", store: { fulfillmentStatus: "delivered" } }, true);
  assert.deepEqual([delivered.primary, delivered.canCancel, delivered.canDelete], [null, false, true]);
  assert.equal(orderActions({ status: "pending", provider: "cod" }, false).primary, null);
});

test("orderNumber", () => {
  assert.equal(orderNumber({ _id: "64ab12cd34ef56a1b2c3" }), "#A1B2C3");
});

test("aviso agrupado de stock bajo", () => {
  const p = (name: string, stockQuantity: number, lowStockThreshold = 5, active = true, trackStock = true) => ({ name, stockQuantity, lowStockThreshold, active, trackStock });
  assert.equal(lowStockSummary([p("Shampoo", 10)]), null);
  const one = lowStockSummary([p("Shampoo", 2), p("Tinte", 9)])!;
  assert.equal(one.text, "1 producto con stock bajo: Shampoo (2).");
  const many = lowStockSummary([p("Shampoo", 4), p("Tinte", 0), p("Laca", 1), p("Gel", 3, 3), p("Cera", 2, 5, false), p("Mascarilla", 0, 5, true, false)])!;
  assert.equal(many.items.length, 4);
  assert.equal(many.text, "4 productos con stock bajo: Tinte (agotado), Laca (1), Shampoo (4) y 1 más.");
  assert.equal(lowStockSummary([p("A", 1), p("B", 2)])!.text, "2 productos con stock bajo: A (1) y B (2).");
});
