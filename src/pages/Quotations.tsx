import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import readXlsxFile from "read-excel-file";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, ArrowUpDown, Pencil, Download, Upload, Users, X } from "lucide-react";
import QuotationEditDialog from "@/components/QuotationEditDialog";
import { useToast } from "@/hooks/use-toast";
import { WORK_TYPES, isCorporate } from "@/hooks/useQuotations";
import { parseDate, mapStatus, CUSTOMER_CATEGORIES } from "@/lib/quotationUtils";

interface Quotation {
  id: string;
  document_number: string;
  document_date: string | null;
  customer_name: string | null;
  project_name: string | null;
  work_type: string | null;
  amount: number;
  vat: number;
  net_total: number;
  status: string;
  created_at: string;
  follow_up_status: string | null;
  sales_priority: string | null;
  next_follow_up_date: string | null;
  internal_notes: string | null;
  salesperson_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  customer_category: string | null;
}

type SortKey = "net_total" | "aging";

function calcAging(dateStr: string | null, createdAt: string): number {
  const ref = dateStr || createdAt;
  if (!ref) return 0;
  return Math.floor((new Date().getTime() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
}

const priorityBadge = (p: string | null) => {
  if (!p) return null;
  if (p.startsWith("A")) return <Badge variant="destructive" className="font-sarabun text-xs">{p}</Badge>;
  if (p.startsWith("B")) return <Badge variant="secondary" className="font-sarabun text-xs bg-yellow-100 text-yellow-800">{p}</Badge>;
  return <Badge variant="outline" className="font-sarabun text-xs">{p}</Badge>;
};


export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("net_total");
  const [sortAsc, setSortAsc] = useState(false);
  const [editQuotation, setEditQuotation] = useState<Quotation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [salespersonFilter, setSalespersonFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkSalesperson, setBulkSalesperson] = useState("");
  const [bulkContact, setBulkContact] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [latestFollowUps, setLatestFollowUps] = useState<Map<string, { follow_date: string; result: string }>>(new Map());

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    const allData: Quotation[] = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page } = await supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (!page || page.length === 0) break;
      allData.push(...(page as Quotation[]));
      if (page.length < pageSize) break;
      from += pageSize;
    }
    setQuotations(allData);

    const { data: followUps } = await supabase
      .from("quotation_follow_ups")
      .select("quotation_id, follow_date, result")
      .order("follow_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (followUps) {
      const map = new Map<string, { follow_date: string; result: string }>();
      for (const f of followUps) {
        if (!map.has(f.quotation_id)) map.set(f.quotation_id, { follow_date: f.follow_date, result: f.result });
      }
      setLatestFollowUps(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Reset selection when any filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter, yearFilter, monthFilter, workTypeFilter, customerTypeFilter, customerCategoryFilter, salespersonFilter]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    quotations.forEach((q) => {
      const date = q.document_date || q.created_at;
      if (date) years.add(date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [quotations]);

  const salespersonOptions = useMemo(() => {
    const names = new Set<string>();
    quotations.forEach((q) => { if (q.salesperson_name) names.add(q.salesperson_name.trim()); });
    return Array.from(names).sort();
  }, [quotations]);

  const unassignedCount = useMemo(
    () => quotations.filter((q) => !q.salesperson_name).length,
    [quotations]
  );

  const filtered = useMemo(() => {
    let result = quotations.filter((q) => {
      const date = q.document_date || q.created_at;
      if (yearFilter !== "all" && date && !date.startsWith(yearFilter)) return false;
      if (monthFilter !== "all" && date && date.substring(5, 7) !== monthFilter) return false;
      if (workTypeFilter !== "all" && q.work_type !== workTypeFilter) return false;
      if (customerTypeFilter === "corporate" && !isCorporate(q.customer_name)) return false;
      if (customerTypeFilter === "residential" && isCorporate(q.customer_name)) return false;
      if (customerCategoryFilter !== "all" && q.customer_category !== customerCategoryFilter) return false;
      if (salespersonFilter === "unassigned" && q.salesperson_name) return false;
      if (salespersonFilter !== "all" && salespersonFilter !== "unassigned" && q.salesperson_name?.trim() !== salespersonFilter) return false;
      const matchSearch =
        !search ||
        q.document_number.toLowerCase().includes(search.toLowerCase()) ||
        q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        q.project_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || q.status === statusFilter;
      return matchSearch && matchStatus;
    });

    result.sort((a, b) => {
      let valA: number, valB: number;
      if (sortKey === "net_total") {
        valA = Number(a.net_total || 0);
        valB = Number(b.net_total || 0);
      } else {
        valA = calcAging(a.document_date, a.created_at);
        valB = calcAging(b.document_date, b.created_at);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [quotations, search, statusFilter, yearFilter, monthFilter, workTypeFilter, customerTypeFilter, customerCategoryFilter, salespersonFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const exportCSV = useCallback(() => {
    const headers = ["เลขที่เอกสาร", "วันที่", "ลูกค้า", "กลุ่มลูกค้า", "โปรเจกต์", "ประเภทงาน", "คนขาย", "ผู้ติดต่อ", "เบอร์โทร", "ยอดสุทธิ", "สถานะ", "ติดตาม", "Priority", "นัดถัดไป", "บันทึก"];
    const rows = filtered.map(q => [
      q.document_number,
      q.document_date || "",
      q.customer_name || "",
      q.customer_category || "",
      q.project_name || "",
      q.work_type || "",
      q.salesperson_name || "",
      q.contact_name || "",
      q.contact_phone || "",
      q.net_total,
      q.status,
      q.follow_up_status || "",
      q.sales_priority || "",
      q.next_follow_up_date || "",
      (q.internal_notes || "").replace(/[\n\r]+/g, " "),
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const statusLabel = (status: string) => {
    switch (status) {
      case "approved": return "ปิดการขายได้";
      case "pending": return "รอดำเนินการ";
      case "rejected": return "ปฏิเสธ / ขายไม่ได้";
      default: return status;
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case "approved": return "default" as const;
      case "pending": return "secondary" as const;
      case "rejected": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  const agingBadge = (days: number, status: string) => {
    if (status !== "pending") return <span className="font-sarabun text-muted-foreground">{days} วัน</span>;
    if (days > 30) return <Badge variant="destructive" className="font-sarabun">{days} วัน</Badge>;
    if (days > 14) return <Badge variant="secondary" className="font-sarabun bg-yellow-100 text-yellow-800">{days} วัน</Badge>;
    return <Badge variant="outline" className="font-sarabun">{days} วัน</Badge>;
  };

  const openEdit = (q: Quotation) => {
    setEditQuotation(q);
    setDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filtered.map((q) => q.id)));
    else setSelectedIds(new Set());
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("quotations")
      .update({ status })
      .in("id", ids);
    setBulkUpdating(false);
    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `อัพเดทสถานะ ${ids.length} รายการสำเร็จ` });
      setSelectedIds(new Set());
      fetchQuotations();
    }
  };

  const handleBulkFollowUp = async (followUpStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    const derivedStatus =
      followUpStatus === "ปิดการขายได้" ? "approved"
      : followUpStatus === "ปิดการขายไม่ได้" ? "rejected"
      : undefined;
    const updates: Record<string, string> = { follow_up_status: followUpStatus };
    if (derivedStatus) updates.status = derivedStatus;
    const { error } = await supabase
      .from("quotations")
      .update(updates)
      .in("id", ids);
    if (error) {
      setBulkUpdating(false);
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
      return;
    }
    // Write history record for each selected quotation
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("quotation_follow_ups").insert(
      ids.map((id) => ({
        quotation_id: id,
        follow_date: today,
        followed_by: null,
        result: `[Bulk] ${followUpStatus}`,
        next_action: null,
      }))
    );
    setBulkUpdating(false);
    toast({ title: `อัพเดทสถานะติดตาม ${ids.length} รายการสำเร็จ` });
    setSelectedIds(new Set());
    fetchQuotations();
  };

  const handleBulkCategory = async (category: string) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("quotations")
      .update({ customer_category: category === "clear" ? null : category })
      .in("id", ids);
    setBulkUpdating(false);
    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `อัพเดทกลุ่มลูกค้า ${ids.length} รายการสำเร็จ` });
      setSelectedIds(new Set());
      fetchQuotations();
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds);
    const updates: Record<string, string | null> = {};
    if (bulkSalesperson.trim()) updates.salesperson_name = bulkSalesperson.trim();
    if (bulkContact.trim()) updates.contact_name = bulkContact.trim();
    const { error } = await supabase
      .from("quotations")
      .update(updates)
      .in("id", ids);
    setBulkUpdating(false);
    if (error) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `อัพเดท ${ids.length} รายการสำเร็จ` });
      setBulkAssignOpen(false);
      setBulkSalesperson("");
      setBulkContact("");
      setSelectedIds(new Set());
      fetchQuotations();
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const rows = await readXlsxFile(file);
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        if (rows[i]?.some((c) => String(c).includes("เลขที่เอกสาร"))) { headerIdx = i; break; }
      }
      if (headerIdx === -1) { toast({ title: "ไม่พบหัวตาราง", description: "Header row not found in file", variant: "destructive" }); return; }

      const dataRows = rows.slice(headerIdx + 1).filter((row) => row?.[1] && String(row[1]).startsWith("QT"));
      if (dataRows.length === 0) { toast({ title: "ไม่พบข้อมูล", description: "No QT records found", variant: "destructive" }); return; }

      const records = dataRows.map((row) => ({
        document_number: String(row[1] || ""),
        document_date: parseDate(String(row[2] || "")),
        customer_name: String(row[3] || "") || null,
        project_name: String(row[4] || "") || null,
        amount: Number(row[7]) || 0,
        vat: Number(row[8]) || 0,
        net_total: Number(row[9]) || 0,
        status: mapStatus(String(row[12] || "")),
      }));

      const batchSize = 100;
      let totalInserted = 0;
      let totalUpdated = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke("import-quotations", { body: { records: batch } });
        if (error) errors.push(error.message);
        else if (data) { totalInserted += data.inserted || 0; totalUpdated += data.updated || 0; if (data.errors?.length) errors.push(...data.errors); }
      }

      toast({
        title: `นำเข้าสำเร็จ ${totalInserted + totalUpdated} รายการ`,
        description: `เพิ่มใหม่ ${totalInserted} / อัพเดท ${totalUpdated}${errors.length ? ` | ข้อผิดพลาด: ${errors.length}` : ""}`,
      });
      fetchQuotations();
    } catch (err) {
      toast({ title: "เกิดข้อผิดพลาด", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-sarabun text-foreground">
            ติดตามใบเสนอราคา / Sales Tracking
          </h1>
          {unassignedCount > 0 && (
            <Badge
              variant="secondary"
              className="font-sarabun text-xs cursor-pointer bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              onClick={() => setSalespersonFilter("unassigned")}
            >
              ยังไม่ระบุคนขาย {unassignedCount} ใบ
            </Badge>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcel}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="font-sarabun gap-2 bg-primary text-primary-foreground"
          >
            <Upload className="h-4 w-4" />
            {importing ? "กำลังนำเข้า..." : "Import FlowAccount Excel"}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[140px] font-sarabun">
            <SelectValue placeholder="ปี / Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกปี / All Years</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[140px] font-sarabun">
            <SelectValue placeholder="เดือน / Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกเดือน / All</SelectItem>
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, "0");
              const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
              return <SelectItem key={m} value={m}>{thaiMonths[i]} / {m}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
          <SelectTrigger className="w-[200px] font-sarabun">
            <SelectValue placeholder="ประเภทงาน / Work Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท / All Types</SelectItem>
            {WORK_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
          <SelectTrigger className="w-[220px] font-sarabun">
            <SelectValue placeholder="ประเภทลูกค้า / Customer Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด / All</SelectItem>
            <SelectItem value="corporate">นิติบุคคล / Corporate</SelectItem>
            <SelectItem value="residential">บุคคลธรรมดา / Residential</SelectItem>
          </SelectContent>
        </Select>
        <Select value={customerCategoryFilter} onValueChange={setCustomerCategoryFilter}>
          <SelectTrigger className="w-[160px] font-sarabun">
            <SelectValue placeholder="กลุ่มลูกค้า" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกกลุ่ม / All</SelectItem>
            {CUSTOMER_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={salespersonFilter} onValueChange={setSalespersonFilter}>
          <SelectTrigger className="w-[180px] font-sarabun">
            <SelectValue placeholder="พนักงานขาย" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกคน / All</SelectItem>
            <SelectItem value="unassigned">ยังไม่ระบุ</SelectItem>
            {salespersonOptions.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search & Status */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา เลขที่เอกสาร, ลูกค้า... / Search..."
            className="pl-10 font-sarabun"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] font-sarabun">
            <SelectValue placeholder="สถานะ / Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด / All</SelectItem>
            <SelectItem value="pending">รอดำเนินการ / Pending</SelectItem>
            <SelectItem value="approved">ปิดการขายได้</SelectItem>
            <SelectItem value="rejected">ปฏิเสธ / ขายไม่ได้</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV} className="font-sarabun gap-2">
          <Download className="h-4 w-4" />
          Export CSV ({filtered.length})
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filtered.length > 0 && selectedIds.size === filtered.length
                      ? true
                      : selectedIds.size > 0
                      ? "indeterminate"
                      : false
                  }
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead className="font-sarabun">เลขที่ / Doc No.</TableHead>
              <TableHead className="font-sarabun">วันที่ / Date</TableHead>
              <TableHead className="font-sarabun">ลูกค้า / Customer</TableHead>
              <TableHead className="font-sarabun">กลุ่ม</TableHead>
              <TableHead className="font-sarabun">คนขาย</TableHead>
              <TableHead className="font-sarabun">ประเภทงาน / Type</TableHead>
              <TableHead className="font-sarabun text-right">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("net_total")} className="font-sarabun h-auto p-0">
                  ยอดสุทธิ / Net
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="font-sarabun">
                <Button variant="ghost" size="sm" onClick={() => toggleSort("aging")} className="font-sarabun h-auto p-0">
                  อายุ / Aging
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="font-sarabun">สถานะ / Status</TableHead>
              <TableHead className="font-sarabun">ติดตาม / Follow-up</TableHead>
              <TableHead className="font-sarabun">ติดตามล่าสุด</TableHead>
              <TableHead className="font-sarabun">นัดถัดไป / Next</TableHead>
              <TableHead className="font-sarabun w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center font-sarabun text-muted-foreground py-8">
                  กำลังโหลด... / Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center font-sarabun text-muted-foreground py-8">
                  ไม่พบข้อมูล / No data found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((q) => {
                const aging = calcAging(q.document_date, q.created_at);
                return (
                  <TableRow key={q.id} className={`${q.status === "pending" && aging > 30 ? "bg-destructive/5" : ""} ${selectedIds.has(q.id) ? "bg-primary/5" : ""}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(q.id)}
                        onCheckedChange={(checked) => handleSelectOne(q.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-sarabun font-medium">{q.document_number}</TableCell>
                    <TableCell className="font-sarabun">{q.document_date || "-"}</TableCell>
                    <TableCell className="font-sarabun max-w-[150px] truncate">{q.customer_name || "-"}</TableCell>
                    <TableCell className="font-sarabun text-xs">
                      {q.customer_category ? (
                        <Badge variant="outline" className="font-sarabun text-xs">{q.customer_category}</Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-sarabun text-xs">{q.salesperson_name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="font-sarabun text-xs">{q.work_type || "-"}</TableCell>
                    <TableCell className="font-sarabun text-right">
                      ฿{Number(q.net_total).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{agingBadge(aging, q.status)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(q.status)} className="font-sarabun">
                        {statusLabel(q.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-sarabun text-xs">
                      {q.status === "approved"
                        ? "ปิดการขายได้"
                        : q.follow_up_status || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="font-sarabun text-xs max-w-[160px]">
                      {(() => {
                        const f = latestFollowUps.get(q.id);
                        if (!f) return <span className="text-muted-foreground">—</span>;
                        return (
                          <div>
                            <span className="text-primary font-medium">{f.follow_date}</span>
                            <p className="text-muted-foreground truncate">{f.result}</p>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="font-sarabun text-xs">
                      {q.next_follow_up_date || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(q)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <QuotationEditDialog
        quotation={editQuotation}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={(updatedRecord?: any) => {
          if (updatedRecord) {
            setQuotations(prev => prev.map(q => q.id === updatedRecord.id ? { ...q, ...updatedRecord } : q));
          }
          setTimeout(() => fetchQuotations(), 1500);
        }}
      />

      {/* Floating Bulk Toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border border-border shadow-lg rounded-xl px-5 py-3">
          <span className="font-sarabun text-sm font-medium text-foreground">
            เลือก {selectedIds.size} รายการ
          </span>
          <div className="w-px h-5 bg-border" />
          <Select onValueChange={handleBulkStatus} disabled={bulkUpdating}>
            <SelectTrigger className="w-[160px] font-sarabun h-8 text-sm">
              <SelectValue placeholder="เปลี่ยนสถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">รอดำเนินการ / Pending</SelectItem>
              <SelectItem value="approved">ปิดการขายได้</SelectItem>
              <SelectItem value="rejected">ปฏิเสธ / ขายไม่ได้</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={handleBulkFollowUp} disabled={bulkUpdating}>
            <SelectTrigger className="w-[175px] font-sarabun h-8 text-sm">
              <SelectValue placeholder="สถานะติดตาม" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ติดต่อไม่ได้">ติดต่อไม่ได้</SelectItem>
              <SelectItem value="รอส่งข้อมูลเพิ่ม">รอส่งข้อมูลเพิ่ม</SelectItem>
              <SelectItem value="กำลังต่อรอง">กำลังต่อรอง</SelectItem>
              <SelectItem value="นัดดูหน้างาน">นัดดูหน้างาน</SelectItem>
              <SelectItem value="ปิดการขายได้">ปิดการขายได้</SelectItem>
              <SelectItem value="ปิดการขายไม่ได้">ปิดการขายไม่ได้</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={handleBulkCategory} disabled={bulkUpdating}>
            <SelectTrigger className="w-[150px] font-sarabun h-8 text-sm">
              <SelectValue placeholder="กลุ่มลูกค้า" />
            </SelectTrigger>
            <SelectContent>
              {CUSTOMER_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
              <SelectItem value="clear">— ล้างค่า —</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="font-sarabun gap-1.5 h-8"
            onClick={() => setBulkAssignOpen(true)}
            disabled={bulkUpdating}
          >
            <Users className="h-3.5 w-3.5" />
            ระบุพนักงานขาย
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bulk Assign Modal */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-sarabun">
              ระบุพนักงานขาย — {selectedIds.size} รายการ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="font-sarabun">พนักงานขาย</Label>
              {salespersonOptions.length > 0 && (
                <Select
                  value={bulkSalesperson || "__none__"}
                  onValueChange={(v) => { if (v !== "__none__") setBulkSalesperson(v); }}
                >
                  <SelectTrigger className="w-full font-sarabun">
                    <SelectValue placeholder="เลือกจากรายการ..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— เลือกจากรายการ —</SelectItem>
                    {salespersonOptions.map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                className="font-sarabun"
                placeholder="หรือพิมพ์ชื่อใหม่..."
                value={bulkSalesperson}
                onChange={(e) => setBulkSalesperson(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-sarabun">ผู้ติดต่อ</Label>
              <Input
                className="font-sarabun"
                placeholder="ชื่อผู้ติดต่อ..."
                value={bulkContact}
                onChange={(e) => setBulkContact(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground font-sarabun">
              ฟิลด์ที่เว้นว่างจะไม่ถูกเปลี่ยนแปลง
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAssignOpen(false)} className="font-sarabun">
              ยกเลิก
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkUpdating || (!bulkSalesperson.trim() && !bulkContact.trim())}
              className="font-sarabun"
            >
              {bulkUpdating ? "กำลังบันทึก..." : `บันทึก ${selectedIds.size} รายการ`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
