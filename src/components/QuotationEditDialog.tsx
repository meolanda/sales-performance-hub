import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FollowUpHistory from "@/components/FollowUpHistory";
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
  "ปิดการขายได้",
  "ปิดการขายไม่ได้",
];

const SALES_PRIORITIES = [
  "A - High",
  "B - Medium",
  "C - Low",
];

const WORK_TYPES = [
  "งานระบบ Hood",
  "งานล้างแอร์",
  "งาน PM",
  "งานซ่อมแอร์",
  "งานติดตั้ง",
  "งานอื่นๆ",
];

const CUSTOMER_CATEGORIES = ["Food", "CO", "รายย่อย"];

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
  work_type: string | null;
  salesperson_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  customer_category: string | null;
}

interface Props {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updatedRecord?: any) => void;
}

export default function QuotationEditDialog({ quotation, open, onOpenChange, onSaved }: Props) {
  const [workType, setWorkType] = useState("unassigned");
  const [followUpStatus, setFollowUpStatus] = useState("unassigned");
  const [salesPriority, setSalesPriority] = useState("unassigned");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [salespersonName, setSalespersonName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [customerCategory, setCustomerCategory] = useState("unassigned");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && quotation) {
      setWorkType(quotation.work_type || "unassigned");
      setFollowUpStatus(quotation.follow_up_status || "unassigned");
      setSalesPriority(quotation.sales_priority || "unassigned");
      setNextFollowUpDate(quotation.next_follow_up_date || "");
      setInternalNotes(quotation.internal_notes || "");
      setSalespersonName(quotation.salesperson_name || "");
      setContactName(quotation.contact_name || "");
      setContactPhone(quotation.contact_phone || "");
      setCustomerCategory(quotation.customer_category || "unassigned");
    }
  }, [open, quotation]);

  const handleSave = async () => {
    if (!quotation) return;
    setSaving(true);

    const updatePayload = {
      work_type: workType === "unassigned" ? null : workType,
      follow_up_status: followUpStatus === "unassigned" ? null : followUpStatus,
      sales_priority: salesPriority === "unassigned" ? null : salesPriority,
      next_follow_up_date: nextFollowUpDate || null,
      internal_notes: internalNotes || null,
      salesperson_name: salespersonName || null,
      contact_name: contactName || null,
      contact_phone: contactPhone || null,
      customer_category: customerCategory === "unassigned" ? null : customerCategory,
    };

    console.log("[QuotationEdit] Saving ID:", quotation.id, "Payload:", JSON.stringify(updatePayload));

    try {
      const { data, error } = await supabase
        .from("quotations")
        .update(updatePayload)
        .eq("id", quotation.id)
        .select();

      console.log("[QuotationEdit] Response data:", JSON.stringify(data), "error:", error);

      if (error) {
        toast.error("บันทึกไม่สำเร็จ: " + error.message);
        return;
      }
      if (!data || data.length === 0) {
        toast.error("ไม่พบข้อมูลที่อัพเดต — อาจเกิดจาก RLS policy หรือ ID ไม่ตรง");
        return;
      }

      const saved = data[0];
      // Pass the saved record back for optimistic local update
      onSaved(saved);
      onOpenChange(false);
      toast.success(`บันทึกสำเร็จ: ${saved.work_type || "-"} / ${saved.follow_up_status || "-"}`);
    } catch (err: any) {
      toast.error("เกิดข้อผิดพลาด: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" aria-describedby="edit-dialog-desc">
        <DialogHeader>
          <DialogTitle className="font-sarabun">
            ติดตามงาน / Follow-up — {quotation?.document_number}
          </DialogTitle>
          <p id="edit-dialog-desc" className="text-sm text-muted-foreground sr-only">แก้ไขข้อมูลใบเสนอราคา</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground font-sarabun">
            {quotation?.customer_name} • {quotation?.project_name} • ฿{Number(quotation?.net_total || 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </div>

          <div className="space-y-2">
            <Label className="font-sarabun">ประเภทลูกค้า / Customer Category</Label>
            <Select value={customerCategory} onValueChange={setCustomerCategory}>
              <SelectTrigger className="font-sarabun">
                <SelectValue placeholder="เลือกประเภทลูกค้า..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">— ยังไม่ระบุ —</SelectItem>
                {CUSTOMER_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-sarabun">ชื่อคนขาย / Salesperson</Label>
            <Input
              className="font-sarabun"
              placeholder="ชื่อพนักงานขาย..."
              value={salespersonName}
              onChange={(e) => setSalespersonName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-sarabun">ผู้ติดต่อลูกค้า / Contact</Label>
              <Input
                className="font-sarabun"
                placeholder="ชื่อผู้ติดต่อ..."
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-sarabun">เบอร์โทร / Phone</Label>
              <Input
                className="font-sarabun"
                placeholder="0xx-xxx-xxxx"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-sarabun">ประเภทงาน / Work Type</Label>
            <Select value={workType} onValueChange={setWorkType}>
              <SelectTrigger className="font-sarabun">
                <SelectValue placeholder="เลือกประเภทงาน..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">— ยังไม่ระบุ —</SelectItem>
                {WORK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-sarabun">สถานะติดตาม / Follow-up Status</Label>
            <Select value={followUpStatus} onValueChange={setFollowUpStatus}>
              <SelectTrigger className="font-sarabun">
                <SelectValue placeholder="เลือกสถานะ..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">— ยังไม่ระบุ —</SelectItem>
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
                <SelectItem value="unassigned">— ยังไม่ระบุ —</SelectItem>
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

        {quotation && (
          <FollowUpHistory
            quotationId={quotation.id}
            salespersonName={salespersonName}
          />
        )}

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
