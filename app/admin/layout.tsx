import type { Metadata } from 'next';
import {
  AdminBookingNotificationPermission,
  AdminBookingNotifier,
} from './components/AdminBookingNotifier';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminBookingNotifier />
      <AdminBookingNotificationPermission />
      {children}
    </>
  );
}
