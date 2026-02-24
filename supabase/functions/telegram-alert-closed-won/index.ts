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

    if (!botToken || !chatId) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return new Response(JSON.stringify({ error: "Missing Telegram credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    // Only process UPDATE events on quotations
    if (type !== "UPDATE" || table !== "quotations") {
      return new Response(JSON.stringify({ message: "Ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oldStatus = old_record?.follow_up_status;
    const newStatus = record?.follow_up_status;

    // Only trigger when status changes TO 'ปิดการขายได้'
    if (oldStatus === "ปิดการขายได้" || newStatus !== "ปิดการขายได้") {
      return new Response(JSON.stringify({ message: "Not a closed-won transition" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerName = record.customer_name || "ไม่ระบุ";
    const workType = record.work_type || "ไม่ระบุ";
    const netTotal = record.net_total ? formatCurrency(Number(record.net_total)) : "฿0";

    const message =
      `🎉 BOOM! ปิดการขายสำเร็จ! 🎉\n\n` +
      `👤 ลูกค้า: <b>${customerName}</b>\n` +
      `🔧 งาน: <b>${workType}</b>\n` +
      `💰 ยอดเงิน: <b>${netTotal}</b>\n\n` +
      `🥳 ยินดีด้วยทีมเซลส์!`;

    const result = await sendTelegramMessage(botToken, chatId, message);
    console.log("Telegram response:", JSON.stringify(result));

    return new Response(JSON.stringify({ message: "Alert sent", telegram: result }), {
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
