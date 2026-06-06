import { useEffect, useState } from 'react'
import type { SimResult, SetScore } from '../engine/simulate'
import type { Slam } from '../game/types'
import { SURFACE_LABEL } from '../engine/ratings'
import { decadeColor } from '../game/labels'
import Flag from './Flag'

interface Props {
  result: SimResult
  slam: Slam
  onComplete: () => void
}

function lastName(name: string) {
  const p = name.split(' ')
  return p.length > 1 ? p.slice(1).join(' ') : name
}

/** Pills de sets, verde si lo ganó el jugador, rojo si lo perdió. */
function SetPills({ sets, size = 'sm' }: { sets: SetScore[]; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'min-w-[3rem] px-2.5 py-1.5 text-lg' : 'min-w-[2.3rem] px-2 py-1 text-sm'
  return (
    <div className="flex flex-wrap gap-1.5">
      {sets.map((s, i) => (
        <span
          key={i}
          className={`animate-pop rounded-lg border text-center font-mono font-bold tabular-nums ${cls} ${
            s.won
              ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
              : 'border-red-400/50 bg-red-500/20 text-red-200'
          }`}
        >
          {s.pg}-{s.og}
        </span>
      ))}
    </div>
  )
}

export default function SimulationView({ result, slam, onComplete }: Props) {
  const [revealed, setRevealed] = useState(0) // partidos completos en la lista
  const [playing, setPlaying] = useState(false)
  const [setsShown, setSetsShown] = useState(0)
  const total = result.matches.length

  // juega el primer partido automáticamente al entrar
  useEffect(() => {
    setSetsShown(0)
    setPlaying(true)
  }, [])

  // reveal set por set del partido en curso
  useEffect(() => {
    if (!playing) return
    const m = result.matches[revealed]
    if (!m) {
      setPlaying(false)
      return
    }
    if (setsShown < m.sets.length) {
      const t = setTimeout(() => setSetsShown((s) => s + 1), setsShown === 0 ? 500 : 780)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      setRevealed((r) => r + 1)
      setPlaying(false)
      setSetsShown(0)
    }, 850)
    return () => clearTimeout(t)
  }, [playing, setsShown, revealed, result.matches])

  const next = result.matches[revealed]
  const done = !playing && revealed >= total
  const isFinalNext = next?.round === 7

  function playNext() {
    setSetsShown(0)
    setPlaying(true)
  }

  // marcador en vivo del partido en curso
  const live = playing ? result.matches[revealed] : null
  const shown = live ? live.sets.slice(0, setsShown) : []
  const pw = shown.filter((s) => s.won).length
  const ow = shown.length - pw

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 text-center">
        <div className="text-xs uppercase tracking-[.25em] text-ball/80">{slam.name}</div>
        <div className="text-sm text-emerald-100/60">
          Camino al título · {SURFACE_LABEL[slam.surface]}
        </div>
      </div>

      {/* Partidos ya jugados */}
      <div className="space-y-2">
        {result.matches.slice(0, revealed).map((m) => (
          <div
            key={m.round}
            className={`animate-pop flex items-center justify-between gap-3 rounded-xl border-l-4 px-4 py-3 ${
              m.won
                ? 'border-l-emerald-400 border-y border-r border-emerald-400/25 bg-emerald-500/12'
                : 'border-l-red-400 border-y border-r border-red-400/30 bg-red-500/12'
            }`}
          >
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-emerald-100/55">{m.roundName}</div>
              <div className="font-semibold leading-tight text-emerald-50">
                vs <Flag code={m.opponentCountry} /> {m.opponentName}
              </div>
              <div className="mt-1.5">
                <SetPills sets={m.sets} />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className={`text-lg font-black ${m.won ? 'text-emerald-300' : 'text-red-300'}`}>
                {m.won ? '✓ GANÓ' : '✗ PERDIÓ'}
              </div>
              <div className="text-[11px] text-emerald-100/55">sets {m.setsWon}-{m.setsLost}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Zona de acción */}
      <div className="mt-5">
        {live ? (
          // marcador EN VIVO
          <div className="rounded-2xl border border-ball/40 bg-black/30 p-5">
            <div className="text-center text-[11px] uppercase tracking-wider text-emerald-100/55">
              {live.roundName} · en juego
            </div>
            <div className="mt-2 flex items-center justify-center gap-4">
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-50">Vos</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-5xl font-black tabular-nums ${pw >= ow ? 'text-emerald-300' : 'text-emerald-100/70'}`}>
                  {pw}
                </span>
                <span className="text-2xl font-black text-emerald-100/40">–</span>
                <span className={`text-5xl font-black tabular-nums ${ow > pw ? 'text-red-300' : 'text-emerald-100/70'}`}>
                  {ow}
                </span>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-emerald-50">
<Flag code={live.opponentCountry} /> {lastName(live.opponentName)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-center">
              {shown.length > 0 ? (
                <SetPills sets={shown} size="lg" />
              ) : (
                <div className="animate-ballspin text-2xl">🎾</div>
              )}
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
<Flag code={next.opponentCountry} /> {next.opponentName}
                      <span className="ml-1.5 text-[11px]" style={{ color: decadeColor(next.opponentDecade as never) }}>
                        {next.opponentDecade}
                      </span>
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
              {isFinalNext ? 'Jugar la FINAL ▸' : 'Siguiente partido ▸'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
