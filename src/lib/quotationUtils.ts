// Shared constants and utilities for quotation data
// Single source of truth — import from here instead of redefining in each file

export const FOLLOW_UP_STATUSES = [
  "ติดต่อไม่ได้",
  "รอส่งข้อมูลเพิ่ม",
  "กำลังต่อรอง",
  "นัดดูหน้างาน",
  "ปิดการขายได้",
  "ปิดการขายไม่ได้",
];

export const CUSTOMER_CATEGORIES = ["Food", "CO", "รายย่อย"];

export const SALES_PRIORITIES = ["A - High", "B - Medium", "C - Low"];

/** Parse a date value from Excel (serial number, DD/MM/YYYY with BE year, ISO, etc.) */
export function parseDate(value: unknown): string | null {
  if (!value) return null;

  // Excel serial date (numeric)
  if (typeof value === "number" && value > 1 && value < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split("T")[0];
  }

  const str = String(value).trim();
  if (!str) return null;

  // DD/MM/YYYY — supports Thai Buddhist Era (25xx → subtract 543)
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year >= 2400) year -= 543;
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) return d.toISOString().split("T")[0];
  }

  // ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Excel serial as string
  if (/^\d+$/.test(str)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + Number(str) * 86400000);
    return date.toISOString().split("T")[0];
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

/** Map Thai FlowAccount status string to internal status value */
export function mapStatus(thai: string): string {
  const s = String(thai || "").trim();
  if (s === "อนุมัติ") return "approved";
  if (s === "รออนุมัติ") return "pending";
  if (s === "ดำเนินการแล้ว") return "completed";
  if (s === "ไม่อนุมัติ") return "rejected";
  if (s === "ยกเลิก") return "cancelled";
  return "pending";
}
