export type FrameCallback = (dt: number, time: number) => void;

export class FrameScheduler {
  private callbacks = new Set<FrameCallback>();
  private rafId: number | null = null;
  private lastTime = 0;
  private readonly maxDt = 1 / 20;

  private readonly onVisibility = () => {
    if (activeDocument.hidden) this.stop();
    else if (this.callbacks.size > 0) this.start();
  };

  constructor() {
    activeDocument.addEventListener("visibilitychange", this.onVisibility);
  }

  subscribe(cb: FrameCallback): () => void {
    this.callbacks.add(cb);
    this.start();
    return () => this.unsubscribe(cb);
  }

  unsubscribe(cb: FrameCallback): void {
    this.callbacks.delete(cb);
    if (this.callbacks.size === 0) this.stop();
  }

  private start(): void {
    if (this.rafId !== null || activeDocument.hidden || this.callbacks.size === 0) return;
    this.lastTime = performance.now();
    this.rafId = window.requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (this.rafId !== null) window.cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private readonly tick = (now: number) => {
    const dt = Math.min((now - this.lastTime) / 1000, this.maxDt);
    this.lastTime = now;
    for (const cb of this.callbacks) {
      try {
        cb(dt, now);
      } catch (e) {
        console.error("[moon] frame callback error", e);
      }
    }
    this.rafId = window.requestAnimationFrame(this.tick);
  };

  dispose(): void {
    this.stop();
    this.callbacks.clear();
    activeDocument.removeEventListener("visibilitychange", this.onVisibility);
  }
}
