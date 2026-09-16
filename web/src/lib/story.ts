import type { MilestoneEvent, RecentChanges, TrendPoint } from './types.ts';

const mainParties = ['S', 'V', 'MP', 'C', 'M', 'KD', 'SD', 'L'];
const number = new Intl.NumberFormat('sv-SE');

export function eventTitle(event: MilestoneEvent): string {
  if (event.type === 'start') return 'Här börjar inspelningen';
  if (event.type === 'district') return `Minst ${number.format(event.threshold)} distrikt räknade`;
  if (event.type === 'lead') return `${event.leader} tar ledningen i inspelningen`;
  return `${event.key} ${event.above ? 'når minst' : 'går under'} 4 % i räkningen`;
}

export function recentChanges(before: TrendPoint | null | undefined, after: TrendPoint | null | undefined): RecentChanges | null {
  if (!before || !after || before.shares == null || after.shares == null) return null;
  return {
    districts: after.districts - before.districts,
    votes: Number.isFinite(before.countedVotes) && Number.isFinite(after.countedVotes) ? after.countedVotes! - before.countedVotes! : null,
    gap: Number.isFinite(before.blockGap) && Number.isFinite(after.blockGap) ? after.blockGap! - before.blockGap! : null,
    parties: Object.keys(after.shares)
      .filter(key => Number.isFinite(before.shares![key]) && Number.isFinite(after.shares![key]))
      .map(key => ({ key, delta: after.shares![key] - before.shares![key] }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
  };
}

export function milestones(points: TrendPoint[], { regional = false }: { regional?: boolean } = {}): MilestoneEvent[] {
  const events: MilestoneEvent[] = [];
  let previous: TrendPoint | undefined, leader = 0, highWater = 0;
  for (const point of points) {
    if (!previous) {
      events.push({ id: `${point.id}-start`, snapshotId: point.id, point, type: 'start' });
      highWater = point.districts;
    } else {
      const thresholds = [...new Set([100, 500, 1000, 2000, 3000, 4000, 5000, 6000, point.total].filter(Number.isFinite))];
      for (const threshold of thresholds) if (threshold > highWater && point.districts >= threshold) events.push({ id: `${point.id}-district-${threshold}`, snapshotId: point.id, point, type: 'district', threshold });
      highWater = Math.max(highWater, point.districts);
      if (!regional && previous.exactShares && point.exactShares) {
        for (const key of mainParties) {
          const before = previous.exactShares[key], after = point.exactShares[key];
          if (Number.isFinite(before) && Number.isFinite(after) && (before >= 4) !== (after >= 4)) events.push({ id: `${point.id}-threshold-${key}`, snapshotId: point.id, point, type: 'threshold', key, above: after >= 4 });
        }
      }
    }
    const sign = Number.isFinite(point.blockGap) ? Math.sign(point.blockGap!) : null;
    if (sign == null) leader = 0;
    else if (sign !== 0) {
      if (leader && leader !== sign) events.push({ id: `${point.id}-lead`, snapshotId: point.id, point, type: 'lead', leader: sign > 0 ? 'Vänster' : 'Höger' });
      leader = sign;
    }
    previous = point;
  }
  return events;
}
