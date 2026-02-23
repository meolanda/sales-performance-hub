import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const FOLLOW_UP_STATUSES = [
  "ติดต่อไม่ได้",
  "รอส่งข้อมูลเพิ่ม",
  "กำลังต่อรอง",
  "นัดดูหน้างาน",
  "ปิดการขายไม่ได้",
];

const SALES_PRIORITIES = [
  "A - High",
  "B - Medium",
  "C - Low",
];

interface Quotation {
  id: string;
  document_number: string;
  customer_name: string | null;
  project_name: string | null;
  net_total: number;
  follow_up_status: string | null;
  sales_priority: string | null;
  next_follow_up_date: string | null;
  internal_notes: string | null;
}

interface Props {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function QuotationEditDialog({ quotation, open, onOpenChange, onSaved }: Props) {
  const [followUpStatus, setFollowUpStatus] = useState("");
  const [salesPriority, setSalesPriority] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync state when quotation changes
  const resetForm = (q: Quotation | null) => {
    setFollowUpStatus(q?.follow_up_status || "");
    setSalesPriority(q?.sales_priority || "");
    setNextFollowUpDate(q?.next_follow_up_date || "");
    setInternalNotes(q?.internal_notes || "");
  };

  // Reset on open
  if (open && quotation) {
    // Use a key-based approach instead
  }

  const handleSave = async () => {
    if (!quotation) return;
    setSaving(true);
    const { error } = await supabase
      .from("quotations")
      .update({
        follow_up_status: followUpStatus || null,
        sales_priority: salesPriority || null,
        next_follow_up_date: nextFollowUpDate || null,
        internal_notes: internalNotes || null,
      })
      .eq("id", quotation.id);

    setSaving(false);
    if (error) {
      toast.error("บันทึกไม่สำเร็จ / Save failed: " + error.message);
    } else {
      toast.success("บันทึกสำเร็จ / Saved successfully");
      onSaved();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v && quotation) resetForm(quotation);
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-sarabun">
            ติดตามงาน / Follow-up — {quotation?.document_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground font-sarabun">
            {quotation?.customer_name} • {quotation?.project_name} • ฿{Number(quotation?.net_total || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </div>

          <div className="space-y-2">
            <Label className="font-sarabun">สถานะติดตาม / Follow-up Status</Label>
            <Select value={followUpStatus} onValueChange={setFollowUpStatus}>
              <SelectTrigger className="font-sarabun">
                <SelectValue placeholder="เลือกสถานะ..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— ยังไม่ระบุ —</SelectItem>
                {FOLLOW_UP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-sarabun">ลำดับความสำคัญ / Priority</Label>
            <Select value={salesPriority} onValueChange={setSalesPriority}>
              <SelectTrigger className="font-sarabun">
                <SelectValue placeholder="เลือก Priority..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— ยังไม่ระบุ —</SelectItem>
                {SALES_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-sarabun">วันนัดติดตามครั้งถัดไป / Next Follow-up</Label>
            <Input
              type="date"
              className="font-sarabun"
              value={nextFollowUpDate}
              onChange={(e) => setNextFollowUpDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-sarabun">บันทึกภายใน / Internal Notes</Label>
            <Textarea
              className="font-sarabun"
              placeholder="จดบันทึกการติดตาม..."
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-sarabun">
            ยกเลิก / Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="font-sarabun">
            {saving ? "กำลังบันทึก..." : "บันทึก / Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
