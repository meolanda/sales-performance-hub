import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PlusCircle, Trash2, Clock } from "lucide-react";

interface FollowUpEntry {
  id: string;
  quotation_id: string;
  follow_date: string;
  followed_by: string | null;
  result: string;
  next_action: string | null;
  created_at: string;
}

interface Props {
  quotationId: string;
  salespersonName: string; // ใช้เป็นค่า default ของ followed_by
}

export default function FollowUpHistory({ quotationId, salespersonName }: Props) {
  const [entries, setEntries] = useState<FollowUpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [followDate, setFollowDate] = useState(new Date().toISOString().split("T")[0]);
  const [followedBy, setFollowedBy] = useState("");
  const [result, setResult] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotation_follow_ups")
      .select("*")
      .eq("quotation_id", quotationId)
      .order("follow_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) setEntries(data as FollowUpEntry[]);
    setLoading(false);
  }, [quotationId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Reset form when opening
  const openForm = () => {
    setFollowDate(new Date().toISOString().split("T")[0]);
    setFollowedBy(salespersonName || "");
    setResult("");
    setNextAction("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!result.trim()) {
      toast.error("กรุณากรอกผลการติดตาม");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("quotation_follow_ups").insert({
      quotation_id: quotationId,
      follow_date: followDate,
      followed_by: followedBy || null,
      result: result.trim(),
      next_action: nextAction.trim() || null,
    });

    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
    } else {
      toast.success("บันทึกการติดตามแล้ว");
      setShowForm(false);
      fetchEntries();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("quotation_follow_ups")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("ลบไม่สำเร็จ: " + error.message);
    } else {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="space-y-3">
      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold font-sarabun text-sm">
            ประวัติการติดตาม / Follow-up Log
            {entries.length > 0 && (
              <span className="ml-1 text-muted-foreground font-normal">({entries.length} ครั้ง)</span>
            )}
          </span>
        </div>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={openForm} className="font-sarabun gap-1 h-7 text-xs">
            <PlusCircle className="h-3.5 w-3.5" />
            บันทึกการติดตาม
          </Button>
        )}
      </div>

      {/* Add new entry form */}
      {showForm && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
          <p className="text-xs font-semibold font-sarabun text-muted-foreground uppercase tracking-wide">
            บันทึกการติดตามใหม่
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="font-sarabun text-xs">วันที่ติดตาม</Label>
              <Input
                type="date"
                className="font-sarabun h-8 text-sm"
                value={followDate}
                onChange={(e) => setFollowDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="font-sarabun text-xs">ผู้ติดตาม</Label>
              <Input
                className="font-sarabun h-8 text-sm"
                placeholder="ชื่อผู้ติดตาม..."
                value={followedBy}
                onChange={(e) => setFollowedBy(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="font-sarabun text-xs">ผลการติดตาม <span className="text-destructive">*</span></Label>
            <Textarea
              className="font-sarabun text-sm"
              placeholder="เช่น โทรหาลูกค้าแล้ว รอเอกสารเพิ่มเติม / ลูกค้าสนใจ นัดดูหน้างานวันที่ ..."
              rows={2}
              value={result}
              onChange={(e) => setResult(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="font-sarabun text-xs">การดำเนินการต่อไป / Next Action</Label>
            <Input
              className="font-sarabun h-8 text-sm"
              placeholder="เช่น โทรติดตามอีกครั้งวันที่ ..."
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="font-sarabun h-7 text-xs">
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="font-sarabun h-7 text-xs">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </div>
      )}

      {/* History list */}
      {loading ? (
        <p className="text-xs text-muted-foreground font-sarabun text-center py-2">กำลังโหลด...</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground font-sarabun text-center py-2">
          ยังไม่มีประวัติการติดตาม
        </p>
      ) : (
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-md border border-border bg-background p-3 text-sm space-y-1 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold font-sarabun text-xs text-primary">
                    {entry.follow_date}
                  </span>
                  {entry.followed_by && (
                    <span className="text-xs text-muted-foreground font-sarabun">
                      โดย {entry.followed_by}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <p className="font-sarabun text-sm leading-snug">{entry.result}</p>
              {entry.next_action && (
                <p className="font-sarabun text-xs text-muted-foreground">
                  → {entry.next_action}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
