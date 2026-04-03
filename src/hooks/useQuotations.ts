import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Quotation {
  id: string;
  document_number: string;
  net_total: number;
  status: string;
  document_date: string | null;
  created_at: string;
  work_type: string | null;
  customer_name: string | null;
  follow_up_status: string | null;
  project_name?: string | null;
  amount?: number | null;
  vat?: number | null;
  sales_priority?: string | null;
  next_follow_up_date?: string | null;
  internal_notes?: string | null;
  salesperson_name?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  customer_category?: string | null;
}

export const WORK_TYPES = [
  "งานระบบ Hood",
  "งานล้างแอร์",
  "งาน PM",
  "งานซ่อมแอร์",
  "งานติดตั้ง",
  "งานอื่นๆ",
];

export function isCorporate(name: string | null): boolean {
  if (!name) return false;
  return /บริษัท|จำกัด|หจก|ห้างหุ้นส่วน|Co\.|Ltd|Corp|Inc/i.test(name);
}

export interface UseQuotationsOptions {
  yearFilter?: string;
  monthFilter?: string;
  workTypeFilter?: string;
  customerTypeFilter?: string;
}

export function useQuotations(options: UseQuotationsOptions = {}) {
  const {
    yearFilter = "all",
    monthFilter = "all",
    workTypeFilter = "all",
    customerTypeFilter = "all",
  } = options;

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    const allData: Quotation[] = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data: page, error } = await supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error fetching quotations:", error);
        break;
      }
      if (!page || page.length === 0) break;
      allData.push(...page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    setQuotations(allData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

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

  // KPI calculations
  const actualSales = useMemo(
    () => filtered.filter((q) => q.status === "approved").reduce((sum, q) => sum + Number(q.net_total || 0), 0),
    [filtered]
  );

  const pipelineOpportunities = useMemo(
    () => filtered.filter((q) => q.status === "pending").reduce((sum, q) => sum + Number(q.net_total || 0), 0),
    [filtered]
  );

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

  return {
    quotations,
    filtered,
    loading,
    availableYears,
    actualSales,
    pipelineOpportunities,
    totalQuotations,
    pendingCount,
    hotLeads,
    hotLeadsValue,
    refetch: fetchQuotations,
  };
}
