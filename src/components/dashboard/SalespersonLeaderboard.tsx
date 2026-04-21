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
import { Quotation } from "@/hooks/useQuotations";

interface SalespersonLeaderboardProps {
  quotations: Quotation[];
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function SalespersonLeaderboard({ quotations }: SalespersonLeaderboardProps) {
  const rows = useMemo(() => {
    const map: Record<string, { total: number; won: number; lost: number; wonValue: number }> = {};

    quotations.forEach((q) => {
      const name = q.salesperson_name?.trim() || "ไม่ระบุ";
      if (!map[name]) map[name] = { total: 0, won: 0, lost: 0, wonValue: 0 };
      map[name].total++;
      if (q.status === "approved") {
        map[name].won++;
        map[name].wonValue += Number(q.net_total || 0);
      }
      if (q.status === "rejected") map[name].lost++;
    });

    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        ...d,
        pending: d.total - d.won - d.lost,
        winRate: d.won + d.lost > 0 ? (d.won / (d.won + d.lost)) * 100 : 0,
      }))
      .sort((a, b) => b.wonValue - a.wonValue);
  }, [quotations]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sarabun">🏆 ผลงานคนขาย / Salesperson Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-sarabun">คนขาย / Salesperson</TableHead>
                <TableHead className="font-sarabun text-right">ใบทั้งหมด</TableHead>
                <TableHead className="font-sarabun text-right">ปิดได้</TableHead>
                <TableHead className="font-sarabun text-right">ปิดไม่ได้</TableHead>
                <TableHead className="font-sarabun text-right">Pending</TableHead>
                <TableHead className="font-sarabun text-center">Win Rate*</TableHead>
                <TableHead className="font-sarabun text-right">มูลค่าปิดได้ (฿)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row.name}>
                  <TableCell className="font-sarabun font-medium">
                    {MEDALS[i] ? `${MEDALS[i]} ` : ""}{row.name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.total}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-green-600 dark:text-green-400">
                    {row.won}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-red-500">
                    {row.lost}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.pending}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={
                        row.winRate >= 50 ? "default" : row.winRate >= 30 ? "secondary" : "outline"
                      }
                      className="font-sarabun tabular-nums"
                    >
                      {row.winRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    ฿{row.wonValue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground font-sarabun mt-2">
          * Win Rate คำนวณจากใบที่ปิดผลแล้วเท่านั้น (ปิดได้ + ปิดไม่ได้) ไม่รวม Pending
        </p>
      </CardContent>
    </Card>
  );
}
