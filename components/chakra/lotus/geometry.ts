/**
 * Sacred geometry, generated mathematically.
 *
 * Everything in the yantra set is computed here — petal outlines,
 * polygon vertices, triangle apexes, bindu chains — so each symbol is
 * correct by construction and scales from a 32px chip to a 160px hero
 * without redrawing.
 *
 * Coordinate space: a 200-unit square with the origin at its centre
 * (-100 … 100), shared by every symbol.
 */

/** A point on a circle of radius r at angle a (degrees, 0 = up). */
export function polar(r: number, aDeg: number): [number, number] {
  const a = ((aDeg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

/**
 * A petal, pointing outward from the centre.
 *
 * `waist` controls how far down the belly of the petal sits and
 * `width` how far it swells, which is what separates the broad, blunt
 * petals of the root lotus from the fine ones of the crown and the
 * wide wings of the brow.
 */
export function petalPath(inner: number, outer: number, width: number, waist = 0.45): string {
  const belly = inner + (outer - inner) * waist;
  return [
    `M 0 ${-inner}`,
    `C ${width} ${-belly}, ${width * 0.7} ${-outer * 0.88}, 0 ${-outer}`,
    `C ${-width * 0.7} ${-outer * 0.88}, ${-width} ${-belly}, 0 ${-inner}`,
    "Z",
  ].join(" ");
}

/** Evenly spaced petal rotations, in degrees. */
export function petalAngles(count: number, offset = 0): number[] {
  return Array.from({ length: count }, (_, i) => (360 / count) * i + offset);
}

/** A regular polygon — the square of earth, the triangle of fire. */
export function polygonPath(sides: number, r: number, rotate = 0): string {
  return (
    Array.from({ length: sides }, (_, i) => {
      const [x, y] = polar(r, (360 / sides) * i + rotate);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ") + " Z"
  );
}

export const triangleDown = (r: number) => polygonPath(3, r, 180);
export const triangleUp = (r: number) => polygonPath(3, r, 0);

/** A ring of bindus — the dotted border of a mandala. */
export function bindus(count: number, r: number): { cx: number; cy: number }[] {
  return petalAngles(count).map((a) => {
    const [cx, cy] = polar(r, a);
    return { cx, cy };
  });
}

/** The waxing crescent of the sacral centre. */
export function crescentPath(r: number): string {
  return [
    `M ${-r} 0`,
    `A ${r} ${r} 0 0 0 ${r} 0`,
    `A ${r * 1.3} ${r * 1.3} 0 0 1 ${-r} 0`,
    "Z",
  ].join(" ");
}

/** A tongue of flame, for the fire centre's triangle. */
export function flamePath(h: number, w: number): string {
  return [
    `M 0 0`,
    `C ${w} ${-h * 0.3}, ${w * 0.55} ${-h * 0.7}, 0 ${-h}`,
    `C ${-w * 0.55} ${-h * 0.7}, ${-w} ${-h * 0.3}, 0 0`,
    "Z",
  ].join(" ");
}
