import { createHash } from "node:crypto";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

export function sha256(value: string | Buffer | ArrayBuffer) {
  const hash = createHash("sha256");
  hash.update(value instanceof ArrayBuffer ? Buffer.from(value) : value);
  return hash.digest("hex");
}

export function rowHash(row: Record<string, unknown>) {
  return sha256(stableStringify(row));
}

export function orderDedupeHash(sourceSystem: string, shopAccount: string, sourceOrderId: string) {
  return sha256(`${sourceSystem.trim()}|${shopAccount.trim()}|${sourceOrderId.trim()}`.toLowerCase());
}

export function itemDedupeHash(orderKey: string, sourceSkuCode: string, rowNumber?: number | null) {
  return sha256(`${orderKey}|${sourceSkuCode}|${rowNumber ?? ""}`.toLowerCase());
}
