import { useState } from "react";
import readXlsxFile from "read-excel-file";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

function parseDate(value: unknown): string | null {
  if (!value) return null;

  // Handle Excel serial dates
  if (typeof value === "number" && value > 1 && value < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split("T")[0];
  }

  const str = String(value).trim();
  if (!str) return null;

  // Handle DD/MM/YYYY with possible Thai Buddhist Era year (25xx → subtract 543)
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    // Thai Buddhist Era: years >= 2400 are BE (e.g., 2568 → 2025)
    if (year >= 2400) year -= 543;
    // Two-digit year
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
      return d.toISOString().split("T")[0];
    }
  }

  // Handle YYYY-MM-DD (ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Handle Excel serial as string
  if (/^\d+$/.test(str)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + Number(str) * 86400000);
    return date.toISOString().split("T")[0];
  }

  // Try Date constructor
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

function mapStatus(thai: string): string {
  const s = String(thai || "").trim();
  if (s === "อนุมัติ") return "approved";
  if (s === "รออนุมัติ") return "pending";
  if (s === "ดำเนินการแล้ว") return "completed";
  if (s === "ไม่อนุมัติ") return "rejected";
  if (s === "ยกเลิก") return "cancelled";
  return "pending";
}

export default function ImportPage() {
  const [status, setStatus] = useState<string>("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [inserted, setInserted] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const runImport = async () => {
    setStatus("loading");
    setErrors([]);

    try {
      const res = await fetch("/data/quotations.xlsx");
      const blob = await res.blob();
      const rows = await readXlsxFile(blob);

      // Find header row (contains "เลขที่เอกสาร")
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        if (rows[i] && rows[i].some((c) => String(c).includes("เลขที่เอกสาร"))) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) {
        setStatus("error");
        setErrors(["ไม่พบหัวตาราง / Header row not found"]);
        return;
      }

      const dataRows = rows.slice(headerIdx + 1).filter((row) => {
        return row && row[1] && String(row[1]).startsWith("QT");
      });

      setTotal(dataRows.length);
      setStatus("importing");

      const records = dataRows.map((row) => ({
        document_number: String(row[1] || ""),
        document_date: parseDate(String(row[2] || "")),
        customer_name: String(row[3] || "") || null,
        project_name: String(row[4] || "") || null,
        amount: Number(row[7]) || 0,
        vat: Number(row[8]) || 0,
        net_total: Number(row[9]) || 0,
        status: mapStatus(String(row[12] || "")),
      }));

      const batchSize = 100;
      let totalInserted = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const { data, error } = await supabase.functions.invoke("import-quotations", {
          body: { records: batch },
        });

        if (error) {
          allErrors.push(`Batch ${i}: ${error.message}`);
        } else if (data) {
          totalInserted += (data.inserted || 0) + (data.updated || 0);
          if (data.errors?.length) {
            allErrors.push(...data.errors);
          }
        }

        setInserted(totalInserted);
        setProgress(Math.round(((i + batch.length) / records.length) * 100));
      }

      setErrors(allErrors);
      setStatus(allErrors.length > 0 ? "partial" : "done");
    } catch (err) {
      setStatus("error");
      setErrors([err instanceof Error ? err.message : "Unknown error"]);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-sarabun">นำเข้าข้อมูล / Import Data</h1>

      <Card>
        <CardHeader>
          <CardTitle className="font-sarabun">
            นำเข้าใบเสนอราคาจาก Excel / Import Quotations from Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground font-sarabun">
            กดปุ่มด้านล่างเพื่อนำเข้าข้อมูลจากไฟล์ Excel ที่อัพโหลด
          </p>

          <Button
            onClick={runImport}
            disabled={status === "importing" || status === "loading"}
            className="font-sarabun"
          >
            {status === "importing"
              ? "กำลังนำเข้า... / Importing..."
              : status === "done"
              ? "✅ นำเข้าเสร็จสิ้น / Import Complete"
              : "เริ่มนำเข้า / Start Import"}
          </Button>

          {(status === "importing" || status === "done" || status === "partial") && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm font-sarabun text-muted-foreground">
                นำเข้าแล้ว {inserted} / {total} รายการ ({progress}%)
              </p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-destructive/10 p-3 rounded text-sm text-destructive font-sarabun">
              <p className="font-bold">ข้อผิดพลาด / Errors:</p>
              {errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
