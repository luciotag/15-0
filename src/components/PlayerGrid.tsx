import type { Player, AttrKey } from '../game/types'
import { ATTR_LABELS, ATTR_ORDER, FLOOR } from '../engine/ratings'
import { flagEmoji, decadeColor } from '../game/labels'

interface Props {
  players: Player[]
  statsVisible: boolean
  onPick: (p: Player) => void
  /** Modo por-ronda: atributo fijo de la ronda. */
  attr?: AttrKey
  /** Modo libre: atributos todavía vacíos del tenista. */
  emptyAttrs?: AttrKey[]
}

function attrColor(v: number) {
  if (v >= 90) return '#d8f24b'
  if (v >= 80) return '#86efac'
  if (v >= FLOOR) return '#fde68a'
  return '#f87171'
}

/** En modo libre, el mejor atributo todavía disponible de ese jugador (lo que más "te tienta"). */
function bestEmpty(p: Player, emptyAttrs: AttrKey[]): AttrKey {
  let best = emptyAttrs[0]
  for (const k of emptyAttrs) if (p.attrs[k] > p.attrs[best]) best = k
  return best
}

export default function PlayerGrid({ players, statsVisible, onPick, attr, emptyAttrs }: Props) {
  const free = !attr && !!emptyAttrs
  const highlight = new Set<AttrKey>(free ? emptyAttrs : attr ? [attr] : [])

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {players.map((p) => {
        const headAttr = free ? bestEmpty(p, emptyAttrs!) : attr!
        const val = p.attrs[headAttr]
        return (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="group animate-pop rounded-xl border border-white/10 bg-white/[.04] p-3 text-left transition
                       hover:-translate-y-0.5 hover:border-ball/60 hover:bg-white/[.08] focus:outline-none
                       focus:ring-2 focus:ring-ball/60 active:translate-y-0"
          >
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight text-emerald-50">{p.name}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-100/60">
                  <span>{flagEmoji(p.country)}</span>
                  <span>{p.country}</span>
                  {p.peakRank === 1 && <span className="text-ball/80">· N°1</span>}
                </div>
              </div>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{ color: decadeColor(p.decade), background: 'rgba(255,255,255,.06)' }}
              >
                {p.decade}
              </span>
            </div>

            <div className="mt-2.5 flex items-end justify-between">
              <span className="text-[10px] uppercase leading-tight tracking-wider text-emerald-100/50">
                {free ? 'Su mejor libre' : ''}
                <span className="block font-semibold text-emerald-100/75">{ATTR_LABELS[headAttr]}</span>
              </span>
              {statsVisible ? (
                <span className="text-2xl font-black tabular-nums" style={{ color: attrColor(val) }}>
                  {val}
                </span>
              ) : (
                <span className="text-2xl font-black text-emerald-100/30">?</span>
              )}
            </div>

            {statsVisible && (
              <div className="mt-2 grid grid-cols-6 gap-[3px]" title="Perfil completo">
                {ATTR_ORDER.map((k) => (
                  <div key={k} className="h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.attrs[k]}%`,
                        background: highlight.has(k) ? '#d8f24b' : 'rgba(216,242,75,.3)',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
