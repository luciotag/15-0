import type { Attrs, Surface, Tour } from '../game/types'
import type { Opponent } from '../game/draw'
import { overall, sigmoid, lowestAttr, FLOOR, DIFFICULTY } from './ratings'

/** RNG sembrado (mulberry32) para que un mismo `seed` reproduzca exactamente el mismo run. */
export function rng(seed: number) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type ResultKind =
  | 'champion_flawless'
  | 'champion'
  | 'finalist'
  | 'lost_r1' | 'lost_r2' | 'lost_r3' | 'lost_r4' | 'lost_r5' | 'lost_r6'

export const ROUND_NAMES = ['1ª ronda', '2ª ronda', '3ª ronda', '4ª ronda', 'Cuartos', 'Semifinal', 'Final']

export interface MatchResult {
  round: number
  roundName: string
  opponentName: string
  opponentCountry: string
  opponentDecade: string
  opponentRating: number
  won: boolean
  setsWon: number
  setsLost: number
  scoreline: string
}

export interface SimResult {
  result: ResultKind
  setsWon: number
  setsLost: number
  matches: MatchResult[]
  overall: number
  perfectEligible: boolean
  weakest: { key: string; value: number }
  seed: number
}

function setScore(rnd: () => number, playerWon: boolean): string {
  const t = rnd()
  let hi: number
  let lo: number
  if (t < 0.12) {
    hi = 7
    lo = 6
  } else if (t < 0.24) {
    hi = 7
    lo = 5
  } else {
    hi = 6
    lo = Math.floor(rnd() * 5) // 6-0 .. 6-4
  }
  return playerWon ? `${hi}-${lo}` : `${lo}-${hi}`
}

/**
 * Simula un Slam de 7 rondas contra un cuadro de rivales REALES (`draw`).
 * Determinístico dado `seed` (semilla para "compartir tu run").
 */
export function simulate(
  attrs: Attrs,
  surface: Surface,
  tour: Tour,
  seed: number,
  draw: Opponent[],
): SimResult {
  const rnd = rng(seed)
  const ov = overall(attrs, surface)
  const weakest = lowestAttr(attrs)
  const perfectEligible = weakest.value >= FLOOR

  // Penalización de "eslabón débil": si un atributo está bajo el piso, baja la
  // probabilidad de ganar sets -> el récord perfecto se vuelve casi imposible,
  // igual que el gateo del 82-0.
  const liability = perfectEligible ? 0 : (FLOOR - weakest.value) * DIFFICULTY.liabilityFactor

  const setsToWin = tour === 'atp' ? 3 : 2 // best-of-5 (H) / best-of-3 (M)

  const matches: MatchResult[] = []
  let totalW = 0
  let totalL = 0
  let eliminatedAt = 0

  for (let r = 1; r <= 7; r++) {
    const opp = draw[r - 1]
    const oppRating = opp.rating + (rnd() - 0.5) * DIFFICULTY.oppNoise
    const diff = ov - oppRating - liability
    const pSet = Math.min(0.97, Math.max(0.03, sigmoid(diff / DIFFICULTY.scale)))

    let sw = 0
    let sl = 0
    const games: string[] = []
    while (sw < setsToWin && sl < setsToWin) {
      const p = Math.min(0.98, Math.max(0.02, pSet + (rnd() - 0.5) * DIFFICULTY.setNoise))
      const playerWon = rnd() < p
      if (playerWon) sw++
      else sl++
      games.push(setScore(rnd, playerWon))
    }

    const won = sw > sl
    totalW += sw
    totalL += sl
    matches.push({
      round: r,
      roundName: ROUND_NAMES[r - 1],
      opponentName: opp.player.name,
      opponentCountry: opp.player.country,
      opponentDecade: opp.player.decade,
      opponentRating: Math.round(opp.rating),
      won,
      setsWon: sw,
      setsLost: sl,
      scoreline: games.join(' '),
    })

    if (!won) {
      eliminatedAt = r
      break
    }
  }

  let result: ResultKind
  if (eliminatedAt === 7) result = 'finalist'
  else if (eliminatedAt > 0) result = `lost_r${eliminatedAt}` as ResultKind
  else result = totalL === 0 && perfectEligible ? 'champion_flawless' : 'champion'

  return {
    result,
    setsWon: totalW,
    setsLost: totalL,
    matches,
    overall: ov,
    perfectEligible,
    weakest,
    seed,
  }
}

export interface Forecast {
  titlePct: number
  flawlessPct: number
  label: string
  tone: 'gold' | 'green' | 'amber' | 'red'
  perRound: { round: number; opp: number; setWinPct: number }[]
}

/**
 * Pronóstico analítico (sin azar) de las chances del build en el Slam elegido.
 * Le da al jugador una expectativa clara para que el resultado se sienta merecido.
 */
export function forecast(
  attrs: Attrs,
  surface: Surface,
  tour: Tour,
  oppRatings: number[],
): Forecast {
  const ov = overall(attrs, surface)
  const weakest = lowestAttr(attrs)
  const liability =
    weakest.value >= FLOOR ? 0 : (FLOOR - weakest.value) * DIFFICULTY.liabilityFactor
  const setsToWin = tour === 'atp' ? 3 : 2

  let title = 1
  let flawless = 1
  const perRound: Forecast['perRound'] = []
  for (let r = 1; r <= 7; r++) {
    const opp = oppRatings[r - 1]
    const p = Math.min(0.97, Math.max(0.03, sigmoid((ov - opp - liability) / DIFFICULTY.scale)))
    const q = 1 - p
    // prob. de ganar el partido (primero a setsToWin)
    const winMatch = setsToWin === 3 ? p ** 3 * (1 + 3 * q + 6 * q * q) : p ** 2 * (1 + 2 * q)
    // prob. de ganarlo sin ceder un set (barrida)
    const sweep = p ** setsToWin
    title *= winMatch
    flawless *= sweep
    perRound.push({ round: r, opp: Math.round(opp), setWinPct: Math.round(p * 100) })
  }

  const titlePct = title * 100
  let label: string
  let tone: Forecast['tone']
  if (titlePct >= 45) {
    label = 'Gran favorito'
    tone = 'gold'
  } else if (titlePct >= 22) {
    label = 'Favorito'
    tone = 'green'
  } else if (titlePct >= 8) {
    label = 'Contendiente'
    tone = 'amber'
  } else if (titlePct >= 2) {
    label = 'Outsider'
    tone = 'amber'
  } else {
    label = 'Tiro de fe'
    tone = 'red'
  }

  return { titlePct, flawlessPct: flawless * 100, label, tone, perRound }
}

export function resultHeadline(r: SimResult): { title: string; sub: string; tone: 'gold' | 'green' | 'red' } {
  switch (r.result) {
    case 'champion_flawless':
      return { title: '¡SLAM PERFECTO!', sub: `Campeón sin ceder un set · ${r.setsWon}-0`, tone: 'gold' }
    case 'champion':
      return { title: 'CAMPEÓN', sub: `Levantó el título cediendo ${r.setsLost} set(s)`, tone: 'green' }
    case 'finalist':
      return { title: 'FINALISTA', sub: 'Cayó en la final. Tan cerca…', tone: 'red' }
    default: {
      const n = Number(r.result.split('_r')[1])
      return { title: 'ELIMINADO', sub: `Adiós en ${ROUND_NAMES[n - 1].toLowerCase()}`, tone: 'red' }
    }
  }
}
