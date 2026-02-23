import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { DollarSign, FileText, Clock, CheckCircle } from "lucide-react";

interface Quotation {
  id: string;
  document_number: string;
  net_total: number;
  status: string;
  document_date: string | null;
  created_at: string;
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
  revenue: { label: "รายได้ / Revenue", color: "hsl(var(--primary))" },
};

export default function Index() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("quotations")
        .select("id, document_number, net_total, status, document_date, created_at")
        .order("created_at", { ascending: false });
      setQuotations(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalRevenue = quotations.reduce((sum, q) => sum + Number(q.net_total || 0), 0);
  const totalQuotations = quotations.length;
  const approvedCount = quotations.filter((q) => q.status === "approved").length;
  const pendingCount = quotations.filter((q) => q.status === "pending").length;

  // Status pie data
  const statusMap: Record<string, number> = {};
  quotations.forEach((q) => {
    const s = q.status || "other";
    statusMap[s] = (statusMap[s] || 0) + 1;
  });
  const pieData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // Monthly revenue
  const monthlyMap: Record<string, number> = {};
  quotations.forEach((q) => {
    const date = q.document_date || q.created_at;
    if (date) {
      const month = date.substring(0, 7); // YYYY-MM
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
        แดชบอร์ด / Dashboard
      </h1>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              รายได้รวม / Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun">
              ฿{totalRevenue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              ใบเสนอราคาทั้งหมด / Total Quotations
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun">{totalQuotations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              อนุมัติแล้ว / Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sarabun">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-sarabun text-muted-foreground">
              รอดำเนินการ / Pending
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
            <CardTitle className="font-sarabun">
              สถานะใบเสนอราคา / Quotation Status
            </CardTitle>
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
              <p className="text-muted-foreground font-sarabun text-center py-12">
                ยังไม่มีข้อมูล / No data yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-sarabun">
              รายได้รายเดือน / Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground font-sarabun text-center py-12">
                ยังไม่มีข้อมูล / No data yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
