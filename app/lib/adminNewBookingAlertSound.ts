/**
 * Synthetic chime for new-booking alerts (~1s). Failures are swallowed.
 */
const DURATION_S = 1;

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
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t0);
        osc.frequency.linearRampToValueAtTime(880, t0 + DURATION_S * 0.35);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.14, t0 + 0.04);
        gain.gain.linearRampToValueAtTime(0.1, t0 + DURATION_S * 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + DURATION_S);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + DURATION_S);
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
