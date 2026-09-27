import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { DashboardSummary, IncomeRow } from '@/types/models';

export const reportService = {
  async dashboard(): Promise<DashboardSummary> {
    return unwrap(await supabase.from('dashboard_summary').select('*').single()) as DashboardSummary;
  },
  /** Income rows (cash basis, rule P-7) between two dates inclusive */
  async income(from: string, to: string): Promise<IncomeRow[]> {
    return unwrap(
      await supabase
        .from('income_ledger')
        .select('*')
        .gte('payment_date', from)
        .lte('payment_date', to)
        .order('payment_date')
        .limit(5000),
    ) as IncomeRow[];
  },
};
