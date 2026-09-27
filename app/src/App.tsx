import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { configError, isSupabaseConfigured } from '@/lib/supabase';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AppShell } from '@/components/layout/AppShell';
import { FullScreenLoader, ProtectedRoute } from '@/routes/ProtectedRoute';
import { OwnerRoute } from '@/routes/OwnerRoute';
import { ListSkeleton } from '@/components/ui/States';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';

// Pages loaded on demand to keep the first load small on 4G (NFR-02)
const AlertsPage = lazy(() => import('@/pages/AlertsPage'));
const MorePage = lazy(() => import('@/pages/MorePage'));
const CarsListPage = lazy(() => import('@/pages/cars/CarsListPage'));
const CarDetailPage = lazy(() => import('@/pages/cars/CarDetailPage'));
const CarFormPage = lazy(() => import('@/pages/cars/CarFormPage'));
const SellCarPage = lazy(() => import('@/pages/cars/SellCarPage'));
const RentalsListPage = lazy(() => import('@/pages/rentals/RentalsListPage'));
const RentalDetailPage = lazy(() => import('@/pages/rentals/RentalDetailPage'));
const CarOutPage = lazy(() => import('@/pages/rentals/CarOutPage'));
const CarReturnPage = lazy(() => import('@/pages/rentals/CarReturnPage'));
const EditRentalPage = lazy(() => import('@/pages/rentals/EditRentalPage'));
const CustomersListPage = lazy(() => import('@/pages/customers/CustomersListPage'));
const CustomerDetailPage = lazy(() => import('@/pages/customers/CustomerDetailPage'));
const PaymentsListPage = lazy(() => import('@/pages/payments/PaymentsListPage'));
const ReportsHomePage = lazy(() => import('@/pages/reports/ReportsHomePage'));
const IncomeReportPage = lazy(() => import('@/pages/reports/IncomeReportPage'));
const PendingByCustomerPage = lazy(() => import('@/pages/reports/PendingByCustomerPage'));
const OutstandingReportPage = lazy(() => import('@/pages/reports/OutstandingReportPage'));
const CarEarningsReportPage = lazy(() => import('@/pages/reports/CarEarningsReportPage'));
const VehicleStatusReportPage = lazy(() => import('@/pages/reports/VehicleStatusReportPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));
const UsersPage = lazy(() => import('@/pages/settings/UsersPage'));
const PaymentMethodsPage = lazy(() => import('@/pages/settings/PaymentMethodsPage'));
const AuditLogPage = lazy(() => import('@/pages/settings/AuditLogPage'));

function NotConfigured() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy-950 p-6 text-center text-white">
      <div className="max-w-md">
        <h1 className="text-xl font-bold text-gold-400">App settings are incorrect</h1>
        <p className="mt-3 text-slate-200">{configError}</p>
        <p className="mt-4 text-sm text-slate-400">
          Fix it in Netlify → Site configuration → Environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY), then
          Deploys → Trigger deploy → Clear cache and deploy site.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <NotConfigured />;
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<FullScreenLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppShell />}>
                    <Route
                      element={
                        <Suspense fallback={<ListSkeleton />}>
                          <RoutesOutlet />
                        </Suspense>
                      }
                    >
                      <Route index element={<DashboardPage />} />
                      <Route path="alerts" element={<AlertsPage />} />
                      <Route path="more" element={<MorePage />} />

                      <Route path="cars" element={<CarsListPage />} />
                      <Route path="cars/new" element={<CarFormPage />} />
                      <Route path="cars/:id" element={<CarDetailPage />} />
                      <Route path="cars/:id/edit" element={<CarFormPage />} />

                      <Route path="car-out" element={<CarOutPage />} />
                      <Route path="rentals" element={<RentalsListPage />} />
                      <Route path="rentals/:id" element={<RentalDetailPage />} />
                      <Route path="rentals/:id/return" element={<CarReturnPage />} />
                      <Route path="rentals/:id/edit" element={<EditRentalPage />} />

                      <Route path="customers" element={<CustomersListPage />} />
                      <Route path="customers/:id" element={<CustomerDetailPage />} />
                      <Route path="payments" element={<PaymentsListPage />} />

                      <Route path="reports" element={<ReportsHomePage />} />
                      <Route path="reports/income" element={<IncomeReportPage />} />
                      <Route path="reports/pending-by-customer" element={<PendingByCustomerPage />} />
                      <Route path="reports/outstanding" element={<OutstandingReportPage />} />
                      <Route path="reports/car-earnings" element={<CarEarningsReportPage />} />
                      <Route path="reports/vehicle-status" element={<VehicleStatusReportPage />} />

                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="settings/audit-log" element={<AuditLogPage />} />

                      <Route element={<OwnerRoute />}>
                        <Route path="cars/:id/sell" element={<SellCarPage />} />
                        <Route path="settings/users" element={<UsersPage />} />
                        <Route path="settings/payment-methods" element={<PaymentMethodsPage />} />
                      </Route>
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function RoutesOutlet() {
  return <Outlet />;
}
