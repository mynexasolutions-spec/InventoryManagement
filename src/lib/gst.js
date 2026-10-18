// GST engine: state codes, GSTIN checksum, invoice tax maths (CGST+SGST vs IGST), HSN summary, amount in words.

export const STATES = [
  ["01", "Jammu & Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"],
  ["05", "Uttarakhand"], ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"], ["10", "Bihar"], ["19", "West Bengal"], ["20", "Jharkhand"],
  ["21", "Odisha"], ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"],
  ["27", "Maharashtra"], ["29", "Karnataka"], ["30", "Goa"], ["32", "Kerala"],
  ["33", "Tamil Nadu"], ["36", "Telangana"], ["37", "Andhra Pradesh"],
].map(([code, name]) => ({ code, name }));

export const GST_SLABS = [0, 3, 5, 12, 18, 28];

export function stateName(code) {
  return STATES.find((s) => s.code === code)?.name ?? "—";
}

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function gstinCheckChar(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i]);
    let p = v * (i % 2 === 0 ? 1 : 2);
    p = Math.floor(p / 36) + (p % 36);
    sum += p;
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export function makeGSTIN(stateCode, pan, entity = "1") {
  const first14 = `${stateCode}${pan}${entity}Z`;
  return first14 + gstinCheckChar(first14);
}

export function validateGSTIN(raw) {
  const g = String(raw ?? "").trim().toUpperCase();
  if (!g) return { ok: true, empty: true };
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return { ok: false, reason: "Format galat hai (15 chars: 27ABCDE1234F1Z5)" };
  if (gstinCheckChar(g.slice(0, 14)) !== g[14]) return { ok: false, reason: "Checksum match nahi hua" };
  if (!STATES.some((s) => s.code === g.slice(0, 2))) return { ok: false, reason: "State code invalid" };
  return { ok: true, stateCode: g.slice(0, 2) };
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * items: [{ qty, rate (ex-tax unit price), discountPct, gst, hsn, ... }]
 * intra: true => CGST+SGST, false => IGST
 */
export function computeInvoice(items, intra) {
  const lines = items.map((it) => {
    const gross = r2(it.qty * it.rate);
    const discount = r2((gross * (it.discountPct || 0)) / 100);
    const taxable = r2(gross - discount);
    const tax = r2((taxable * it.gst) / 100);
    const cgst = intra ? r2(tax / 2) : 0;
    const sgst = intra ? r2(tax - cgst) : 0;
    const igst = intra ? 0 : tax;
    return { ...it, gross, discount, taxable, cgst, sgst, igst, tax, lineTotal: r2(taxable + tax) };
  });

  const sum = (k) => r2(lines.reduce((s, l) => s + l[k], 0));
  const taxable = sum("taxable");
  const cgst = sum("cgst");
  const sgst = sum("sgst");
  const igst = sum("igst");
  const discount = sum("discount");
  const totalTax = r2(cgst + sgst + igst);
  const grand = r2(taxable + totalTax);
  const total = Math.round(grand);
  const roundOff = r2(total - grand);

  const map = new Map();
  for (const l of lines) {
    const key = `${l.hsn}|${l.gst}`;
    const row = map.get(key) ?? { hsn: l.hsn, gst: l.gst, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    row.qty += l.qty;
    row.taxable = r2(row.taxable + l.taxable);
    row.cgst = r2(row.cgst + l.cgst);
    row.sgst = r2(row.sgst + l.sgst);
    row.igst = r2(row.igst + l.igst);
    map.set(key, row);
  }

  return { lines, discount, taxable, cgst, sgst, igst, totalTax, grand, roundOff, total, hsnSummary: [...map.values()] };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}
function threeDigits(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return (h ? ONES[h] + " Hundred" + (r ? " " : "") : "") + (r ? twoDigits(r) : "");
}
function intToWords(n) {
  if (n === 0) return "Zero";
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  const parts = [];
  if (crore) parts.push(intToWords(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (n) parts.push(threeDigits(n));
  return parts.join(" ");
}

export function amountInWords(amount) {
  const rupees = Math.floor(amount + 1e-9);
  const paise = Math.round((amount - rupees) * 100);
  let out = "Rupees " + intToWords(rupees);
  if (paise) out += " and " + twoDigits(paise) + " Paise";
  return out + " Only";
}
