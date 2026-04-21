import { useState, useMemo } from "react";
import { useQuotations } from "@/hooks/useQuotations";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardKPICards } from "@/components/dashboard/DashboardKPICards";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { MonthlyComparison } from "@/components/MonthlyComparison";

export default function Index() {
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [followUpFilter, setFollowUpFilter] = useState("all");
  const [customerCategoryFilter, setCustomerCategoryFilter] = useState("all");
  const [salespersonFilter, setSalespersonFilter] = useState("all");

  const {
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
  } = useQuotations({
    yearFilter,
    monthFilter,
    workTypeFilter,
    customerTypeFilter,
    followUpFilter,
    customerCategoryFilter,
    salespersonFilter,
  });

  const salespersonOptions = useMemo(() => {
    const names = new Set<string>();
    quotations.forEach((q) => { if (q.salesperson_name) names.add(q.salesperson_name.trim()); });
    return Array.from(names).sort();
  }, [quotations]);

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

      <DashboardFilters
        yearFilter={yearFilter}
        monthFilter={monthFilter}
        workTypeFilter={workTypeFilter}
        customerTypeFilter={customerTypeFilter}
        followUpFilter={followUpFilter}
        customerCategoryFilter={customerCategoryFilter}
        salespersonFilter={salespersonFilter}
        salespersonOptions={salespersonOptions}
        availableYears={availableYears}
        onYearChange={setYearFilter}
        onMonthChange={setMonthFilter}
        onWorkTypeChange={setWorkTypeFilter}
        onCustomerTypeChange={setCustomerTypeFilter}
        onFollowUpChange={setFollowUpFilter}
        onCustomerCategoryChange={setCustomerCategoryFilter}
        onSalespersonChange={setSalespersonFilter}
      />

      <DashboardKPICards
        actualSales={actualSales}
        pipelineOpportunities={pipelineOpportunities}
        hotLeadsValue={hotLeadsValue}
        hotLeadsCount={hotLeads.length}
        totalQuotations={totalQuotations}
        pendingCount={pendingCount}
      />

      <DashboardCharts quotations={filtered} />

      <MonthlyComparison quotations={filtered} />
    </div>
  );
}
