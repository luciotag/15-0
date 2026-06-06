import type { Player, Tour, Decade, Region, AttrKey } from './types'
import { ATTR_ORDER } from '../engine/ratings'

/** Atributo que se fija en cada ronda (ronda 1 -> saque, etc.). */
export const ROUND_ATTRS: AttrKey[] = ATTR_ORDER

export const TOTAL_ROUNDS = ROUND_ATTRS.length // 6

export interface Spin {
  decade: Decade
  region: Region
}

const MIN_POOL = 3

export function poolFor(players: Player[], tour: Tour, spin: Spin): Player[] {
  return players.filter(
    (p) => p.tour === tour && p.decade === spin.decade && p.region === spin.region,
  )
}

/** Combos (década·región) con al menos MIN_POOL jugadores para ese tour. */
export function availableCombos(players: Player[], tour: Tour): Spin[] {
  const counts = new Map<string, number>()
  for (const p of players) {
    if (p.tour !== tour) continue
    const k = `${p.decade}|${p.region}`
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const combos: Spin[] = []
  for (const [k, c] of counts) {
    if (c >= MIN_POOL) {
      const [decade, region] = k.split('|') as [Decade, Region]
      combos.push({ decade, region })
    }
  }
  return combos
}

/** Elige un combo, evitando (si puede) el inmediatamente anterior para dar variedad. */
export function spin(
  players: Player[],
  tour: Tour,
  rnd: () => number,
  previous?: Spin,
): Spin {
  const combos = availableCombos(players, tour)
  const filtered = previous
    ? combos.filter((c) => !(c.decade === previous.decade && c.region === previous.region))
    : combos
  const pool = filtered.length ? filtered : combos
  return pool[Math.floor(rnd() * pool.length)]
}

/** Pool de la ronda, sacando jugadores ya usados en slots anteriores. */
export function eligible(
  players: Player[],
  tour: Tour,
  spin: Spin,
  usedIds: Set<string>,
): Player[] {
  const all = poolFor(players, tour, spin)
  const free = all.filter((p) => !usedIds.has(p.id))
  return (free.length ? free : all).sort((a, b) => a.peakRank - b.peakRank)
}
