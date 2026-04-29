"use client";

import { useState } from "react";

export default function PromotionPopup() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promotion-popup-title"
      aria-describedby="promotion-popup-description"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#d9ccb0] bg-lux-paper p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5e4a1c]">Limited-time offer</p>
        <h2 id="promotion-popup-title" className="mt-2 text-2xl font-semibold text-[#2a241c]">
          Grand Opening Celebration
        </h2>
        <p id="promotion-popup-description" className="mt-3 text-sm leading-6 text-[#3b342b]">
          We are pleased to welcome you with <strong>20% off all services</strong> through <strong>May 30, 2026</strong>.
          Thank you for choosing us, and we look forward to serving you.
        </p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full bg-[#5e4a1c] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#4d3c16] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a88a3d] focus-visible:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
