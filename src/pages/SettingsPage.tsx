import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Save, ExternalLink } from "lucide-react";

const WEBHOOK_URL = `https://katxpagyuglxooftmbnu.supabase.co/functions/v1/flowaccount-webhook`;

export default function SettingsPage() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("api_settings")
        .select("*")
        .eq("provider", "flowaccount")
        .limit(1)
        .maybeSingle();
      if (data) {
        setClientId(data.client_id || "");
        setClientSecret(data.client_secret || "");
        setIsActive(data.is_active || false);
        setExistingId(data.id);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      provider: "flowaccount",
      client_id: clientId,
      client_secret: clientSecret,
      is_active: isActive,
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from("api_settings").update(payload).eq("id", existingId));
    } else {
      const result = await supabase.from("api_settings").insert(payload).select().single();
      error = result.error;
      if (result.data) setExistingId(result.data.id);
    }

    setSaving(false);
    if (error) {
      toast({ title: "เกิดข้อผิดพลาด / Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "บันทึกสำเร็จ / Saved", description: "API settings saved successfully." });
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast({ title: "คัดลอกแล้ว / Copied", description: "Webhook URL copied to clipboard." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground font-sarabun">กำลังโหลด... / Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold font-sarabun text-foreground">
        ตั้งค่า / Settings
      </h1>

      {/* FlowAccount Connection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-sarabun">FlowAccount API</CardTitle>
              <CardDescription className="font-sarabun">
                เชื่อมต่อ FlowAccount เพื่อรับข้อมูลใบเสนอราคาอัตโนมัติ
                <br />
                Connect FlowAccount for automatic quotation sync.
              </CardDescription>
            </div>
            <Badge variant={isActive ? "default" : "secondary"} className="font-sarabun">
              {isActive ? "เชื่อมต่อแล้ว / Connected" : "ยังไม่เชื่อมต่อ / Disconnected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-sarabun">Client ID</Label>
            <Input
              placeholder="กรอก Client ID ของ FlowAccount"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-sarabun"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-sarabun">Client Secret</Label>
            <Input
              type="password"
              placeholder="กรอก Client Secret ของ FlowAccount"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="font-sarabun"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-sarabun">เปิดใช้งาน / Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full font-sarabun">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "กำลังบันทึก..." : "บันทึก / Save"}
          </Button>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="font-sarabun">Webhook URL</CardTitle>
          <CardDescription className="font-sarabun">
            คัดลอก URL นี้ไปตั้งค่าใน FlowAccount Webhook Settings
            <br />
            Copy this URL to your FlowAccount Webhook Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={WEBHOOK_URL} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-md bg-muted p-4 space-y-2">
            <p className="font-sarabun font-medium text-sm text-foreground">
              📋 วิธีตั้งค่า / Setup Instructions:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground font-sarabun">
              <li>เข้าสู่ระบบ FlowAccount / Login to FlowAccount</li>
              <li>ไปที่ ตั้งค่า → Webhook / Go to Settings → Webhook</li>
              <li>เพิ่ม URL ด้านบนเป็น Webhook Endpoint / Add the URL above as Webhook Endpoint</li>
              <li>เลือก Events: quotation.create, quotation.update</li>
              <li>บันทึกการตั้งค่า / Save settings</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Recent Webhook Logs */}
      <WebhookLogs />
    </div>
  );
}

function WebhookLogs() {
  const [logs, setLogs] = useState<Array<{
    id: string;
    event_type: string | null;
    status: string | null;
    error_message: string | null;
    created_at: string;
  }>>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("webhook_logs")
        .select("id, event_type, status, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setLogs(data || []);
    };
    fetchLogs();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sarabun">Webhook Logs (ล่าสุด 10 รายการ)</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-muted-foreground font-sarabun text-sm text-center py-4">
            ยังไม่มี log / No logs yet
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
              >
                <div className="font-sarabun">
                  <span className="font-medium">{log.event_type || "unknown"}</span>
                  {log.error_message && (
                    <p className="text-destructive text-xs">{log.error_message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={log.status === "success" ? "default" : log.status === "error" ? "destructive" : "secondary"}
                    className="font-sarabun text-xs"
                  >
                    {log.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("th-TH")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
