import type { SimResult } from '../engine/simulate'

export interface Records {
  attempts: number
  titles: number
  perfectos: number
  best: { rank: number; label: string; record: string; slam: string } | null
}

const KEY = 'quince_cero_records_v1'

const EMPTY: Records = { attempts: 0, titles: 0, perfectos: 0, best: null }

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    return { ...EMPTY }
  }
}

function save(r: Records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    /* sin persistencia (modo artifact) — no pasa nada */
  }
}

/** Ranking numérico de un resultado para comparar "mejor run". Más alto = mejor. */
export function rankOf(result: SimResult['result']): number {
  if (result === 'champion_flawless') return 100
  if (result === 'champion') return 90
  if (result === 'finalist') return 80
  const n = Number(String(result).split('_r')[1] || 0) // lost_r1..r6
  return n * 10 // r6 -> 60 … r1 -> 10
}

const LABELS: Record<string, string> = {
  champion_flawless: '15-0 PERFECTO',
  champion: 'Campeón',
  finalist: 'Finalista',
  lost_r6: 'Semifinal',
  lost_r5: 'Cuartos',
  lost_r4: '4ª ronda',
  lost_r3: '3ª ronda',
  lost_r2: '2ª ronda',
  lost_r1: '1ª ronda',
}

export function labelOf(result: SimResult['result']): string {
  return LABELS[result] ?? String(result)
}

/** Registra un intento; devuelve {records, isNewBest}. */
export function recordResult(res: SimResult, slamName: string): { records: Records; isNewBest: boolean } {
  const r = loadRecords()
  r.attempts += 1
  if (res.result === 'champion' || res.result === 'champion_flawless') r.titles += 1
  if (res.result === 'champion_flawless') r.perfectos += 1

  const rank = rankOf(res.result)
  let isNewBest = false
  if (!r.best || rank > r.best.rank) {
    r.best = { rank, label: labelOf(res.result), record: `${res.setsWon}-${res.setsLost}`, slam: slamName }
    isNewBest = true
  }
  save(r)
  return { records: r, isNewBest }
}
