import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.formData();
  const name = data.get("name") as string;
  const phone = data.get("phone") as string;
  const service = data.get("service") as string;
  const employee = data.get("employee") as string;
  const date = data.get("date") as string;
  const timeSlot = data.get("timeSlot") as string;
  const duration = data.get("duration") as string;

  // Combine date and time slot into a single datetime (parse date in local timezone)
  const [hours, minutes] = timeSlot.split(':');
  const [year, month, day] = date.split('-').map(Number);
  const bookingDate = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0);

  // In a real app, you'd save to a database
  // For now, we'll return the booking data and the client will save it
  const booking = {
    id: Date.now().toString(),
    name,
    phone,
    service,
    employee,
    date: bookingDate.toISOString(),
    timeSlot,
    duration: parseInt(duration) || 45,
  };

  console.log("Booking:", booking);

  return NextResponse.json({ success: true, booking });
}
