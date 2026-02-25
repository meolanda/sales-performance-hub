import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatCurrency(amount: number): string {
  return "฿" + amount.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function getBangkokNow(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!botToken || !chatId) {
      return new Response(JSON.stringify({ error: "Missing Telegram credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const bkk = getBangkokNow();
    const year = bkk.getFullYear();
    const month = bkk.getMonth(); // 0-indexed
    const day = bkk.getDate();

    // Current month range
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const nextMonth = month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, "0")}-01`;

    // 1. Total Pipeline this month
    const { data: pipelineData } = await supabase
      .from("quotations")
      .select("net_total")
      .neq("status", "approved")
      .or("follow_up_status.is.null,follow_up_status.neq.ปิดการขายไม่ได้")
      .gte("document_date", monthStart)
      .lt("document_date", nextMonth);

    const totalPipeline = (pipelineData || []).reduce((sum, r) => sum + (Number(r.net_total) || 0), 0);

    // 2. Hot Leads this month (net_total > 100k, created within last 15 days)
    const fifteenDaysAgo = new Date(bkk);
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const cutoffDate = fifteenDaysAgo.toISOString().split("T")[0];

    const { data: hotLeadsData } = await supabase
      .from("quotations")
      .select("id")
      .gt("net_total", 100000)
      .gte("document_date", cutoffDate)
      .gte("document_date", monthStart)
      .lt("document_date", nextMonth);

    const hotLeadsCount = (hotLeadsData || []).length;

    // 3. Format Thai date
    const dateStr = `${day} ${thaiMonths[month]} ${year}`;

    const message =
      `📊 สรุปเป้าหมายประจำวันที่ ${dateStr} 📊\n\n` +
      `💰 โอกาสขายเดือนนี้ (Pipeline): <b>${formatCurrency(totalPipeline)}</b>\n` +
      `🔥 Hot Leads ด่วน: <b>${hotLeadsCount} งาน</b>\n\n` +
      `👉 ลุยกันเลยทีมเซลส์!`;

    const result = await sendTelegramMessage(botToken, chatId, message);
    console.log("Telegram response:", JSON.stringify(result));

    return new Response(JSON.stringify({ message: "Briefing sent", date: dateStr, pipeline: totalPipeline, hotLeads: hotLeadsCount, telegram: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
