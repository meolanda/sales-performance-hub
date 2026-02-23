import { useState } from "react";
import readXlsxFile from "read-excel-file";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

function parseDate(s: string): string | null {
  if (!s) return null;
  const str = String(s).trim();
  const parts = str.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d+$/.test(str)) {
    const date = new Date((Number(str) - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }
  // Try Date object
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
          totalInserted += data.inserted || batch.length;
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
