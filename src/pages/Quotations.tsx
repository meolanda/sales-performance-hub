import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search } from "lucide-react";

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
}

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false });
      setQuotations((data as Quotation[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = quotations.filter((q) => {
    const matchSearch =
      !search ||
      q.document_number.toLowerCase().includes(search.toLowerCase()) ||
      q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.project_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default" as const;
      case "pending":
        return "secondary" as const;
      case "rejected":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-sarabun text-foreground">
        ใบเสนอราคา / Quotations
      </h1>

      {/* Filters */}
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
      </div>

      {/* Table */}
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-sarabun">เลขที่เอกสาร / Doc No.</TableHead>
              <TableHead className="font-sarabun">วันที่ / Date</TableHead>
              <TableHead className="font-sarabun">ลูกค้า / Customer</TableHead>
              <TableHead className="font-sarabun">โปรเจ็ค / Project</TableHead>
              <TableHead className="font-sarabun">ประเภทงาน / Work Type</TableHead>
              <TableHead className="font-sarabun text-right">ยอดรวมสุทธิ / Net Total</TableHead>
              <TableHead className="font-sarabun">สถานะ / Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center font-sarabun text-muted-foreground py-8">
                  กำลังโหลด... / Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center font-sarabun text-muted-foreground py-8">
                  ไม่พบข้อมูล / No data found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-sarabun font-medium">{q.document_number}</TableCell>
                  <TableCell className="font-sarabun">{q.document_date || "-"}</TableCell>
                  <TableCell className="font-sarabun">{q.customer_name || "-"}</TableCell>
                  <TableCell className="font-sarabun">{q.project_name || "-"}</TableCell>
                  <TableCell className="font-sarabun">{q.work_type || "-"}</TableCell>
                  <TableCell className="font-sarabun text-right">
                    ฿{Number(q.net_total).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(q.status)} className="font-sarabun">
                      {q.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
