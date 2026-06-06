import type { Player, AttrKey } from '../game/types'
import { ATTR_LABELS, FLOOR } from '../engine/ratings'
import { flagEmoji, decadeColor } from '../game/labels'

interface Props {
  player: Player
  emptyAttrs: AttrKey[]
  statsVisible: boolean
  onChoose: (attr: AttrKey) => void
  onCancel: () => void
}

function valColor(v: number) {
  if (v >= 90) return '#d8f24b'
  if (v >= 80) return '#86efac'
  if (v >= FLOOR) return '#fde68a'
  return '#f87171'
}

export default function AttrChooser({ player, emptyAttrs, statsVisible, onChoose, onCancel }: Props) {
  return (
    <div className="animate-pop rounded-2xl border border-ball/40 bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-emerald-100/55">
            De este crack, ¿qué te robás?
          </div>
          <div className="text-xl font-black text-emerald-50">
            {flagEmoji(player.country)} {player.name}
            <span className="ml-1.5 text-xs" style={{ color: decadeColor(player.decade) }}>
              {player.decade}
            </span>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-emerald-100/80 transition hover:bg-white/5"
        >
          ← Otro
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {emptyAttrs.map((k) => {
          const v = player.attrs[k]
          return (
            <button
              key={k}
              onClick={() => onChoose(k)}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-left transition
                         hover:-translate-y-0.5 hover:border-ball/60 hover:bg-white/[.08] focus:outline-none focus:ring-2 focus:ring-ball/60"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-emerald-50">{ATTR_LABELS[k]}</div>
                {statsVisible && (
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${v}%`, background: valColor(v) }}
                    />
                  </div>
                )}
              </div>
              <span
                className="ml-3 text-2xl font-black tabular-nums"
                style={{ color: statsVisible ? valColor(v) : 'rgba(234,255,245,.3)' }}
              >
                {statsVisible ? v : '?'}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] text-emerald-100/45">
        Te quedás solo con ese atributo de {player.name.split(' ').slice(-1)[0]}. El resto se pierde.
      </p>
    </div>
  )
}
