import { useEffect, useRef, useState } from 'react'
import type { Spin } from '../game/draft'
import { REGION_LABEL } from '../game/labels'
import { decadeColor } from '../game/labels'

interface Props {
  target: Spin
  combos: Spin[]
  spinId: number
  onDone: () => void
}

export default function SlotMachine({ target, combos, spinId, onDone }: Props) {
  const [display, setDisplay] = useState<Spin>(target)
  const [spinning, setSpinning] = useState(true)
  const timers = useRef<number[]>([])

  useEffect(() => {
    setSpinning(true)
    timers.current.forEach(clearTimeout)
    timers.current = []

    const start = performance.now()
    const duration = 1100
    let raf = 0
    let last = 0

    const tick = (t: number) => {
      if (t - last > 70) {
        const c = combos[Math.floor(Math.random() * combos.length)] ?? target
        setDisplay(c)
        last = t
      }
      if (t - start < duration) {
        raf = requestAnimationFrame(tick)
      } else {
        setDisplay(target)
        setSpinning(false)
        onDone()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId])

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-ball/30 bg-black/30 px-4 py-3 ${
        spinning ? '' : 'animate-pop'
      }`}
    >
      <div className="text-[10px] uppercase tracking-[.2em] text-ball/70">La tragamonedas dice</div>
      <div className="mt-1 flex items-center gap-3">
        <span
          className="rounded-lg px-3 py-1.5 text-2xl font-black tabular-nums"
          style={{ color: decadeColor(display.decade), background: 'rgba(255,255,255,.06)' }}
        >
          {display.decade}
        </span>
        <span className="text-xl font-bold text-ball/40">·</span>
        <span className="text-2xl font-black text-emerald-50">{REGION_LABEL[display.region]}</span>
      </div>
      {spinning && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      )}
    </div>
  )
}
