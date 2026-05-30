import { Component } from '@angular/core';

@Component({
  selector: 'app-hero-wave',
  standalone: true,
  template: `
    <div class="seatmap" aria-hidden="true">
      <div class="seatmap-grid">
        @for (s of seats; track s.i) {
          <span class="seat" [class.filled]="s.filled" [class.you]="s.you"></span>
        }
      </div>
    </div>
  `,
  styles: [`
    .seatmap {
      position: absolute; inset: 0; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      -webkit-mask-image: radial-gradient(120% 90% at 50% 38%, #000 30%, transparent 78%);
              mask-image: radial-gradient(120% 90% at 50% 38%, #000 30%, transparent 78%);
    }
    .seatmap-grid {
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: clamp(10px, 1.9vw, 26px);
      width: 140%;
      transform: perspective(900px) rotateX(34deg) translateY(-6%);
      transform-origin: center top;
    }
    .seat {
      aspect-ratio: 1;
      border-radius: 3px;
      border: 1px solid var(--border-color);
      background: transparent;
      transition: background var(--transition), border-color var(--transition);
    }
    .seat.filled {
      background: oklch(0.42 0.13 274 / 0.16);
      border-color: oklch(0.42 0.13 274 / 0.30);
    }
    :root:not(.light-theme) .seat.filled {
      background: oklch(0.70 0.12 274 / 0.18);
      border-color: oklch(0.70 0.12 274 / 0.34);
    }
    .seat.you {
      background: var(--accent-red);
      border-color: var(--accent-red);
      animation: seatPulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
    }
    @keyframes seatPulse {
      0%, 100% { box-shadow: 0 0 0 0 oklch(0.50 0.19 25 / 0.45); }
      50% { box-shadow: 0 0 0 7px oklch(0.50 0.19 25 / 0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .seat.you { animation: none; }
    }
  `]
})
export class HeroWaveComponent {
  // Deterministic seat layout: ~38% filled, one "you" seat highlighted.
  seats = Array.from({ length: 24 * 9 }, (_, i) => {
    const filled = (i * 37 + 11) % 13 < 5;
    return { i, filled, you: i === 24 * 4 + 13 };
  });
}
