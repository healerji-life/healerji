/**
 * A single audio bus.
 *
 * Only one seed sound may sound at a time: starting Maṇipūra stops
 * Anāhata first. Every player registers a stop callback here and claims
 * the bus when it begins, which also covers the case of navigating
 * between chakra pages while something is still playing.
 */
type Stopper = () => void;

let current: Stopper | null = null;

export function claimAudio(stop: Stopper) {
  if (current && current !== stop) current();
  current = stop;
}

export function releaseAudio(stop: Stopper) {
  if (current === stop) current = null;
}
