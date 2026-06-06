import type { Slot, AttrKey } from '../game/types'
import { ATTR_LABELS, FLOOR } from '../engine/ratings'
import { flagEmoji } from '../game/labels'

interface Props {
  slots: Slot[]
  /** Atributo resaltado (modo por-ronda). En modo libre va null. */
  activeAttr?: AttrKey | null
}

export default function BuilderPanel({ slots, activeAttr = null }: Props) {
  const filled = slots.filter((s) => s.player).length
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ball/80">Tu tenista</h3>
        <span className="text-xs text-emerald-100/50">{filled}/6</span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {slots.map((s) => {
          const active = activeAttr ? s.attr === activeAttr : false
          const done = !!s.player
          return (
            <li
              key={s.attr}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                active
                  ? 'border-ball/60 bg-ball/10'
                  : done
                    ? 'border-white/10 bg-white/[.03]'
                    : 'border-white/5 bg-transparent opacity-60'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-100/55">
                    {ATTR_LABELS[s.attr]}
                  </span>
                  {active && <span className="text-[10px] font-bold text-ball">● ahora</span>}
                </div>
                {s.player ? (
                  <div className="text-[13px] font-semibold leading-tight text-emerald-50">
                    {flagEmoji(s.player.country)} {s.player.name}
                  </div>
                ) : (
                  <div className="text-[13px] text-emerald-100/30">—</div>
                )}
              </div>
              {s.player && (
                <span
                  className="ml-2 shrink-0 text-lg font-black tabular-nums"
                  style={{ color: s.player.attrs[s.attr] >= FLOOR ? '#d8f24b' : '#f87171' }}
                >
                  {s.player.attrs[s.attr]}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
