export function normalizeStatus(rawStatus: string | null | undefined) {
  const value = (rawStatus ?? "").trim().toLowerCase();

  if (["cancelled", "canceled", "batal", "dibatalkan"].some((token) => value.includes(token))) {
    return "cancelled";
  }

  if (["returned", "refunded", "return", "refund"].some((token) => value.includes(token))) {
    return "refunded";
  }

  if (["completed", "received", "selesai", "delivered"].some((token) => value.includes(token))) {
    return "completed";
  }

  if (["shipped", "dikirim", "telah dikirim"].some((token) => value.includes(token))) {
    return "shipped";
  }

  if (["paid", "pembayaran"].some((token) => value.includes(token))) {
    return "paid";
  }

  return "pending";
}

export function isCancelledStatus(status: string) {
  return status === "cancelled" || status === "refunded";
}

export function resolveB2BChannel(areaManager: string | null | undefined) {
  return (areaManager ?? "").trim().toLowerCase() === "agency" ? "MT" : "GT";
}

export function normalizeCity(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\bkota administrasi\b/g, "")
    .replace(/\bkabupaten\b/g, "")
    .replace(/\bkab\.?\b/g, "")
    .replace(/\bkota\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferSkuType(sourceSkuCode: string | null | undefined, productName: string | null | undefined, lineGmv = 0) {
  const value = `${sourceSkuCode ?? ""} ${productName ?? ""}`.toLowerCase();

  if (lineGmv === 0 || value.includes("free") || value.includes("gift")) {
    return "free_gift";
  }

  if (value.includes("posm") || value.includes("display rack") || value.includes("poster")) {
    return "posm";
  }

  if (value.includes("scratch")) {
    return "scratch_card";
  }

  if (value.includes("*") || value.includes("+") || value.includes("bundle")) {
    return "bundle";
  }

  return "paid_product";
}
