import type { FrameScheduler } from "./core/FrameScheduler";
import type { PointerTracker } from "./core/PointerTracker";
import { ONEKO_SPRITES, type OnekoColor } from "./sprite";

const SPRITES: Record<string, [number, number][]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  scratchWallN: [[0, 0], [0, -1]],
  scratchWallS: [[-7, -1], [-6, -2]],
  scratchWallE: [[-2, -2], [-2, -3]],
  scratchWallW: [[-4, 0], [-4, -1]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]],
};

const SPEED = 10;
const SCALE = 1.25;
const TICK_MS = 100;
const FRAME = 32;
const NAP_AFTER_TICKS = 60;

export class Oneko {
  private el: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;

  private nekoX = 0;
  private nekoY = 0;
  private frameCount = 0;
  private idleTime = 0;
  private idleAnim: string | null = null;
  private idleAnimFrame = 0;
  private accum = 0;

  constructor(
    private readonly scheduler: FrameScheduler,
    private readonly pointer: PointerTracker,
    private color: OnekoColor = "dark",
  ) {}

  enable(): void {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced || this.pointer.isCoarse) return;

    const el = document.createElement("div");
    el.className = "moon-oneko";
    el.setAttribute("aria-hidden", "true");
    el.style.backgroundImage = `url(${ONEKO_SPRITES[this.color]})`;
    el.style.backgroundSize = `${8 * FRAME}px ${4 * FRAME}px`;
    document.body.appendChild(el);
    this.el = el;

    this.nekoX = this.pointer.state.x;
    this.nekoY = this.pointer.state.y;
    this.render();

    this.unsubscribe = this.scheduler.subscribe((dt) => this.onFrame(dt));
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.el?.remove();
    this.el = null;
  }

  setColor(color: OnekoColor): void {
    this.color = color;
    if (this.el) this.el.style.backgroundImage = `url(${ONEKO_SPRITES[color]})`;
  }

  private onFrame(dt: number): void {
    this.accum += dt * 1000;
    if (this.accum > TICK_MS * 4) this.accum = TICK_MS * 4;
    while (this.accum >= TICK_MS) {
      this.accum -= TICK_MS;
      this.tick();
    }
  }

  private tick(): void {
    this.frameCount += 1;
    const { x: mouseX, y: mouseY } = this.pointer.state;
    const diffX = this.nekoX - mouseX;
    const diffY = this.nekoY - mouseY;
    const distance = Math.hypot(diffX, diffY);

    if (distance < SPEED || distance < 48) {
      this.idle();
      this.render();
      return;
    }

    this.idleAnim = null;
    this.idleAnimFrame = 0;

    if (this.idleTime > 1) {
      this.setSprite("alert", 0);
      this.idleTime = Math.min(this.idleTime, 7) - 1;
      this.render();
      return;
    }

    let dir = "";
    dir += diffY / distance > 0.5 ? "N" : "";
    dir += diffY / distance < -0.5 ? "S" : "";
    dir += diffX / distance > 0.5 ? "W" : "";
    dir += diffX / distance < -0.5 ? "E" : "";
    this.setSprite(dir, this.frameCount);

    this.nekoX -= (diffX / distance) * SPEED;
    this.nekoY -= (diffY / distance) * SPEED;
    this.nekoX = clamp(this.nekoX, 16, window.innerWidth - 16);
    this.nekoY = clamp(this.nekoY, 16, window.innerHeight - 16);
    this.render();
  }

  private idle(): void {
    this.idleTime += 1;

    if (
      this.idleTime > 10 &&
      Math.floor(Math.random() * 200) === 0 &&
      this.idleAnim === null
    ) {
      const choices = ["sleeping", "scratchSelf"];
      if (this.nekoX < 32) choices.push("scratchWallW");
      if (this.nekoY < 32) choices.push("scratchWallN");
      if (this.nekoX > window.innerWidth - 32) choices.push("scratchWallE");
      if (this.nekoY > window.innerHeight - 32) choices.push("scratchWallS");
      this.idleAnim = choices[Math.floor(Math.random() * choices.length)];
    }

    if (this.idleAnim === null && this.idleTime > NAP_AFTER_TICKS) {
      this.idleAnim = "sleeping";
    }

    switch (this.idleAnim) {
      case "sleeping":
        if (this.idleAnimFrame < 8) this.setSprite("tired", 0);
        else this.setSprite("sleeping", Math.floor(this.idleAnimFrame / 4));
        if (this.idleAnimFrame > 192) this.resetIdle();
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        this.setSprite(this.idleAnim, this.idleAnimFrame);
        if (this.idleAnimFrame > 9) this.resetIdle();
        break;
      default:
        this.setSprite("idle", 0);
        return;
    }
    this.idleAnimFrame += 1;
  }

  private resetIdle(): void {
    this.idleAnim = null;
    this.idleAnimFrame = 0;
  }

  private setSprite(name: string, frame: number): void {
    const set = SPRITES[name] ?? SPRITES.idle;
    const [col, row] = set[frame % set.length];
    if (this.el) {
      this.el.style.backgroundPosition = `${col * FRAME}px ${row * FRAME}px`;
    }
  }

  private render(): void {
    if (!this.el) return;
    const x = this.nekoX - 16;
    const y = this.nekoY - 16;
    this.el.style.transform = `translate(${x}px, ${y}px) scale(${SCALE})`;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}
