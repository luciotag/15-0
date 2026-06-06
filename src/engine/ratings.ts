import type { Attrs, AttrKey, Surface, Slam } from '../game/types'

export const ATTR_ORDER: AttrKey[] = [
  'serve',
  'return',
  'forehand',
  'backhand',
  'movement',
  'mental',
]

export const ATTR_LABELS: Record<AttrKey, string> = {
  serve: 'Saque',
  return: 'Resto',
  forehand: 'Derecha',
  backhand: 'Revés',
  movement: 'Movimiento',
  mental: 'Mentalidad',
}

export const SLAMS: Slam[] = [
  { id: 'ao', name: 'Australian Open', short: 'AO', surface: 'hard', emphasis: 'Equilibrado' },
  { id: 'rg', name: 'Roland Garros', short: 'RG', surface: 'clay', emphasis: 'Movimiento + Resto' },
  { id: 'wimbledon', name: 'Wimbledon', short: 'W', surface: 'grass', emphasis: 'Saque + Mentalidad' },
  { id: 'uso', name: 'US Open', short: 'US', surface: 'hard', emphasis: 'Saque + Derecha' },
]

export const SURFACE_LABEL: Record<Surface, string> = {
  hard: 'Dura',
  clay: 'Polvo de ladrillo',
  grass: 'Césped',
}

/** Vector de pesos por superficie (suman 1). Punto de partida del spec, listo para re-tunear. */
export const WEIGHTS: Record<Surface, Record<AttrKey, number>> = {
  hard: { serve: 0.22, return: 0.16, forehand: 0.18, backhand: 0.14, movement: 0.16, mental: 0.14 },
  clay: { serve: 0.12, return: 0.22, forehand: 0.18, backhand: 0.16, movement: 0.24, mental: 0.08 },
  grass: { serve: 0.30, return: 0.12, forehand: 0.16, backhand: 0.12, movement: 0.12, mental: 0.18 },
}

/** Piso "estilo 82-0": ningún atributo individual puede estar por debajo de esto para hacer el perfecto. */
export const FLOOR = 60

/**
 * Calibración de dificultad del torneo (todo tuneado por Monte Carlo).
 * Objetivos aprox.: overall 76 ≈ 0% título · 88 ≈ 23% · 92 ≈ 51% (perfecto ~1.4%) · 96 ≈ 76% (perfecto ~6%).
 */
export const DIFFICULTY = {
  base: 68, // rating del rival de 1ª ronda
  step: 3.0, // cuánto sube por ronda
  finalBump: 4, // extra del "jefe" en la final
  scale: 8, // sensibilidad: más chico = el overall pesa más, menos azar
  oppNoise: 3, // variación aleatoria del rival
  setNoise: 0.04, // variación por set
  liabilityFactor: 0.7, // penalización por atributo bajo el piso
}

/** Rating esperado del rival en la ronda r (1..7), sin ruido. */
export function opponentRating(round: number): number {
  return DIFFICULTY.base + DIFFICULTY.step * (round - 1) + (round === 7 ? DIFFICULTY.finalBump : 0)
}

export function overall(attrs: Attrs, surface: Surface): number {
  const w = WEIGHTS[surface]
  let s = 0
  for (const k of ATTR_ORDER) s += attrs[k] * w[k]
  return s
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export function lowestAttr(attrs: Attrs): { key: AttrKey; value: number } {
  let key: AttrKey = 'serve'
  let value = Infinity
  for (const k of ATTR_ORDER) {
    if (attrs[k] < value) {
      value = attrs[k]
      key = k
    }
  }
  return { key, value }
}
