export const LAST_RESOURCE_ORDER = Number.MAX_SAFE_INTEGER;

export function normalizeResourceOrder(value) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) {
    return LAST_RESOURCE_ORDER;
  }

  const order = Number(value);
  return Number.isFinite(order) ? order : LAST_RESOURCE_ORDER;
}

export function compareResourceItems(a, b) {
  const orderDiff = normalizeResourceOrder(a.order) - normalizeResourceOrder(b.order);
  if (orderDiff !== 0) return orderDiff;
  return String(a.name || "").localeCompare(String(b.name || ""));
}
