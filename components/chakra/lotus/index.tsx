"use client";

import { LotusBase } from "./lotus-base";
import { crescentPath, flamePath, polar, polygonPath, triangleDown, triangleUp } from "./geometry";

/**
 * The seven yantras.
 *
 * Each is drawn to its own traditional description rather than as a
 * variation on one flower: the petal shape, corona structure and inner
 * geometry all differ. Where a form varies between lineages, the
 * commonly-taught version is used and the difference is stated in the
 * chakra data rather than silently resolved here.
 *
 *   Mūlādhāra    4 broad petals · square of earth, downward triangle
 *   Svādhiṣṭhāna 6 petals · crescent of water
 *   Maṇipūra     10 petals · downward triangle with tongues of flame
 *   Anāhata      12 petals · ṣaṭkoṇa, two interlocking triangles
 *   Viśuddha     16 petals · downward triangle enclosing the circle of ether
 *   Ājñā         2 wide wing petals · triangle with the bindu
 *   Sahasrāra    layered coronas · the bindu within concentric rings
 */
type Props = { color: string; size?: number; active?: boolean; className?: string };

const line = (color: string, active: boolean, w = 1.6, o = 1) => ({
  fill: "none",
  stroke: color,
  strokeOpacity: (active ? 0.95 : 0.75) * o,
  strokeWidth: w,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
});

export function RootLotus({ color, size, active = false, className }: Props) {
  return (
    <LotusBase
      id="yantra-root"
      color={color}
      size={size}
      active={active}
      className={className}
      spin={320}
      phase={0}
      pericarp={30}
      binduCount={8}
      // Broad, blunt petals — the heaviest, most grounded of the set
      coronas={[{ count: 4, inner: 30, outer: 92, width: 30, waist: 0.5 }]}
    >
      <path d={polygonPath(4, 22, 45)} {...line(color, active)} />
      <path d={triangleDown(15)} {...line(color, active, 1.4)} />
      <circle r="3" fill={color} fillOpacity="0.85" />
    </LotusBase>
  );
}

export function SacralLotus({ color, size, active = false, className }: Props) {
  return (
    <LotusBase
      id="yantra-sacral"
      color={color}
      size={size}
      active={active}
      className={className}
      spin={280}
      phase={1.4}
      pericarp={28}
      binduCount={12}
      // Fuller, rounder petals — water, not earth
      coronas={[{ count: 6, inner: 28, outer: 90, width: 22, waist: 0.55 }]}
    >
      <circle r="19" {...line(color, active, 1.2, 0.55)} />
      <path d={crescentPath(15)} transform="translate(0 5)" fill={color} fillOpacity="0.22" stroke={color} strokeOpacity={active ? 0.9 : 0.7} strokeWidth="1.4" />
    </LotusBase>
  );
}

export function SolarPlexusLotus({ color, size, active = false, className }: Props) {
  return (
    <LotusBase
      id="yantra-solar"
      color={color}
      size={size}
      active={active}
      className={className}
      spin={230}
      phase={2.8}
      pericarp={30}
      binduCount={10}
      coronas={[{ count: 10, inner: 30, outer: 90, width: 14, waist: 0.42 }]}
    >
      <path d={triangleDown(22)} {...line(color, active)} />
      {/* Tongues of flame at each side of the triangle */}
      {[180, 300, 60].map((a) => {
        const [x, y] = polar(24, a);
        return (
          <path
            key={a}
            d={flamePath(11, 5)}
            transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a + 180})`}
            fill={color}
            fillOpacity="0.28"
            stroke={color}
            strokeOpacity={active ? 0.8 : 0.6}
            strokeWidth="1.1"
          />
        );
      })}
    </LotusBase>
  );
}

export function HeartLotus({ color, size, active = false, className }: Props) {
  return (
    <LotusBase
      id="yantra-heart"
      color={color}
      size={size}
      active={active}
      className={className}
      spin={300}
      phase={4.2}
      pericarp={30}
      binduCount={12}
      // Slender petals, two interleaved rings of six — as the ṣaṭkoṇa is doubled
      coronas={[
        { count: 6, inner: 30, outer: 92, width: 12, waist: 0.4 },
        { count: 6, inner: 30, outer: 82, width: 10, waist: 0.4, offset: 30, opacity: 0.75 },
      ]}
    >
      <path d={triangleUp(22)} {...line(color, active)} />
      <path d={triangleDown(22)} {...line(color, active)} />
      <circle r="2.6" fill={color} fillOpacity="0.85" />
    </LotusBase>
  );
}

export function ThroatLotus({ color, size, active = false, className }: Props) {
  return (
    <LotusBase
      id="yantra-throat"
      color={color}
      size={size}
      active={active}
      className={className}
      spin={250}
      phase={5.6}
      pericarp={32}
      binduCount={16}
      coronas={[{ count: 16, inner: 32, outer: 90, width: 9, waist: 0.4 }]}
    >
      <path d={triangleDown(24)} {...line(color, active)} />
      {/* The circle of ākāśa within */}
      <circle r="12" fill={color} fillOpacity="0.14" stroke={color} strokeOpacity={active ? 0.85 : 0.65} strokeWidth="1.3" />
      <circle r="2.4" fill={color} fillOpacity="0.8" />
    </LotusBase>
  );
}

export function ThirdEyeLotus({ color, size, active = false, className }: Props) {
  return (
    <LotusBase
      id="yantra-brow"
      color={color}
      size={size}
      active={active}
      className={className}
      spin={360}
      phase={7}
      pericarp={30}
      binduCount={2}
      // Two wide wings, left and right — the iḍā and piṅgalā meeting
      coronas={[{ count: 2, inner: 26, outer: 96, width: 44, waist: 0.52, offset: 90 }]}
    >
      <path d={triangleDown(22)} {...line(color, active)} />
      <circle r="5" fill={color} fillOpacity="0.9" />
      <circle r="11" {...line(color, active, 1, 0.5)} />
    </LotusBase>
  );
}

export function CrownLotus({ color, size, active = false, className }: Props) {
  return (
    <LotusBase
      id="yantra-crown"
      color={color}
      size={size}
      active={active}
      className={className}
      spin={440}
      phase={8.4}
      pericarp={24}
      binduCount={24}
      // The thousand, as four interleaved coronas rather than a literal count
      coronas={[
        { count: 40, inner: 60, outer: 98, width: 4, waist: 0.4, opacity: 0.9 },
        { count: 40, inner: 48, outer: 84, width: 4, waist: 0.4, offset: 4.5, opacity: 0.7 },
        { count: 32, inner: 38, outer: 70, width: 4, waist: 0.4, offset: 5.6, opacity: 0.55 },
        { count: 24, inner: 26, outer: 56, width: 4, waist: 0.4, offset: 7.5, opacity: 0.4 },
      ]}
    >
      <circle r="15" {...line(color, active, 1, 0.5)} />
      <circle r="8" {...line(color, active, 1, 0.35)} />
      <circle r="3.4" fill={color} fillOpacity="0.9" />
    </LotusBase>
  );
}

export const LOTUS_BY_SLUG: Record<string, (p: Props) => React.JSX.Element> = {
  muladhara: RootLotus,
  svadhisthana: SacralLotus,
  manipura: SolarPlexusLotus,
  anahata: HeartLotus,
  vishuddha: ThroatLotus,
  ajna: ThirdEyeLotus,
  sahasrara: CrownLotus,
};

export function ChakraLotusFor({ slug, ...props }: Props & { slug: string }) {
  const Lotus = LOTUS_BY_SLUG[slug] ?? HeartLotus;
  return <Lotus {...props} />;
}
