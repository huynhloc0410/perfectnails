/**
 * ~3s synthetic bell chime for new-booking alerts (harmonic “phone bell” timbre).
 * Not a copy of any commercial ringtone — Web Audio only; failures are swallowed.
 */

type Strike = { at: number; hz: number; duration: number; peak: number };

/** Classic doorbell-ish fifth + bright partials; slight inharmonicity for metal. */
const STRIKES: Strike[] = [
  { at: 0, hz: 830, duration: 0.9, peak: 0.13 },
  { at: 0.9, hz: 622, duration: 0.95, peak: 0.11 },
  { at: 1.85, hz: 740, duration: 1.12, peak: 0.09 },
];

const PARTIALS: { mult: number; amp: number }[] = [
  { mult: 1, amp: 1 },
  { mult: 2.01, amp: 0.42 },
  { mult: 2.76, amp: 0.18 },
  { mult: 3.98, amp: 0.07 },
];

function bellStrike(
  ctx: AudioContext,
  start: number,
  fundamental: number,
  duration: number,
  peak: number,
): void {
  for (const { mult, amp } of PARTIALS) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const f0 = fundamental * mult;
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.985, start + Math.min(0.35, duration * 0.4));

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak * amp, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }
}

export function playNewBookingAlertSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AC =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();

    const play = () => {
      try {
        const t0 = ctx.currentTime;
        for (const s of STRIKES) {
          bellStrike(ctx, t0 + s.at, s.hz, s.duration, s.peak);
        }
      } catch {
        /* ignore */
      }
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(play).catch(() => {
        /* autoplay / policy — ignore */
      });
    } else {
      play();
    }
  } catch {
    /* ignore */
  }
}
