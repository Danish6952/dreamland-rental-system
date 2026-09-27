import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Check, ChevronLeft, ChevronRight, UserPlus, UserCheck, AlertTriangle } from 'lucide-react';
import { useCars } from '@/hooks/useCars';
import { useCustomerSearch } from '@/hooks/useCustomers';
import { useAction } from '@/hooks/useAction';
import { rentalService } from '@/services/rentalService';
import { carOutSchema, carOutSteps, type CarOutFormInput, type CarOutFormOutput } from '@/validation/carOutSchema';
import type { Customer } from '@/types/models';
import { PageHeader } from '@/components/ui/PageHeader';
import { Section, InfoRow } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyField, TextAreaField, TextField } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchBox } from '@/components/ui/SearchBox';
import { EmptyState, ListSkeleton } from '@/components/ui/States';
import { MethodPicker } from '@/components/payments/MethodPicker';
import { MoneySummary } from '@/components/rentals/MoneySummary';
import { FUEL_LEVELS, RENT_PERIODS, fuelLabel, rentPeriodLabel, rentPeriodUnit } from '@/lib/labels';
import { addDays, addMonths, daysBetween, formatDate, formatMoney, formatPhone, fromPKTLocalInput, normalizeMobile, todayPKT, toPKTLocalInput } from '@/lib/format';
import { defaultDueDate, periodCount, suggestedRent } from '@/lib/rentalCalc';

/** Flow 2 — Car Out wizard */
export default function CarOutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselect = params.get('car');
  const cars = useCars('available');
  const [step, setStep] = useState(preselect ? 1 : 0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerMode, setCustomerMode] = useState<'search' | 'form'>('search');
  const customers = useCustomerSearch(customerSearch);
  const [dueTouched, setDueTouched] = useState(false);
  const [rentTouched, setRentTouched] = useState(false);

  const form = useForm<CarOutFormInput, unknown, CarOutFormOutput>({
    resolver: zodResolver(carOutSchema),
    mode: 'onTouched',
    defaultValues: {
      car_id: preselect ?? '',
      customer_id: null,
      rental_type: 'monthly',
      out_at_local: toPKTLocalInput(),
      expected_return_date: addMonths(todayPKT(), 1),
      advance_amount: '' as unknown as number,
      deposit_amount: '' as unknown as number,
      fuel_out: '',
    },
  });
  const { register, control, setValue, trigger, getValues, formState, handleSubmit } = form;
  const err = formState.errors;
  const w = useWatch({ control });

  const car = cars.data?.find((c) => c.id === w.car_id);
  const outDate = (w.out_at_local ?? '').slice(0, 10) || todayPKT();
  const rate = Number(w.agreed_rate) || 0;
  const type = w.rental_type ?? 'monthly';
  const suggestion = w.expected_return_date ? suggestedRent(rate, type, outDate, w.expected_return_date) : 0;
  const periods = w.expected_return_date ? periodCount(type, outDate, w.expected_return_date) : 0;

  // When a car is chosen, default the terms from its standard rent (rule B-1/B-2)
  useEffect(() => {
    if (!car) return;
    setValue('rental_type', car.standard_rent_period);
    setValue('agreed_rate', Number(car.standard_rent));
    const days = { daily: 1, weekly: 7, monthly: 0, yearly: 0 }[car.standard_rent_period];
    const back = car.standard_rent_period === 'monthly' ? addMonths(todayPKT(), 1) : car.standard_rent_period === 'yearly' ? addMonths(todayPKT(), 12) : addDays(todayPKT(), days);
    setValue('expected_return_date', back);
    setRentTouched(false);
    setDueTouched(false);
  }, [car, setValue]);

  // Keep agreed total = suggestion until the user edits it
  useEffect(() => {
    if (!rentTouched && w.expected_return_date) setValue('rent_amount', suggestion);
  }, [suggestion, rentTouched, setValue, w.expected_return_date]);

  // Default next payment due (rule P-9) until edited
  useEffect(() => {
    if (!dueTouched && w.expected_return_date) setValue('payment_due_date', defaultDueDate(type, outDate, w.expected_return_date));
    if (!dueTouched && (type === 'monthly' || type === 'yearly')) {
      setValue('payment_due_amount', (type === 'yearly' ? Math.round(rate / 12) || '' : '') as unknown as number);
    }
  }, [type, outDate, w.expected_return_date, dueTouched, rate, setValue]);

  const pickCustomer = (c: Customer) => {
    setValue('customer_id', c.id);
    setValue('driver_name', c.full_name, { shouldValidate: true });
    setValue('driver_mobile', c.mobile, { shouldValidate: true });
    setValue('driver_license', c.license_number, { shouldValidate: true });
    setCustomerMode('form');
  };
  const newCustomer = () => {
    setValue('customer_id', null);
    const digits = normalizeMobile(customerSearch);
    setValue('driver_name', digits ? '' : customerSearch);
    setValue('driver_mobile', digits ?? '');
    setValue('driver_license', '');
    setCustomerMode('form');
  };

  const next = async () => {
    const ok = await trigger(carOutSteps[step].fields as (keyof CarOutFormInput)[]);
    if (ok) {
      setStep((s) => Math.min(s + 1, carOutSteps.length - 1));
      window.scrollTo({ top: 0 });
    }
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = useAction(
    (v: CarOutFormOutput) =>
      rentalService.carOut({
        ...v,
        out_at: fromPKTLocalInput(v.out_at_local),
        advance_method_id: v.advance_amount > 0 ? v.advance_method_id : null,
        deposit_method_id: v.deposit_amount > 0 ? v.deposit_method_id : null,
      }),
    {
      success: () => t('{{car}} is out with {{driver}}', { car: car?.car_number, driver: getValues('driver_name') }),
      onSuccess: (id) => navigate(`/rentals/${id}`, { replace: true }),
    },
  );

  const guarantorSame = useMemo(() => {
    const a = normalizeMobile(w.driver_mobile);
    return !!a && a === normalizeMobile(w.guarantor_mobile);
  }, [w.driver_mobile, w.guarantor_mobile]);

  const isLast = step === carOutSteps.length - 1;
  const advance = Number(w.advance_amount) || 0;
  const deposit = Number(w.deposit_amount) || 0;
  const rent = Number(w.rent_amount) || 0;

  return (
    <div className="space-y-4">
      <PageHeader back title="Car Out" subtitle={car ? `${car.car_number} · ${car.model}` : undefined} />

      {/* Progress */}
      <ol className="flex items-center gap-1.5" aria-label={t('Progress')}>
        {carOutSteps.map((s, i) => (
          <li key={s.title} className="flex-1">
            <div className={clsx('h-1.5 rounded-full', i <= step ? 'bg-gold-500' : 'bg-slate-200')} />
            <div className={clsx('mt-1 hidden text-[11px] font-medium sm:block', i === step ? 'text-navy-900' : 'text-slate-400')}>{t(s.title)}</div>
          </li>
        ))}
      </ol>
      <h2 className="text-lg font-semibold text-slate-900 sm:hidden">
        {step + 1}. {t(carOutSteps[step].title)}
      </h2>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {/* STEP 1 — Car */}
        {step === 0 &&
          (cars.isLoading ? (
            <ListSkeleton />
          ) : cars.data?.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {cars.data.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    setValue('car_id', c.id, { shouldValidate: true });
                    setStep(1);
                  }}
                  className={clsx(
                    'card flex items-center gap-3 p-4 text-start transition',
                    w.car_id === c.id ? 'ring-2 ring-gold-500' : 'hover:ring-slate-300',
                  )}
                >
                  <div className="flex-1">
                    <div className="font-bold tracking-wide">{c.car_number}</div>
                    <div className="text-sm text-slate-600">{[c.make, c.model, c.color].filter(Boolean).join(' · ')}</div>
                    <div className="text-xs text-slate-500">
                      {formatMoney(c.standard_rent)} / {t(rentPeriodUnit[c.standard_rent_period])}
                    </div>
                  </div>
                  {w.car_id === c.id && <Check className="size-5 text-gold-600" />}
                </button>
              ))}
              {err.car_id && <p className="text-sm text-red-600">{t(err.car_id.message ?? '')}</p>}
            </div>
          ) : (
            <EmptyState title="No cars available" message="All cars are on rent or at maintenance." />
          ))}

        {/* STEP 2 — Driver */}
        {step === 1 && (
          <Section title="Driver">
            {customerMode === 'search' ? (
              <div className="space-y-3">
                <SearchBox value={customerSearch} onChange={setCustomerSearch} placeholder="Search name or mobile" autoFocus />
                <ul className="divide-y divide-slate-100">
                  {customers.data?.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => pickCustomer(c)} className="flex w-full items-center gap-3 py-3 text-start">
                        <UserCheck className="size-5 text-slate-400" />
                        <div className="flex-1">
                          <div className="font-medium">{c.full_name}</div>
                          <div className="text-xs text-slate-500">
                            {formatPhone(c.mobile)} · {c.license_number}
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-slate-300 rtl:rotate-180" />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" block icon={<UserPlus className="size-4" />} onClick={newCustomer}>
                  {t('New customer')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {w.customer_id && (
                  <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{t('Existing customer — details can be corrected here.')}</p>
                )}
                <TextField label="Full name" autoComplete="off" {...register('driver_name')} error={err.driver_name?.message} />
                <TextField label="Mobile" type="tel" inputMode="tel" placeholder="0300-1234567" {...register('driver_mobile')} error={err.driver_mobile?.message} />
                <TextField label="License number" autoCapitalize="characters" {...register('driver_license')} error={err.driver_license?.message} />
                <button type="button" className="text-sm font-medium text-navy-700 hover:underline" onClick={() => setCustomerMode('search')}>
                  ← {t('Search another customer')}
                </button>
              </div>
            )}
          </Section>
        )}

        {/* STEP 3 — Guarantor */}
        {step === 2 && (
          <Section title="Guarantor">
            <div className="space-y-4">
              <TextField label="Guarantor name" {...register('guarantor_name')} error={err.guarantor_name?.message} />
              <TextField
                label="Guarantor mobile"
                type="tel"
                inputMode="tel"
                placeholder="0300-1234567"
                {...register('guarantor_mobile')}
                error={err.guarantor_mobile?.message}
              />
              {guarantorSame && (
                <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <AlertTriangle className="size-4" /> {t('Guarantor mobile is the same as the driver’s')}
                </p>
              )}
            </div>
          </Section>
        )}

        {/* STEP 4 — Terms */}
        {step === 3 && (
          <Section title="Rent terms">
            <div className="space-y-4">
              <Controller
                control={control}
                name="rental_type"
                render={({ field }) => (
                  <SegmentedControl
                    label="Rental type"
                    value={field.value}
                    onChange={(v) => v && field.onChange(v)}
                    options={RENT_PERIODS.map((p) => ({ value: p, label: rentPeriodLabel[p] }))}
                  />
                )}
              />
              <MoneyField
                label={`${t('Agreed rate')} / ${t(rentPeriodUnit[type])}`}
                {...register('agreed_rate')}
                error={err.agreed_rate?.message}
                hint={
                  car && (Number(car.standard_rent) !== rate || car.standard_rent_period !== type)
                    ? `${t('Standard')}: ${formatMoney(car.standard_rent)} / ${t(rentPeriodUnit[car.standard_rent_period])}`
                    : undefined
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Out date & time" type="datetime-local" {...register('out_at_local')} error={err.out_at_local?.message} />
                <TextField
                  label="Expected return date"
                  type="date"
                  min={outDate}
                  {...register('expected_return_date')}
                  error={err.expected_return_date?.message}
                  hint={w.expected_return_date ? t('{{n}} days', { n: Math.max(1, daysBetween(outDate, w.expected_return_date)) }) : undefined}
                />
              </div>
              <div>
                <MoneyField
                  label="Agreed total rent"
                  {...register('rent_amount', { onChange: () => setRentTouched(true) })}
                  error={err.rent_amount?.message}
                  hint={`${t('Suggested')}: ${formatMoney(rate)} × ${periods} ${t(rentPeriodUnit[type])} = ${formatMoney(suggestion)}`}
                />
                {rentTouched && rent !== suggestion && (
                  <button
                    type="button"
                    className="mt-1 text-sm font-medium text-navy-700 hover:underline"
                    onClick={() => {
                      setRentTouched(false);
                      setValue('rent_amount', suggestion);
                    }}
                  >
                    {t('Use suggestion')}
                  </button>
                )}
              </div>
              <div className="grid gap-4 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                <TextField
                  label="Next payment due"
                  type="date"
                  {...register('payment_due_date', { onChange: () => setDueTouched(true) })}
                  error={err.payment_due_date?.message}
                />
                <MoneyField
                  label="Due amount"
                  optional
                  hint={t('Empty = whole pending amount')}
                  {...register('payment_due_amount', { onChange: () => setDueTouched(true) })}
                  error={err.payment_due_amount?.message}
                />
              </div>
            </div>
          </Section>
        )}

        {/* STEP 5 — Extras & money */}
        {step === 4 && (
          <>
            <Section title="Car condition">
              <div className="space-y-4">
                <TextField label="Start KM" optional type="number" inputMode="numeric" {...register('start_km')} error={err.start_km?.message} />
                <Controller
                  control={control}
                  name="fuel_out"
                  render={({ field }) => (
                    <SegmentedControl
                      label="Fuel level"
                      optional
                      columns={5}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={FUEL_LEVELS.map((f) => ({ value: f, label: fuelLabel[f] }))}
                    />
                  )}
                />
                <TextAreaField label="Notes" optional {...register('notes')} />
              </div>
            </Section>
            <Section title="Money at handover">
              <div className="space-y-4">
                <MoneyField label="Advance received" optional {...register('advance_amount')} error={err.advance_amount?.message} />
                {advance > 0 && (
                  <Controller
                    control={control}
                    name="advance_method_id"
                    render={({ field }) => <MethodPicker label="Advance paid by" value={field.value} onChange={field.onChange} error={err.advance_method_id?.message} />}
                  />
                )}
                <MoneyField label="Security deposit taken" optional {...register('deposit_amount')} error={err.deposit_amount?.message} />
                {deposit > 0 && (
                  <Controller
                    control={control}
                    name="deposit_method_id"
                    render={({ field }) => <MethodPicker label="Deposit paid by" value={field.value} onChange={field.onChange} error={err.deposit_method_id?.message} />}
                  />
                )}
              </div>
            </Section>
          </>
        )}

        {/* STEP 6 — Review */}
        {step === 5 && (
          <>
            <MoneySummary bill={rent} paid={advance} pending={rent - advance} deposit={deposit} />
            <Section title="Review">
              <dl>
                <InfoRow label="Car">
                  {car?.car_number} · {car?.model}
                </InfoRow>
                <InfoRow label="Driver">
                  {w.driver_name} · {formatPhone(normalizeMobile(w.driver_mobile))}
                </InfoRow>
                <InfoRow label="License">{w.driver_license}</InfoRow>
                <InfoRow label="Guarantor">
                  {w.guarantor_name} · {formatPhone(normalizeMobile(w.guarantor_mobile))}
                </InfoRow>
                <InfoRow label="Terms">
                  {t(rentPeriodLabel[type])} · {formatMoney(rate)} / {t(rentPeriodUnit[type])}
                </InfoRow>
                <InfoRow label="Out">{w.out_at_local?.replace('T', ' ')}</InfoRow>
                <InfoRow label="Expected back">{formatDate(w.expected_return_date)}</InfoRow>
                <InfoRow label="Agreed total rent">{formatMoney(rent)}</InfoRow>
                <InfoRow label="Next payment due">
                  {formatDate(w.payment_due_date || null)}
                  {Number(w.payment_due_amount) > 0 && ` · ${formatMoney(w.payment_due_amount as number)}`}
                </InfoRow>
                {w.start_km ? <InfoRow label="Start KM">{String(w.start_km)}</InfoRow> : null}
                {w.fuel_out ? <InfoRow label="Fuel">{t(fuelLabel[w.fuel_out as keyof typeof fuelLabel])}</InfoRow> : null}
              </dl>
            </Section>
          </>
        )}

        {/* Navigation */}
        {step > 0 && (
          <div className="sticky bottom-20 z-10 flex gap-2 lg:bottom-4">
            <Button variant="secondary" size="lg" onClick={back} icon={<ChevronLeft className="size-4 rtl:rotate-180" />}>
              {t('Back')}
            </Button>
            {isLast ? (
              <Button size="lg" block loading={submit.isPending} onClick={handleSubmit((v) => submit.mutate(v))}>
                {t('Confirm Car Out')}
              </Button>
            ) : (
              <Button size="lg" block onClick={next} disabled={step === 1 && customerMode === 'search'}>
                {t('Next')}
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
