import { useEffect, useState } from 'react'
import type { SimResult } from '../engine/simulate'
import type { Slam } from '../game/types'
import { SURFACE_LABEL } from '../engine/ratings'
import { flagEmoji, decadeColor } from '../game/labels'

interface Props {
  result: SimResult
  slam: Slam
  onComplete: () => void
}

export default function SimulationView({ result, slam, onComplete }: Props) {
  const [revealed, setRevealed] = useState(0)
  const [playing, setPlaying] = useState(false)
  const total = result.matches.length

  // Juega automáticamente el primer partido al entrar.
  useEffect(() => {
    setPlaying(true)
    const t = setTimeout(() => {
      setRevealed(1)
      setPlaying(false)
    }, 750)
    return () => clearTimeout(t)
  }, [])

  const next = result.matches[revealed] // próximo partido a jugar (si hay)
  const done = revealed >= total
  const isFinalNext = next?.round === 7

  function playNext() {
    setPlaying(true)
    setTimeout(() => {
      setRevealed((r) => r + 1)
      setPlaying(false)
    }, 750)
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 text-center">
        <div className="text-xs uppercase tracking-[.25em] text-ball/80">{slam.name}</div>
        <div className="text-sm text-emerald-100/60">
          Camino al título · {SURFACE_LABEL[slam.surface]}
        </div>
      </div>

      <div className="space-y-2">
        {result.matches.slice(0, revealed).map((m) => (
          <div
            key={m.round}
            className={`animate-pop flex items-center justify-between rounded-xl border px-4 py-3 ${
              m.won ? 'border-emerald-400/30 bg-emerald-400/[.06]' : 'border-red-400/40 bg-red-500/[.08]'
            }`}
          >
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-emerald-100/55">{m.roundName}</div>
              <div className="truncate font-semibold text-emerald-50">
                vs {flagEmoji(m.opponentCountry)} {m.opponentName}
                <span className="ml-1 text-[11px]" style={{ color: decadeColor(m.opponentDecade as never) }}>
                  {m.opponentDecade}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-mono text-lg font-bold ${m.won ? 'text-ball' : 'text-red-300'}`}>
                {m.scoreline}
              </div>
              <div className="text-[11px] text-emerald-100/50">
                {m.won ? 'Ganó' : 'Perdió'} · sets {m.setsWon}-{m.setsLost}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Zona de acción */}
      <div className="mt-5">
        {playing ? (
          <div className="flex flex-col items-center gap-2 py-4 text-emerald-100/70">
            <div className="animate-ballspin text-3xl">🎾</div>
            <div className="text-sm">
              Jugando {next?.roundName ?? result.matches[revealed - 1]?.roundName}
              {next ? ` vs ${next.opponentName}` : ''}…
            </div>
          </div>
        ) : done ? (
          <button
            onClick={onComplete}
            className="w-full rounded-xl bg-ball py-3.5 font-black text-court-dark transition hover:brightness-110 active:scale-[.99]"
          >
            Ver resultado →
          </button>
        ) : (
          <div className="space-y-3">
            {next && (
              <div
                className={`rounded-xl border px-4 py-3 ${
                  isFinalNext ? 'border-ball/60 bg-ball/10' : 'border-white/10 bg-white/[.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-emerald-100/55">
                      Próximo · {next.roundName}
                      {isFinalNext && <span className="ml-1 text-ball">★ el jefe</span>}
                    </div>
                    <div className="text-lg font-bold text-emerald-50">
                      {flagEmoji(next.opponentCountry)} {next.opponentName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black tabular-nums text-ball">{next.opponentRating}</div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-100/50">poder</div>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={playNext}
              className="w-full rounded-xl bg-ball py-3.5 font-black text-court-dark transition hover:brightness-110 active:scale-[.99]"
            >
              {revealed === 0 ? 'Jugar 1ª ronda ▸' : isFinalNext ? 'Jugar la FINAL ▸' : 'Siguiente partido ▸'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
