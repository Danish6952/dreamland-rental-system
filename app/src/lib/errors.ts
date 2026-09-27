/** Turn a Supabase / PostgREST / network error into a sentence for the user. */
export function errorMessage(err: unknown): string {
  if (!err) return 'Something went wrong';
  const e = err as { message?: string; code?: string; details?: string };
  const msg = e.message ?? String(err);

  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return 'No internet connection — changes were not saved';
  }
  if (/cars_car_number_uq/.test(msg)) return 'A car with this number already exists';
  if (/customers_mobile_active_uq/.test(msg)) return 'Another customer already uses this mobile number';
  if (/rentals_one_active_per_car_uq/.test(msg)) return 'This car is already out on another rental';
  if (/permission denied|42501/i.test(msg) || e.code === '42501') {
    return /owner/i.test(msg) ? msg : "You don't have permission to do this";
  }
  if (/JWT expired|invalid JWT/i.test(msg)) return 'Your session expired. Please sign in again';
  if (/Invalid login credentials/i.test(msg)) return 'Wrong email or password';
  if (/violates check constraint "(\w+)"/.test(msg)) return 'Some values are not valid. Please check the form';
  return msg;
}

export class AppError extends Error {}

/** Throw if a Supabase response has an error; otherwise return its data. */
export function unwrap<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw new AppError(errorMessage(res.error));
  return res.data;
}
