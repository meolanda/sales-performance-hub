import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatCurrency(amount: number): string {
  return "฿" + amount.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
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
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return new Response(JSON.stringify({ error: "Missing Telegram credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Total Pipeline: net_total where status != 'approved' and follow_up_status != 'ปิดการขายไม่ได้'
    const { data: pipelineData, error: pipelineError } = await supabase
      .from("quotations")
      .select("net_total")
      .neq("status", "approved")
      .or("follow_up_status.is.null,follow_up_status.neq.ปิดการขายไม่ได้");

    if (pipelineError) {
      console.error("Pipeline query error:", pipelineError.message);
    }

    const totalPipeline = (pipelineData || []).reduce(
      (sum, row) => sum + (Number(row.net_total) || 0),
      0
    );

    // 2. Hot Leads: net_total > 100000 AND created within last 15 days
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const cutoffDate = fifteenDaysAgo.toISOString().split("T")[0];

    const { data: hotLeadsData, error: hotLeadsError } = await supabase
      .from("quotations")
      .select("id")
      .gt("net_total", 100000)
      .gte("document_date", cutoffDate);

    if (hotLeadsError) {
      console.error("Hot leads query error:", hotLeadsError.message);
    }

    const hotLeadsCount = (hotLeadsData || []).length;

    // 3. Send Telegram message
    const message =
      `📊 สรุปเป้าหมายประจำวัน 📊\n\n` +
      `💰 โอกาสขาย (Pipeline): <b>${formatCurrency(totalPipeline)}</b>\n` +
      `🔥 Hot Leads ด่วน: <b>${hotLeadsCount} งาน</b>\n\n` +
      `👉 ลุยกันเลยทีมเซลส์!`;

    const result = await sendTelegramMessage(botToken, chatId, message);
    console.log("Telegram response:", JSON.stringify(result));

    return new Response(JSON.stringify({ message: "Briefing sent", pipeline: totalPipeline, hotLeads: hotLeadsCount, telegram: result }), {
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
