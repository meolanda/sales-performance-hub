import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Quotation {
  id: string;
  document_number: string;
  net_total: number;
  status: string;
  document_date: string | null;
  created_at: string;
  work_type: string | null;
  customer_name: string | null;
  follow_up_status?: string | null;
}

interface MonthlyRow {
  key: string;
  label: string;
  totalCount: number;
  wonCount: number;
  wonValue: number;
  winRate: number;
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatLabel(key: string): string {
  const [year, month] = key.split("-");
  const idx = parseInt(month, 10) - 1;
  return `${THAI_MONTHS[idx]} ${year}`;
}

function WinRateBadge({ rate, prevRate }: { rate: number; prevRate: number | null }) {
  const color =
    rate >= 50 ? "default" :
    rate >= 30 ? "secondary" :
    "outline";

  let TrendIcon = Minus;
  if (prevRate !== null) {
    if (rate > prevRate) TrendIcon = TrendingUp;
    else if (rate < prevRate) TrendIcon = TrendingDown;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={color} className="font-sarabun tabular-nums">
        {rate.toFixed(1)}%
      </Badge>
      {prevRate !== null && (
        <TrendIcon className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </div>
  );
}

export function MonthlyComparison({ quotations }: { quotations: Quotation[] }) {
  const rows = useMemo<MonthlyRow[]>(() => {
    const map: Record<string, { total: number; won: number; wonValue: number }> = {};

    quotations.forEach((q) => {
      const date = q.document_date || q.created_at;
      if (!date) return;
      const key = date.substring(0, 7); // YYYY-MM
      if (!map[key]) map[key] = { total: 0, won: 0, wonValue: 0 };
      map[key].total++;

      const isWon =
        q.follow_up_status === "ปิดการขายได้" ||
        q.status === "approved" ||
        q.status === "Approved";

      if (isWon) {
        map[key].won++;
        map[key].wonValue += Number(q.net_total || 0);
      }
    });

    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, d]) => ({
        key,
        label: formatLabel(key),
        totalCount: d.total,
        wonCount: d.won,
        wonValue: d.wonValue,
        winRate: d.total > 0 ? (d.won / d.total) * 100 : 0,
      }));
  }, [quotations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sarabun">
          📊 รายงานเปรียบเทียบรายเดือน / Monthly Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground font-sarabun text-center py-12">
            ยังไม่มีข้อมูล / No data yet
          </p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-sarabun">เดือน / Month</TableHead>
                  <TableHead className="font-sarabun text-right">ใบเสนอราคา / Issued</TableHead>
                  <TableHead className="font-sarabun text-right">ปิดขายได้ / Won</TableHead>
                  <TableHead className="font-sarabun text-right">มูลค่า / Won Value (฿)</TableHead>
                  <TableHead className="font-sarabun text-center">Win Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-sarabun font-medium">{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.totalCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.wonCount}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      ฿{row.wonValue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <WinRateBadge
                        rate={row.winRate}
                        prevRate={i < rows.length - 1 ? rows[i + 1].winRate : null}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
