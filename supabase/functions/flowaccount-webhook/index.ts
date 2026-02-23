import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// work_type is now derived automatically by the DB trigger "trigger_derive_work_type"

interface FlowAccountPayload {
  event?: string;
  data?: {
    documentNumber?: string;
    documentDate?: string;
    customerName?: string;
    projectName?: string;
    totalAmount?: number;
    vatAmount?: number;
    netTotal?: number;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const payload: FlowAccountPayload = await req.json();
    const eventType = payload.event || "unknown";
    const data = payload.data;

    // Log the webhook
    await supabase.from("webhook_logs").insert({
      event_type: eventType,
      payload: payload as unknown as Record<string, unknown>,
      status: "received",
    });

    // Only process quotation events
    if (
      eventType !== "quotation.create" &&
      eventType !== "quotation.update"
    ) {
      return new Response(
        JSON.stringify({ message: "Event ignored", event: eventType }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data || !data.documentNumber) {
      await supabase.from("webhook_logs").insert({
        event_type: eventType,
        payload: payload as unknown as Record<string, unknown>,
        status: "error",
        error_message: "Missing documentNumber in payload",
      });
      return new Response(
        JSON.stringify({ error: "Missing documentNumber" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mappedData = {
      document_number: data.documentNumber,
      document_date: data.documentDate || null,
      customer_name: data.customerName || null,
      project_name: data.projectName || null,
      amount: data.totalAmount ?? 0,
      vat: data.vatAmount ?? 0,
      net_total: data.netTotal ?? 0,
      status: data.status || "pending",
      raw_payload: payload as unknown as Record<string, unknown>,
    };

    const { error } = await supabase
      .from("quotations")
      .upsert(mappedData, { onConflict: "document_number" });

    if (error) {
      await supabase.from("webhook_logs").insert({
        event_type: eventType,
        payload: payload as unknown as Record<string, unknown>,
        status: "error",
        error_message: error.message,
      });
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update log status to success
    await supabase.from("webhook_logs").insert({
      event_type: eventType,
      payload: payload as unknown as Record<string, unknown>,
      status: "success",
    });

    return new Response(
      JSON.stringify({
        message: "Quotation synced successfully",
        document_number: data.documentNumber,
        action: eventType,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
