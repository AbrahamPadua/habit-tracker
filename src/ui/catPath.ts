/** Key points of the cat's daily entrance, in the overlay's coordinates (top-left of the walker). */
export interface CatPath {
  takeoffX: number;
  landX: number;
  spotX: number;
  floor: number;
  peak: number;
  cardY: number;
}

/**
 * Walk in from off-screen left along the floor, leap from a third of the way across onto the card,
 * landing to the right of the cat's spot, then walk back to it. `to` is the card cat's box.
 */
export function catPath(
  floorY: number,
  width: number,
  to: { x: number; y: number; w: number; h: number },
  walker: { w: number; h: number },
): CatPath {
  const spotX = to.x + to.w / 2 - walker.w / 2;
  const cardY = to.y + to.h - walker.h;
  return {
    takeoffX: width * 0.3,
    landX: Math.min(width - walker.w - 16, spotX + width * 0.35),
    spotX,
    floor: floorY - walker.h,
    peak: cardY - 40,
    cardY,
  };
}
