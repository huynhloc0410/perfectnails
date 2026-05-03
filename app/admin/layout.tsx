import {
  AdminBookingNotificationPermission,
  AdminBookingNotifier,
} from './components/AdminBookingNotifier';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminBookingNotifier />
      <AdminBookingNotificationPermission />
      {children}
    </>
  );
}
