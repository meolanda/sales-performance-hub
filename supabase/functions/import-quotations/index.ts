import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    
    // Accept either { records: [...] } or { lines: [...] }
    let records: Array<Record<string, unknown>>;
    
    if (body.records) {
      records = body.records;
    } else if (body.lines) {
      records = [];
      for (const line of body.lines) {
        const cells = line.split("|").map((c: string) => c.trim());
        if (cells.length < 14) continue;
        const docNum = cells[2];
        if (!docNum || !docNum.startsWith("QT")) continue;
        
        // Parse date DD/MM/YYYY -> YYYY-MM-DD
        let docDate: string | null = null;
        if (cells[3]) {
          const parts = cells[3].split("/");
          if (parts.length === 3) {
            docDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }
        
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
          document_date: docDate,
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
