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
import { TrendingUp, Clock, CheckCircle, BarChart3, Flame } from "lucide-react";
import { MonthlyComparison } from "@/components/MonthlyComparison";

interface Quotation {
  id: string;
  document_number: string;
  net_total: number;
  status: string;
  document_date: string | null;
  created_at: string;
  work_type: string | null;
  customer_name: string | null;
  follow_up_status: string | null;
}

const PIE_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(48, 96%, 53%)",
  "hsl(0, 84%, 60%)",
  "hsl(217, 91%, 60%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
];

const WORK_TYPE_COLORS: Record<string, string> = {
  "งานระบบ Hood": "hsl(280, 65%, 60%)",
  "งานล้างแอร์": "hsl(217, 91%, 60%)",
  "งาน PM": "hsl(48, 96%, 53%)",
  "งานซ่อมแอร์": "hsl(0, 84%, 60%)",
  "งานติดตั้ง": "hsl(142, 71%, 45%)",
  "งานอื่นๆ": "hsl(210, 10%, 60%)",
};

const chartConfig = {
  approved: { label: "อนุมัติ / Approved", color: "hsl(142, 71%, 45%)" },
  pending: { label: "รอดำเนินการ / Pending", color: "hsl(48, 96%, 53%)" },
  rejected: { label: "ปฏิเสธ / Rejected", color: "hsl(0, 84%, 60%)" },
  other: { label: "อื่นๆ / Other", color: "hsl(217, 91%, 60%)" },
  revenue: { label: "ยอดขาย / Sales", color: "hsl(142, 71%, 45%)" },
  pipeline: { label: "โอกาสขาย / Pipeline", color: "hsl(48, 96%, 53%)" },
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

export default function Index() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      const allData: Quotation[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page } = await supabase
          .from("quotations")
          .select("id, document_number, net_total, status, document_date, created_at, work_type, customer_name, follow_up_status")
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (!page || page.length === 0) break;
        allData.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }
      setQuotations(allData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    quotations.forEach((q) => {
      const date = q.document_date || q.created_at;
      if (date) years.add(date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [quotations]);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const date = q.document_date || q.created_at;
      if (yearFilter !== "all" && date && !date.startsWith(yearFilter)) return false;
      if (monthFilter !== "all" && date && date.substring(5, 7) !== monthFilter) return false;
      if (workTypeFilter !== "all" && q.work_type !== workTypeFilter) return false;
      if (customerTypeFilter === "corporate" && !isCorporate(q.customer_name)) return false;
      if (customerTypeFilter === "residential" && isCorporate(q.customer_name)) return false;
      return true;
    });
  }, [quotations, yearFilter, monthFilter, workTypeFilter, customerTypeFilter]);

  const actualSales = filtered
    .filter((q) => q.status === "approved")
    .reduce((sum, q) => sum + Number(q.net_total || 0), 0);
  const pipelineOpportunities = filtered
    .filter((q) => q.status === "pending")
    .reduce((sum, q) => sum + Number(q.net_total || 0), 0);
  const totalQuotations = filtered.length;
  const pendingCount = filtered.filter((q) => q.status === "pending").length;

  // Hot Leads: Pending, value > 100k, aging < 15 days
  const hotLeads = useMemo(() => {
    const now = new Date();
    return filtered.filter((q) => {
      if (q.status !== "pending") return false;
      if (Number(q.net_total || 0) <= 100000) return false;
      const ref = q.document_date || q.created_at;
      if (!ref) return false;
      const days = Math.floor((now.getTime() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
      return days < 15;
    });
  }, [filtered]);

  const hotLeadsValue = hotLeads.reduce((sum, q) => sum + Number(q.net_total || 0), 0);

  // Status pie
  const statusMap: Record<string, number> = {};
  filtered.forEach((q) => {
    statusMap[q.status || "other"] = (statusMap[q.status || "other"] || 0) + 1;
  });
  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Work type breakdown
  const workTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((q) => {
      const wt = q.work_type || "งานอื่นๆ";
      map[wt] = (map[wt] || 0) + Number(q.net_total || 0);
    });
    return WORK_TYPES.filter((t) => map[t]).map((name) => ({
      name,
      value: map[name],
    }));
  }, [filtered]);

  // Monthly approved vs pending
  const monthlyData = useMemo(() => {
    const map: Record<string, { approved: number; pending: number }> = {};
    filtered.forEach((q) => {
      const date = q.document_date || q.created_at;
      if (!date) return;
      const month = date.substring(0, 7);
      if (!map[month]) map[month] = { approved: 0, pending: 0 };
      if (q.status === "approved") map[month].approved += Number(q.net_total || 0);
      if (q.status === "pending") map[month].pending += Number(q.net_total || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }, [filtered]);

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
        ติดตามยอดขาย / Sales Monitoring — DIF Co., Ltd.
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4" style={{ borderLeftColor: "hsl(142, 71%, 45%)" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              ยอดขายจริง / Actual Sales
            </CardTitle>
            <CheckCircle className="h-4 w-4" style={{ color: "hsl(142, 71%, 45%)" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun" style={{ color: "hsl(142, 71%, 40%)" }}>
              ฿{actualSales.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground font-sarabun mt-1">เฉพาะ Approved เท่านั้น</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: "hsl(48, 96%, 53%)" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              โอกาสขาย / Pipeline
            </CardTitle>
            <TrendingUp className="h-4 w-4" style={{ color: "hsl(48, 96%, 53%)" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun" style={{ color: "hsl(48, 70%, 40%)" }}>
              ฿{pipelineOpportunities.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground font-sarabun mt-1">Pending รอปิดดีล</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: "hsl(0, 84%, 60%)" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              🔥 Hot Leads
            </CardTitle>
            <Flame className="h-4 w-4" style={{ color: "hsl(0, 84%, 60%)" }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun" style={{ color: "hsl(0, 84%, 55%)" }}>
              ฿{hotLeadsValue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground font-sarabun mt-1">
              {hotLeads.length} รายการ | Pending &gt;100K &lt;15 วัน
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              ใบเสนอราคา / Total
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun">{totalQuotations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              รอติดตาม / Pending
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
            <CardTitle className="font-sarabun">รายได้ตามประเภทงาน / Revenue by Work Type</CardTitle>
          </CardHeader>
          <CardContent>
            {workTypeData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={workTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {workTypeData.map((entry) => (
                      <Cell key={entry.name} fill={WORK_TYPE_COLORS[entry.name] || "hsl(210, 10%, 60%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground font-sarabun text-center py-12">ยังไม่มีข้อมูล / No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Approved vs Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="font-sarabun">ยอดขาย vs โอกาสขาย รายเดือน / Monthly Sales vs Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[350px]">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="approved" name="ยอดขายจริง / Actual" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="โอกาสขาย / Pipeline" fill="hsl(48, 96%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground font-sarabun text-center py-12">ยังไม่มีข้อมูล / No data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Comparison */}
      <MonthlyComparison quotations={filtered} />
    </div>
  );
}
