import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface Quotation {
  id: string;
  document_number: string;
  net_total: number;
  status: string;
  document_date: string | null;
  created_at: string;
  work_type: string | null;
}

const PIE_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(48, 96%, 53%)",
  "hsl(0, 84%, 60%)",
  "hsl(217, 91%, 60%)",
];

const chartConfig = {
  approved: { label: "อนุมัติ / Approved", color: "hsl(142, 71%, 45%)" },
  pending: { label: "รอดำเนินการ / Pending", color: "hsl(48, 96%, 53%)" },
  rejected: { label: "ปฏิเสธ / Rejected", color: "hsl(0, 84%, 60%)" },
  other: { label: "อื่นๆ / Other", color: "hsl(217, 91%, 60%)" },
  revenue: { label: "ยอดขาย / Sales", color: "hsl(var(--primary))" },
};

export default function Index() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("quotations")
        .select("id, document_number, net_total, status, document_date, created_at, work_type")
        .order("created_at", { ascending: false });
      setQuotations(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Derive available years from data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    quotations.forEach((q) => {
      const date = q.document_date || q.created_at;
      if (date) years.add(date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [quotations]);

  // Derive available work types
  const availableWorkTypes = useMemo(() => {
    const types = new Set<string>();
    quotations.forEach((q) => {
      if (q.work_type) types.add(q.work_type);
    });
    return Array.from(types).sort();
  }, [quotations]);

  // Filtered quotations
  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const date = q.document_date || q.created_at;
      if (yearFilter !== "all" && date && !date.startsWith(yearFilter)) return false;
      if (monthFilter !== "all" && date && date.substring(5, 7) !== monthFilter) return false;
      if (workTypeFilter !== "all" && q.work_type !== workTypeFilter) return false;
      return true;
    });
  }, [quotations, yearFilter, monthFilter, workTypeFilter]);

  // KPIs
  const actualSales = filtered
    .filter((q) => q.status === "approved")
    .reduce((sum, q) => sum + Number(q.net_total || 0), 0);
  const pipelineOpportunities = filtered
    .filter((q) => q.status === "pending")
    .reduce((sum, q) => sum + Number(q.net_total || 0), 0);
  const totalQuotations = filtered.length;
  const pendingCount = filtered.filter((q) => q.status === "pending").length;

  // Status pie data
  const statusMap: Record<string, number> = {};
  filtered.forEach((q) => {
    const s = q.status || "other";
    statusMap[s] = (statusMap[s] || 0) + 1;
  });
  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Monthly sales (approved only)
  const monthlyMap: Record<string, number> = {};
  filtered
    .filter((q) => q.status === "approved")
    .forEach((q) => {
      const date = q.document_date || q.created_at;
      if (date) {
        const month = date.substring(0, 7);
        monthlyMap[month] = (monthlyMap[month] || 0) + Number(q.net_total || 0);
      }
    });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({ month, revenue }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground font-sarabun">กำลังโหลด... / Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-sarabun text-foreground">
        ติดตามยอดขาย / Sales Monitoring
      </h1>

      {/* Filters */}
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
            {availableWorkTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              ยอดขายจริง / Actual Sales
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun text-green-600">
              ฿{actualSales.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground font-sarabun mt-1">เฉพาะใบเสนอราคาที่อนุมัติแล้ว</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              โอกาสขาย / Pipeline
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun text-yellow-600">
              ฿{pipelineOpportunities.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground font-sarabun mt-1">ใบเสนอราคารอดำเนินการ</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              ใบเสนอราคาทั้งหมด / Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun">{totalQuotations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              รอติดตาม / Pending Follow-up
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-sarabun">สถานะใบเสนอราคา / Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground font-sarabun text-center py-12">ยังไม่มีข้อมูล / No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-sarabun">ยอดขายจริงรายเดือน / Monthly Actual Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground font-sarabun text-center py-12">ยังไม่มีข้อมูล / No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
