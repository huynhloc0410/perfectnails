/**
 * Short synthetic ding for new-booking alerts. Web Audio only (no asset);
 * failures are swallowed so notification UI still works.
 */
export function playNewBookingAlertSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AC =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();

    const ding = () => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } catch {
        /* ignore */
      }
    };

    if (ctx.state === 'suspended') {
      void ctx.resume().then(ding).catch(() => {
        /* autoplay / policy — ignore */
      });
    } else {
      ding();
    }
  } catch {
    /* ignore */
  }
}
