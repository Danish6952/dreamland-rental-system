import {
  BarChart3,
  Car,
  ClipboardList,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const sidebarNav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/cars', label: 'Cars', icon: Car },
  { to: '/rentals', label: 'Rentals', icon: ClipboardList },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const bottomNav: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/cars', label: 'Cars', icon: Car },
  { to: '/rentals', label: 'Rentals', icon: ClipboardList },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/more', label: 'More', icon: MoreHorizontal },
];
