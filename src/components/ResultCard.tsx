import { useEffect, useRef, useState } from 'react'
import type { Slot, Slam, Tour, AttrKey } from '../game/types'
import type { SimResult } from '../engine/simulate'
import { resultHeadline } from '../engine/simulate'
import { ATTR_LABELS, SURFACE_LABEL, overall } from '../engine/ratings'

interface Props {
  slots: Slot[]
  result: SimResult
  slam: Slam
  tour: Tour
  accent: string
  cardBg: [string, string, string]
  material: 'grass' | 'clay' | 'hard'
}

const W = 1080
const H = 1350

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function lastName(name: string) {
  const parts = name.split(' ')
  return parts.length > 1 ? parts.slice(1).join(' ') : name
}

export default function ResultCard({ slots, result, slam, tour, accent, cardBg, material }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [url, setUrl] = useState<string>('')

  const lastMatch = result.matches[result.matches.length - 1]
  const isChamp = result.result === 'champion' || result.result === 'champion_flawless'
  const rivalLine = lastMatch
    ? isChamp
      ? `Definió ante ${lastName(lastMatch.opponentName)}`
      : `Lo frenó ${lastName(lastMatch.opponentName)}`
    : ''

  const attrs = {
    serve: slots[0].player?.attrs.serve ?? 0,
    return: slots[1].player?.attrs.return ?? 0,
    forehand: slots[2].player?.attrs.forehand ?? 0,
    backhand: slots[3].player?.attrs.backhand ?? 0,
    movement: slots[4].player?.attrs.movement ?? 0,
    mental: slots[5].player?.attrs.mental ?? 0,
  }
  const ov = Math.round(overall(attrs, slam.surface))
  const head = resultHeadline(result)
  const tone = head.tone === 'gold' ? '#ffd54a' : head.tone === 'green' ? '#9bf6a0' : '#fca5a5'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // fondo (toma el color del Slam)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, cardBg[0])
    g.addColorStop(0.55, cardBg[1])
    g.addColorStop(1, cardBg[2])
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    // textura del material de la cancha
    ctx.save()
    if (material === 'grass') {
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      for (let x = 0; x < W; x += 96) ctx.fillRect(x, 0, 48, H)
    } else if (material === 'clay') {
      for (let i = 0; i < 1400; i++) {
        const lum = Math.random()
        ctx.fillStyle = lum > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
        ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2)
      }
    } else {
      for (let i = 0; i < 700; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)'
        ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2)
      }
    }
    ctx.restore()

    // marco
    ctx.strokeStyle = accent
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 4
    rounded(ctx, 24, 24, W - 48, H - 48, 36)
    ctx.stroke()
    ctx.globalAlpha = 1

    ctx.textAlign = 'center'

    // header
    ctx.fillStyle = accent
    ctx.font = '800 30px Inter, sans-serif'
    ctx.fillText('15-0 · SLAM PERFECTO', W / 2, 96)

    // título resultado
    ctx.fillStyle = tone
    ctx.font = '900 96px Inter, sans-serif'
    ctx.fillText(head.title, W / 2, 210)

    ctx.fillStyle = 'rgba(234,255,245,.75)'
    ctx.font = '500 30px Inter, sans-serif'
    ctx.fillText(head.sub, W / 2, 262)

    // rival decisivo
    if (rivalLine) {
      ctx.fillStyle = 'rgba(234,255,245,.55)'
      ctx.font = '600 26px Inter, sans-serif'
      ctx.fillText(rivalLine, W / 2, 308)
    }

    // récord grande
    ctx.fillStyle = '#eafff5'
    ctx.font = '900 168px Inter, sans-serif'
    ctx.fillText(`${result.setsWon}-${result.setsLost}`, W / 2, 478)
    ctx.fillStyle = 'rgba(234,255,245,.55)'
    ctx.font = '600 26px Inter, sans-serif'
    ctx.fillText('RÉCORD DE SETS EN EL TORNEO', W / 2, 520)

    // sub-info
    ctx.fillStyle = tone
    ctx.font = '800 34px Inter, sans-serif'
    ctx.fillText(`${slam.name} · ${SURFACE_LABEL[slam.surface]} · OVERALL ${ov}`, W / 2, 580)

    // atributos
    ctx.textAlign = 'left'
    const order: AttrKey[] = ['serve', 'return', 'forehand', 'backhand', 'movement', 'mental']
    const startY = 650
    const rowH = 102
    const padX = 80
    order.forEach((k, i) => {
      const y = startY + i * rowH
      const p = slots[i].player
      const val = attrs[k]
      // chip valor
      ctx.fillStyle = 'rgba(255,255,255,.05)'
      rounded(ctx, padX, y, W - padX * 2, 80, 18)
      ctx.fill()

      ctx.fillStyle = '#eafff5'
      ctx.font = '800 30px Inter, sans-serif'
      ctx.fillText(ATTR_LABELS[k].toUpperCase(), padX + 28, y + 34)

      ctx.fillStyle = 'rgba(234,255,245,.6)'
      ctx.font = '500 24px Inter, sans-serif'
      ctx.fillText(p ? `de ${lastName(p.name)} · ${p.decade}` : '—', padX + 28, y + 64)

      // barra
      const barX = padX + 430
      const barW = W - padX * 2 - 430 - 110
      ctx.fillStyle = 'rgba(255,255,255,.12)'
      rounded(ctx, barX, y + 38, barW, 14, 7)
      ctx.fill()
      ctx.fillStyle = val >= 60 ? accent : '#f87171'
      rounded(ctx, barX, y + 38, (barW * val) / 100, 14, 7)
      ctx.fill()

      // valor
      ctx.textAlign = 'right'
      ctx.fillStyle = val >= 60 ? accent : '#f87171'
      ctx.font = '900 46px Inter, sans-serif'
      ctx.fillText(String(val), W - padX - 24, y + 52)
      ctx.textAlign = 'left'
    })

    // footer
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(234,255,245,.45)'
    ctx.font = '500 22px Inter, sans-serif'
    ctx.fillText(
      `${tour.toUpperCase()} · Datos: Jeff Sackmann / Tennis Abstract — CC BY-NC-SA 4.0`,
      W / 2,
      H - 54,
    )

    try {
      setUrl(canvas.toDataURL('image/png'))
    } catch {
      setUrl('')
    }
  }, [slots, result, slam, tour, ov, head.title, head.sub, tone, accent, cardBg, rivalLine, material])

  const download = () => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `15-0_${result.result}_${result.setsWon}-${result.setsLost}.png`
    a.click()
  }

  const share = async () => {
    if (!url) return
    try {
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], '15-0.png', { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '15-0 · Slam Perfecto',
          text: `Mi récord en 15-0: ${result.setsWon}-${result.setsLost} en ${slam.name}.`,
        })
        return
      }
    } catch {
      /* cae al download */
    }
    download()
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-[340px] rounded-2xl border border-ball/20 shadow-2xl"
      />
      <div className="flex w-full max-w-[340px] gap-2">
        <button
          onClick={share}
          className="flex-1 rounded-xl bg-ball py-3 font-black text-court-dark transition hover:brightness-110 active:scale-[.99]"
        >
          Compartir
        </button>
        <button
          onClick={download}
          className="flex-1 rounded-xl border border-ball/40 py-3 font-bold text-ball transition hover:bg-ball/10 active:scale-[.99]"
        >
          Descargar PNG
        </button>
      </div>
    </div>
  )
}
