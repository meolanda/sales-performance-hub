import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (year >= 2400) year -= 543;
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
      // Re-parse dates in records to handle Thai BE years
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

    // Batch upsert in chunks of 200
    let inserted = 0;
    const errors: string[] = [];
    const chunkSize = 200;
    
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("quotations")
        .upsert(chunk, { onConflict: "document_number" });
      
      if (error) {
        errors.push(`Chunk ${i}-${i + chunk.length}: ${error.message}`);
      } else {
        inserted += chunk.length;
      }
    }

    return new Response(
      JSON.stringify({ message: "Import complete", total_parsed: records.length, inserted, errors }),
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
