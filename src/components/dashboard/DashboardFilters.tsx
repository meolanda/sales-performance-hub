import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORK_TYPES } from "@/hooks/useQuotations";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const FOLLOW_UP_STATUSES = [
  "ติดต่อไม่ได้",
  "รอส่งข้อมูลเพิ่ม",
  "กำลังต่อรอง",
  "นัดดูหน้างาน",
  "ปิดการขายได้",
  "ปิดการขายไม่ได้",
];

interface DashboardFiltersProps {
  yearFilter: string;
  monthFilter: string;
  workTypeFilter: string;
  customerTypeFilter: string;
  followUpFilter: string;
  availableYears: string[];
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onWorkTypeChange: (value: string) => void;
  onCustomerTypeChange: (value: string) => void;
  onFollowUpChange: (value: string) => void;
}

export function DashboardFilters({
  yearFilter,
  monthFilter,
  workTypeFilter,
  customerTypeFilter,
  followUpFilter,
  availableYears,
  onYearChange,
  onMonthChange,
  onWorkTypeChange,
  onCustomerTypeChange,
  onFollowUpChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={yearFilter} onValueChange={onYearChange}>
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

      <Select value={monthFilter} onValueChange={onMonthChange}>
        <SelectTrigger className="w-[140px] font-sarabun">
          <SelectValue placeholder="เดือน / Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกเดือน / All</SelectItem>
          {Array.from({ length: 12 }, (_, i) => {
            const m = String(i + 1).padStart(2, "0");
            return <SelectItem key={m} value={m}>{THAI_MONTHS[i]} / {m}</SelectItem>;
          })}
        </SelectContent>
      </Select>

      <Select value={workTypeFilter} onValueChange={onWorkTypeChange}>
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

      <Select value={customerTypeFilter} onValueChange={onCustomerTypeChange}>
        <SelectTrigger className="w-[220px] font-sarabun">
          <SelectValue placeholder="ประเภทลูกค้า / Customer Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งหมด / All</SelectItem>
          <SelectItem value="corporate">นิติบุคคล / Corporate</SelectItem>
          <SelectItem value="residential">บุคคลธรรมดา / Residential</SelectItem>
        </SelectContent>
      </Select>

      <Select value={followUpFilter} onValueChange={onFollowUpChange}>
        <SelectTrigger className="w-[200px] font-sarabun">
          <SelectValue placeholder="สถานะติดตาม / Follow-up" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกสถานะ / All</SelectItem>
          {FOLLOW_UP_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
