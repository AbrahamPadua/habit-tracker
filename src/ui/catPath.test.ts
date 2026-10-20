import { describe, expect, it } from 'vitest';
import { catPath } from './catPath';

const walker = { w: 60, h: 42 };

describe('catPath', () => {
  it('walks in off-screen on the floor, leaps above the card and ends on the card cat spot', () => {
    // A 375x763 phone overlay; the card cat's 40px box sits near the top-left of the first card.
    const p = catPath(755, 375, { x: 32, y: 78, w: 40, h: 40 }, walker);
    expect(p.startX).toBe(-60);
    expect(p.floor + walker.h).toBe(755);
    expect(p.takeoffX).toBeGreaterThan(p.startX);
    // Lands to the right of the spot, fully on screen, then walks back to it.
    expect(p.landX).toBeGreaterThan(p.spotX);
    expect(p.landX + walker.w).toBeLessThanOrEqual(375);
    expect(p.spotX + walker.w / 2).toBe(32 + 20);
    expect(p.cardY + walker.h).toBe(78 + 40);
    // The top of the leap clears the card edge.
    expect(p.peak).toBeLessThan(p.cardY);
  });

  it('keeps the landing on screen on a narrow phone', () => {
    const p = catPath(600, 320, { x: 240, y: 90, w: 40, h: 40 }, walker);
    expect(p.landX + walker.w).toBeLessThanOrEqual(320);
  });
});
