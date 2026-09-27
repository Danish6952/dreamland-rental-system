/**
 * Row types for the tables and views in app/supabase/migrations.
 * Keep in sync with the SQL (numeric columns arrive as numbers or strings —
 * always wrap with Number() before doing arithmetic).
 */

export type UserRole = 'owner' | 'staff';
export type CarStatus = 'available' | 'on_rent' | 'maintenance' | 'sold';
export type RentPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RentalStatus = 'out' | 'returned' | 'closed' | 'void';
export type PaymentType = 'advance' | 'rent' | 'deposit_taken' | 'deposit_used' | 'deposit_returned' | 'refund';
export type FuelLevel = 'empty' | 'quarter' | 'half' | 'three_quarter' | 'full';
export type Money = number | string;

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  preferred_language: 'en' | 'ur';
  created_at: string;
}

export interface Car {
  id: string;
  branch_id: string;
  car_number: string;
  make: string | null;
  model: string;
  year: number | null;
  color: string | null;
  registered_to: string | null;
  standard_rent: Money;
  standard_rent_period: RentPeriod;
  insurance_expiry: string | null;
  status: CarStatus;
  status_changed_at: string;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** view car_list */
export interface CarListItem extends Car {
  active_rental_id: string | null;
  active_rental_number: string | null;
  active_driver_name: string | null;
  active_expected_return_date: string | null;
  last_status_reason: string | null;
}

export type CarInput = Pick<
  Car,
  | 'car_number'
  | 'make'
  | 'model'
  | 'year'
  | 'color'
  | 'registered_to'
  | 'standard_rent'
  | 'standard_rent_period'
  | 'insurance_expiry'
  | 'notes'
>;

/** view car_earnings */
export interface CarEarnings {
  car_id: string;
  car_number: string;
  make: string | null;
  model: string;
  status: CarStatus;
  archived_at: string | null;
  rentals_count: number;
  total_billed: Money;
  total_received: Money;
  total_pending: Money;
  last_rented_at: string | null;
}

export interface CarStatusHistory {
  id: number;
  car_id: string;
  from_status: CarStatus | null;
  to_status: CarStatus;
  reason: string | null;
  rental_id: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface SoldCar {
  id: string;
  car_id: string;
  sale_date: string;
  sale_price: Money;
  buyer_name: string;
  buyer_mobile: string | null;
  buyer_cnic: string | null;
  notes: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  mobile: string;
  license_number: string;
  cnic: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
}

/** view customer_balances */
export interface CustomerBalance {
  customer_id: string;
  full_name: string;
  mobile: string;
  license_number: string;
  archived_at: string | null;
  rentals_count: number;
  active_rentals_count: number;
  total_billed: Money;
  total_paid: Money;
  total_pending: Money;
  total_overdue: Money;
  deposit_held: Money;
  last_rental_at: string | null;
}

/** view rental_balances */
export interface RentalBalance {
  id: string;
  rental_number: string;
  branch_id: string;
  status: RentalStatus;
  car_id: string;
  car_number: string;
  car_make: string | null;
  car_model: string;
  car_color: string | null;
  customer_id: string;
  driver_name: string;
  driver_mobile: string;
  driver_license: string;
  guarantor_name: string;
  guarantor_mobile: string;
  rental_type: RentPeriod;
  agreed_rate: Money;
  standard_rent_snapshot: Money | null;
  out_at: string;
  expected_return_date: string;
  returned_at: string | null;
  closed_at: string | null;
  payment_due_date: string | null;
  payment_due_amount: Money | null;
  start_km: number | null;
  end_km: number | null;
  fuel_out: FuelLevel | null;
  fuel_in: FuelLevel | null;
  rent_amount: Money;
  fuel_charge: Money;
  damage_charge: Money;
  damage_notes: string | null;
  extra_km_charge: Money;
  other_charge: Money;
  other_charge_note: string | null;
  total_bill: Money;
  notes: string | null;
  void_reason: string | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
  advance_paid: Money;
  rent_paid: Money;
  deposit_used: Money;
  refunded: Money;
  deposit_taken: Money;
  deposit_returned: Money;
  last_payment_date: string | null;
  total_paid: Money;
  pending: Money;
  deposit_balance: Money;
  is_settled: boolean;
  due_amount: Money;
  is_payment_overdue: boolean;
  is_payment_due_soon: boolean;
  is_return_overdue: boolean;
  is_overpaid: boolean;
  days_payment_overdue: number;
  days_return_overdue: number;
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

/** view payment_list */
export interface PaymentListItem {
  id: string;
  rental_id: string;
  payment_date: string;
  amount: Money;
  type: PaymentType;
  method_id: string | null;
  method_name: string | null;
  reference: string | null;
  notes: string | null;
  is_voided: boolean;
  void_reason: string | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  is_edited: boolean;
  created_by_name: string | null;
  rental_number: string;
  rental_status: RentalStatus;
  car_id: string;
  car_number: string;
  car_model: string;
  customer_id: string;
  driver_name: string;
}

/** view income_ledger */
export interface IncomeRow {
  payment_id: string;
  payment_date: string;
  type: PaymentType;
  amount: Money;
  method_name: string | null;
  method_id: string | null;
  rental_id: string;
  rental_number: string;
  car_id: string;
  car_number: string;
  car_model: string;
  customer_id: string;
  driver_name: string;
}

/** view dashboard_summary */
export interface DashboardSummary {
  available_count: number;
  on_rent_count: number;
  maintenance_count: number;
  active_car_count: number;
  total_outstanding: Money;
  total_overdue: Money;
  deposits_held: Money;
  income_this_week: Money;
  income_this_month: Money;
}

export type RentalAlertType = 'payment_overdue' | 'return_overdue' | 'overpaid' | 'payment_pending' | 'payment_due_soon';

/** view rental_alerts */
export interface RentalAlert {
  rental_id: string;
  rental_number: string;
  rental_status: RentalStatus;
  car_id: string;
  car_number: string;
  car_model: string;
  customer_id: string;
  driver_name: string;
  driver_mobile: string;
  pending: Money;
  deposit_balance: Money;
  alert_type: RentalAlertType;
  severity: 'red' | 'amber';
  amount: Money | null;
  days: number | null;
  ref_date: string | null;
  sort_rank: number;
}

/** view car_alerts */
export interface CarAlert {
  car_id: string;
  car_number: string;
  make: string | null;
  model: string;
  status: CarStatus;
  alert_type: 'insurance_expired' | 'insurance_expiring';
  severity: 'red' | 'amber';
  insurance_expiry: string;
  days_left: number;
}

export interface AuditLogEntry {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reason: string | null;
  changed_by: string | null;
  changed_at: string;
}
