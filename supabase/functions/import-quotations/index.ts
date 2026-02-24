import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "number" && value > 1 && value < 100000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split("T")[0];
  }
  const str = String(value).trim();
  if (!str) return null;
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    let year = parseInt(slashMatch[3], 10);
    if (year >= 2400) year -= 543;
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900) {
      return d.toISOString().split("T")[0];
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d+$/.test(str)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + Number(str) * 86400000);
    return date.toISOString().split("T")[0];
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();

    let records: Array<Record<string, unknown>>;

    if (body.records) {
      records = body.records.map((r: Record<string, unknown>) => ({
        ...r,
        document_date: r.document_date ? parseDate(r.document_date) : null,
      }));
    } else if (body.lines) {
      records = [];
      for (const line of body.lines) {
        const cells = line.split("|").map((c: string) => c.trim());
        if (cells.length < 14) continue;
        const docNum = cells[2];
        if (!docNum || !docNum.startsWith("QT")) continue;
        const parseNum = (s: string) => {
          const n = parseFloat(s.replace(/,/g, ""));
          return isNaN(n) ? 0 : n;
        };
        const statusMap: Record<string, string> = {
          "อนุมัติ": "approved",
          "รออนุมัติ": "pending",
          "ดำเนินการแล้ว": "completed",
          "ไม่อนุมัติ": "rejected",
          "ยกเลิก": "cancelled",
        };
        records.push({
          document_number: docNum,
          document_date: parseDate(cells[3]),
          customer_name: cells[4] || null,
          project_name: cells[5] || null,
          amount: parseNum(cells[8]),
          vat: parseNum(cells[9]),
          net_total: parseNum(cells[10]),
          status: statusMap[cells[13]?.trim()] || "pending",
        });
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Expected 'records' or 'lines' in body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ message: "No records to import", total_parsed: 0, inserted: 0, updated: 0, errors: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Collect all document_numbers to check which already exist
    const docNumbers = records.map(r => String(r.document_number));

    // Fetch existing records to know which are new vs existing
    const { data: existingRows, error: fetchError } = await supabase
      .from("quotations")
      .select("document_number")
      .in("document_number", docNumbers);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Failed to check existing records: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingSet = new Set((existingRows || []).map(r => r.document_number));

    const newRecords = records.filter(r => !existingSet.has(String(r.document_number)));
    const updateRecords = records.filter(r => existingSet.has(String(r.document_number)));

    let insertedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    // INSERT new records in chunks (trigger will auto-derive work_type)
    const chunkSize = 200;
    for (let i = 0; i < newRecords.length; i += chunkSize) {
      const chunk = newRecords.slice(i, i + chunkSize);
      const { error } = await supabase.from("quotations").insert(chunk);
      if (error) {
        errors.push(`Insert chunk ${i}: ${error.message}`);
      } else {
        insertedCount += chunk.length;
      }
    }

    // UPDATE existing records — ONLY accounting fields, preserve sales data
    for (const rec of updateRecords) {
      const { error } = await supabase
        .from("quotations")
        .update({
          document_date: rec.document_date,
          customer_name: rec.customer_name,
          project_name: rec.project_name,
          amount: rec.amount,
          vat: rec.vat,
          net_total: rec.net_total,
          status: rec.status,
        })
        .eq("document_number", String(rec.document_number));

      if (error) {
        errors.push(`Update ${rec.document_number}: ${error.message}`);
      } else {
        updatedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Import complete",
        total_parsed: records.length,
        inserted: insertedCount,
        updated: updatedCount,
        skipped_sales_fields: "work_type, follow_up_status, sales_priority, next_follow_up_date, internal_notes preserved for existing records",
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
