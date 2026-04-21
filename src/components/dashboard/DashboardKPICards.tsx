import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, CheckCircle, BarChart3, Flame, XCircle } from "lucide-react";

interface DashboardKPICardsProps {
  actualSales: number;
  pipelineOpportunities: number;
  hotLeadsValue: number;
  hotLeadsCount: number;
  totalQuotations: number;
  pendingCount: number;
  rejectedCount: number;
  rejectedValue: number;
}

export function DashboardKPICards({
  actualSales,
  pipelineOpportunities,
  hotLeadsValue,
  hotLeadsCount,
  totalQuotations,
  pendingCount,
  rejectedCount,
  rejectedValue,
}: DashboardKPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
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
          <p className="text-xs text-muted-foreground font-sarabun mt-1">เฉพาะ ปิดการขายได้ เท่านั้น</p>
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
          <p className="text-xs text-muted-foreground font-sarabun mt-1">ยอดรวมทุกใบเสนอราคา</p>
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
            {hotLeadsCount} รายการ | Pending &gt;100K &lt;15 วัน
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

      <Card className="border-l-4" style={{ borderLeftColor: "hsl(0, 72%, 51%)" }}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-sarabun text-muted-foreground">
            ขายไม่ได้ / Lost
          </CardTitle>
          <XCircle className="h-4 w-4" style={{ color: "hsl(0, 72%, 51%)" }} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-sarabun" style={{ color: "hsl(0, 72%, 51%)" }}>
            {rejectedCount} ใบ
          </div>
          <p className="text-xs text-muted-foreground font-sarabun mt-1">
            ฿{rejectedValue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
