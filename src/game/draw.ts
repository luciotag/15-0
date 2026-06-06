import type { Player, Tour, Surface } from './types'
import { overall, opponentRating } from '../engine/ratings'
import { rng } from '../engine/simulate'

export interface Opponent {
  player: Player
  rating: number
}

/**
 * Arma el "camino al título": 7 rivales REALES de ese tour, ordenados por
 * dificultad creciente, donde la FINAL es contra el rey de esa superficie
 * (RG -> Nadal/Alcaraz, Wimbledon -> Federer/Sampras, etc.).
 *
 * El rating de cada rival es su propio overall en esa cancha, pero se elige
 * el real más cercano al objetivo calibrado por ronda -> la dificultad se
 * mantiene afinada y, encima, le ponés cara y nombre al rival.
 */
export function buildDraw(players: Player[], tour: Tour, surface: Surface, seed: number): Opponent[] {
  const pool = players
    .filter((p) => p.tour === tour)
    .map((p) => ({ p, ov: overall(p.attrs, surface) }))
    .sort((a, b) => a.ov - b.ov)

  if (pool.length < 7) {
    // fallback defensivo: repetir si el pool fuese chico
    return Array.from({ length: 7 }, (_, i) => ({
      player: pool[Math.min(i, pool.length - 1)].p,
      rating: pool[Math.min(i, pool.length - 1)].ov,
    }))
  }

  const rnd = rng((seed ^ 0x9e3779b9) >>> 0)
  const used = new Set<string>()

  // Final = rey de la superficie (random entre el top-3 para variedad)
  const topK = pool.slice(-3)
  const boss = topK[Math.floor(rnd() * topK.length)]

  const opponents: Opponent[] = []
  for (let r = 1; r <= 6; r++) {
    const target = opponentRating(r)
    const cands = pool
      .filter((x) => !used.has(x.p.id) && x.p.id !== boss.p.id)
      .sort((a, b) => Math.abs(a.ov - target) - Math.abs(b.ov - target))
    const near = cands.slice(0, 3)
    const pick = near[Math.floor(rnd() * near.length)] ?? cands[0]
    used.add(pick.p.id)
    opponents.push({ player: pick.p, rating: pick.ov })
  }
  opponents.push({ player: boss.p, rating: boss.ov })
  return opponents
}
