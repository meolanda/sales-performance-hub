import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Quotation, WORK_TYPES } from "@/hooks/useQuotations";

const FOLLOW_UP_COLORS: Record<string, string> = {
  "ปิดการขายได้": "hsl(142, 71%, 45%)",
  "กำลังต่อรอง": "hsl(48, 96%, 53%)",
  "นัดดูหน้างาน": "hsl(280, 65%, 60%)",
  "รอส่งข้อมูลเพิ่ม": "hsl(217, 91%, 60%)",
  "ติดต่อไม่ได้": "hsl(210, 10%, 60%)",
  "ปิดการขายไม่ได้": "hsl(0, 72%, 51%)",
  "ไม่ระบุ": "hsl(210, 10%, 75%)",
};

const AGING_CONFIG = [
  { label: "< 15 วัน 🟢", maxDays: 15, bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  { label: "15–30 วัน 🟡", minDays: 15, maxDays: 30, bg: "bg-yellow-50 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-800" },
  { label: "31–60 วัน 🟠", minDays: 30, maxDays: 60, bg: "bg-orange-50 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
  { label: "> 60 วัน 🔴", minDays: 60, bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
];

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
      map[wt] = (map[wt] || 0) + Number(q.amount ?? q.net_total ?? 0);
    });
    return WORK_TYPES.filter((t) => map[t]).map((name) => ({
      name,
      value: map[name],
    }));
  }, [quotations]);

  // Follow-up status breakdown
  const followUpData = useMemo(() => {
    const map: Record<string, number> = {};
    quotations.forEach((q) => {
      const status = q.follow_up_status || "ไม่ระบุ";
      map[status] = (map[status] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [quotations]);

  // Aging buckets — pending deals only
  const agingBuckets = useMemo(() => {
    const now = new Date();
    const counts = [0, 0, 0, 0];
    const values = [0, 0, 0, 0];
    quotations
      .filter((q) => q.status === "pending")
      .forEach((q) => {
        const ref = q.document_date || q.created_at;
        if (!ref) return;
        const days = Math.floor((now.getTime() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24));
        const idx = days < 15 ? 0 : days < 30 ? 1 : days < 60 ? 2 : 3;
        counts[idx]++;
        values[idx] += Number(q.amount ?? q.net_total ?? 0);
      });
    return AGING_CONFIG.map((cfg, i) => ({ ...cfg, count: counts[i], value: values[i] }));
  }, [quotations]);

  // Monthly approved vs pending
  const monthlyData = useMemo(() => {
    const map: Record<string, { approved: number; pending: number }> = {};
    quotations.forEach((q) => {
      const date = q.document_date || q.created_at;
      if (!date) return;
      const month = date.substring(0, 7);
      if (!map[month]) map[month] = { approved: 0, pending: 0 };
      if (q.status === "approved") map[month].approved += Number(q.amount ?? q.net_total ?? 0);
      if (q.status === "pending") map[month].pending += Number(q.amount ?? q.net_total ?? 0);
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

      {/* Follow-up Breakdown + Aging */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-sarabun">สถานะการติดตาม / Follow-up Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {followUpData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px]">
                <BarChart data={followUpData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" className="text-xs" width={130} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" name="จำนวน" radius={[0, 4, 4, 0]}>
                    {followUpData.map((entry) => (
                      <Cell key={entry.name} fill={FOLLOW_UP_COLORS[entry.name] || "hsl(217, 91%, 60%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground font-sarabun text-center py-12">ยังไม่มีข้อมูล / No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-sarabun">อายุดีล Pending / Deal Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agingBuckets.map((bucket) => (
                <div
                  key={bucket.label}
                  className={`flex items-center justify-between rounded-lg border p-3 ${bucket.bg} ${bucket.border}`}
                >
                  <div>
                    <p className={`text-sm font-semibold font-sarabun ${bucket.text}`}>{bucket.label}</p>
                    <p className="text-xs text-muted-foreground font-sarabun">
                      ฿{bucket.value.toLocaleString("th-TH", { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className={`text-2xl font-bold tabular-nums ${bucket.text}`}>{bucket.count}</div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground font-sarabun pt-1">* เฉพาะใบที่ยังค้างอยู่ (Pending)</p>
            </div>
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
