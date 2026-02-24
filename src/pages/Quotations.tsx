import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Search, ArrowUpDown, Pencil, Download } from "lucide-react";
import QuotationEditDialog from "@/components/QuotationEditDialog";

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

const WORK_TYPES = [
  "งานระบบ Hood",
  "งานล้างแอร์",
  "งาน PM",
  "งานซ่อมแอร์",
  "งานติดตั้ง",
  "งานอื่นๆ",
];

function isCorporate(name: string | null): boolean {
  if (!name) return false;
  return /บริษัท|จำกัด|หจก|ห้างหุ้นส่วน|Co\.|Ltd|Corp|Inc/i.test(name);
}

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("net_total");
  const [sortAsc, setSortAsc] = useState(false);
  const [editQuotation, setEditQuotation] = useState<Quotation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchQuotations = useCallback(async () => {
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
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    quotations.forEach((q) => {
      const date = q.document_date || q.created_at;
      if (date) years.add(date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [quotations]);

  const filtered = useMemo(() => {
    let result = quotations.filter((q) => {
      const date = q.document_date || q.created_at;
      if (yearFilter !== "all" && date && !date.startsWith(yearFilter)) return false;
      if (monthFilter !== "all" && date && date.substring(5, 7) !== monthFilter) return false;
      if (workTypeFilter !== "all" && q.work_type !== workTypeFilter) return false;
      if (customerTypeFilter === "corporate" && !isCorporate(q.customer_name)) return false;
      if (customerTypeFilter === "residential" && isCorporate(q.customer_name)) return false;
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
  }, [quotations, search, statusFilter, yearFilter, monthFilter, workTypeFilter, customerTypeFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const exportCSV = useCallback(() => {
    const headers = ["เลขที่เอกสาร", "วันที่", "ลูกค้า", "โปรเจกต์", "ประเภทงาน", "ยอดสุทธิ", "สถานะ", "ติดตาม", "Priority", "นัดถัดไป", "บันทึก"];
    const rows = filtered.map(q => [
      q.document_number,
      q.document_date || "",
      q.customer_name || "",
      q.project_name || "",
      q.work_type || "",
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-sarabun text-foreground">
        ติดตามใบเสนอราคา / Sales Tracking
      </h1>

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
            <SelectItem value="approved">อนุมัติ / Approved</SelectItem>
            <SelectItem value="pending">รอดำเนินการ / Pending</SelectItem>
            <SelectItem value="rejected">ปฏิเสธ / Rejected</SelectItem>
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
              <TableHead className="font-sarabun">เลขที่ / Doc No.</TableHead>
              <TableHead className="font-sarabun">วันที่ / Date</TableHead>
              <TableHead className="font-sarabun">ลูกค้า / Customer</TableHead>
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
              <TableHead className="font-sarabun">Priority</TableHead>
              <TableHead className="font-sarabun">นัดถัดไป / Next</TableHead>
              <TableHead className="font-sarabun w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center font-sarabun text-muted-foreground py-8">
                  กำลังโหลด... / Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center font-sarabun text-muted-foreground py-8">
                  ไม่พบข้อมูล / No data found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((q) => {
                const aging = calcAging(q.document_date, q.created_at);
                return (
                  <TableRow key={q.id} className={q.status === "pending" && aging > 30 ? "bg-destructive/5" : ""}>
                    <TableCell className="font-sarabun font-medium">{q.document_number}</TableCell>
                    <TableCell className="font-sarabun">{q.document_date || "-"}</TableCell>
                    <TableCell className="font-sarabun max-w-[150px] truncate">{q.customer_name || "-"}</TableCell>
                    <TableCell className="font-sarabun text-xs">{q.work_type || "-"}</TableCell>
                    <TableCell className="font-sarabun text-right">
                      ฿{Number(q.net_total).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{agingBadge(aging, q.status)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(q.status)} className="font-sarabun">
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-sarabun text-xs">
                      {q.follow_up_status || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>{priorityBadge(q.sales_priority)}</TableCell>
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
            // Optimistic local update — immediately reflect changes in the table
            setQuotations(prev => prev.map(q => q.id === updatedRecord.id ? { ...q, ...updatedRecord } : q));
          }
          // Delay refetch slightly to avoid overwriting optimistic update with stale data
          setTimeout(() => fetchQuotations(), 1500);
        }}
      />
    </div>
  );
}
