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

    // Bangkok time = UTC+7
    const now = new Date();
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const bangkokNow = new Date(now.getTime() + bangkokOffset);
    const todayStr = bangkokNow.toISOString().split("T")[0]; // YYYY-MM-DD
    const monthStart = todayStr.substring(0, 7) + "-01"; // YYYY-MM-01

    // Format Thai date
    const thaiDate = `${bangkokNow.getDate()}/${bangkokNow.getMonth() + 1}/${bangkokNow.getFullYear()}`;

    // 1. Closed Won Today: follow_up_status == 'ปิดการขายได้' AND updated_at is today (Bangkok)
    const { data: closedWonData } = await supabase
      .from("quotations")
      .select("net_total")
      .eq("follow_up_status", "ปิดการขายได้")
      .gte("updated_at", todayStr + "T00:00:00+07:00")
      .lt("updated_at", todayStr + "T23:59:59+07:00");

    const closedWonCount = (closedWonData || []).length;
    const closedWonSum = (closedWonData || []).reduce((s, r) => s + (Number(r.net_total) || 0), 0);

    // 2. New Quotations Today: document_date == today
    const { data: newQuotData } = await supabase
      .from("quotations")
      .select("net_total")
      .eq("document_date", todayStr);

    const newQuotCount = (newQuotData || []).length;
    const newQuotSum = (newQuotData || []).reduce((s, r) => s + (Number(r.net_total) || 0), 0);

    // 3. Total Actual Sales this month: status == 'approved' AND document_date in current month
    const { data: monthlySalesData } = await supabase
      .from("quotations")
      .select("net_total")
      .eq("status", "approved")
      .gte("document_date", monthStart)
      .lte("document_date", todayStr);

    const monthlySalesSum = (monthlySalesData || []).reduce((s, r) => s + (Number(r.net_total) || 0), 0);

    // 4. Send message
    const message =
      `🏆 สรุปผลงานประจำวันที่ ${thaiDate} 🏆\n\n` +
      `✅ ปิดการขายสำเร็จวันนี้: <b>${closedWonCount} งาน</b> (${formatCurrency(closedWonSum)})\n` +
      `📄 ใบเสนอราคาเปิดใหม่วันนี้: <b>${newQuotCount} งาน</b> (${formatCurrency(newQuotSum)})\n` +
      `📈 ยอดขายจริง (Approved) เดือนนี้: <b>${formatCurrency(monthlySalesSum)}</b>\n\n` +
      `👉 เยี่ยมมากทุกคน! พรุ่งนี้ลุยกันใหม่!`;

    const result = await sendTelegramMessage(botToken, chatId, message);
    console.log("Telegram response:", JSON.stringify(result));

    return new Response(JSON.stringify({
      message: "Wrapup sent",
      closedWon: { count: closedWonCount, sum: closedWonSum },
      newQuotations: { count: newQuotCount, sum: newQuotSum },
      monthlySales: monthlySalesSum,
      telegram: result,
    }), {
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
