import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import type { CarAlert, RentalAlert } from '@/types/models';

export const alertService = {
  async rentalAlerts(): Promise<RentalAlert[]> {
    return unwrap(
      await supabase.from('rental_alerts').select('*').order('sort_rank').order('days', { ascending: false }),
    ) as RentalAlert[];
  },
  async carAlerts(): Promise<CarAlert[]> {
    return unwrap(await supabase.from('car_alerts').select('*').order('insurance_expiry')) as CarAlert[];
  },
};
