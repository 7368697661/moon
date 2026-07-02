export interface PointerState {
  x: number;
  y: number;
  inside: boolean;
}

export class PointerTracker {
  readonly state: PointerState = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    inside: false,
  };

  readonly isCoarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;

  private readonly onMove = (e: PointerEvent) => {
    const s = this.state;
    s.x = e.clientX;
    s.y = e.clientY;
    s.inside = true;
  };
  private readonly onLeave = () => (this.state.inside = false);

  start(): void {
    document.addEventListener("pointermove", this.onMove, { passive: true });
    document.addEventListener("pointerleave", this.onLeave, { passive: true });
  }

  dispose(): void {
    document.removeEventListener("pointermove", this.onMove);
    document.removeEventListener("pointerleave", this.onLeave);
  }
}
