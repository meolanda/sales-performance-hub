import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Quotation, WORK_TYPES } from "@/hooks/useQuotations";

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
  approved: { label: "ปิดการขายได้", color: "hsl(142, 71%, 45%)" },
  pending: { label: "รอดำเนินการ / Pending", color: "hsl(48, 96%, 53%)" },
  rejected: { label: "ปฏิเสธ / Rejected", color: "hsl(0, 84%, 60%)" },
  other: { label: "อื่นๆ / Other", color: "hsl(217, 91%, 60%)" },
  revenue: { label: "ยอดขาย / Sales", color: "hsl(142, 71%, 45%)" },
  pipeline: { label: "โอกาสขาย / Pipeline", color: "hsl(48, 96%, 53%)" },
};

interface DashboardChartsProps {
  quotations: Quotation[];
}

export function DashboardCharts({ quotations }: DashboardChartsProps) {
  // Status pie chart data
  const pieData = useMemo(() => {
    const statusMap: Record<string, number> = {};
    quotations.forEach((q) => {
      statusMap[q.status || "other"] = (statusMap[q.status || "other"] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [quotations]);

  // Work type breakdown
  const workTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    quotations.forEach((q) => {
      const wt = q.work_type || "งานอื่นๆ";
      map[wt] = (map[wt] || 0) + Number(q.net_total || 0);
    });
    return WORK_TYPES.filter((t) => map[t]).map((name) => ({
      name,
      value: map[name],
    }));
  }, [quotations]);

  // Monthly approved vs pending
  const monthlyData = useMemo(() => {
    const map: Record<string, { approved: number; pending: number }> = {};
    quotations.forEach((q) => {
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
  }, [quotations]);

  return (
    <>
      {/* Status and Work Type Charts */}
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

      {/* Monthly Chart */}
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
    </>
  );
}
