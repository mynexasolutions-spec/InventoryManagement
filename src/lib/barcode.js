// Real EAN-13 helpers (890 = India GS1 prefix). Barcodes produced here are valid and scannable.

const PREFIX = "8902310"; // 890 (India) + 2310 (our "manufacturer" code)

export function ean13CheckDigit(first12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(first12[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEAN13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  return ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

export function nextBarcode(existingBarcodes) {
  let max = 0;
  for (const b of existingBarcodes) {
    if (b && b.startsWith(PREFIX) && b.length === 13) {
      max = Math.max(max, Number(b.slice(7, 12)));
    }
  }
  const body = PREFIX + String(max + 1).padStart(5, "0");
  return body + ean13CheckDigit(body);
}

// Scanners / cameras sometimes drop the leading zero (UPC-A) or add whitespace.
export function normalizeCode(raw) {
  const code = String(raw ?? "").trim();
  if (/^\d{12}$/.test(code)) return "0" + code;
  return code;
}

export function findProductByCode(products, raw) {
  const code = normalizeCode(raw);
  if (!code) return null;
  const upper = code.toUpperCase();
  return products.find((p) => p.barcode === code || p.sku.toUpperCase() === upper) ?? null;
}
