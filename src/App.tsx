import { useEffect, useMemo, useRef, useState } from 'react'
import type { Player, Slot, Tour, SlamId, Attrs, AttrKey } from './game/types'
import { loadPlayers } from './game/data'
import { ROUND_ATTRS, TOTAL_ROUNDS, spin as doSpin, eligible, availableCombos } from './game/draft'
import type { Spin } from './game/draft'
import { SLAMS, ATTR_LABELS, SURFACE_LABEL, overall, FLOOR } from './engine/ratings'
import { simulate, resultHeadline, forecast, rng } from './engine/simulate'
import type { SimResult } from './engine/simulate'
import { buildDraw } from './game/draw'
import { THEMES } from './game/theme'
import type { Theme } from './game/theme'
import { loadRecords, recordResult } from './game/storage'
import type { Records } from './game/storage'
import { REGION_LABEL, decadeColor } from './game/labels'
import Flag from './components/Flag'
import SlotMachine from './components/SlotMachine'
import PlayerGrid from './components/PlayerGrid'
import AttrChooser from './components/AttrChooser'
import BuilderPanel from './components/BuilderPanel'
import RadarChart from './components/RadarChart'
import SimulationView from './components/SimulationView'
import ResultCard from './components/ResultCard'

type Screen = 'home' | 'draft' | 'summary' | 'sim' | 'result'

function emptySlots(): Slot[] {
  return ROUND_ATTRS.map((attr) => ({ attr, player: null }))
}

function buildAttrs(slots: Slot[]): Attrs {
  const a: Record<AttrKey, number> = {
    serve: 0, return: 0, forehand: 0, backhand: 0, movement: 0, mental: 0,
  }
  for (const s of slots) a[s.attr] = s.player ? s.player.attrs[s.attr] : 0
  return a
}

function fmtPct(p: number): string {
  if (p >= 10) return `${Math.round(p)}%`
  if (p >= 1) return `${p.toFixed(1)}%`
  if (p >= 0.05) return `${p.toFixed(2)}%`
  if (p > 0) return '<0.05%'
  return '0%'
}

type AssignMode = 'free' | 'byround'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function emptyAttrsOf(slots: Slot[]): AttrKey[] {
  return slots.filter((s) => !s.player).map((s) => s.attr)
}

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export default function App() {
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [screen, setScreen] = useState<Screen>('home')
  const [tour, setTour] = useState<Tour>('atp')
  const [slamId, setSlamId] = useState<SlamId>('uso')
  const [statsVisible, setStatsVisible] = useState(false) // ball-knower por defecto
  const [assignMode, setAssignMode] = useState<AssignMode>('free')
  const [daily, setDaily] = useState(false)

  const [slots, setSlots] = useState<Slot[]>(emptySlots())
  const [round, setRound] = useState(0)
  const [spinObj, setSpinObj] = useState<Spin | null>(null)
  const [spinId, setSpinId] = useState(0)
  const [phase, setPhase] = useState<'spin' | 'pick'>('spin')
  const [pendingPlayer, setPendingPlayer] = useState<Player | null>(null)
  const spinRng = useRef<() => number>(Math.random)

  const [seedText, setSeedText] = useState('')
  const [runSeed, setRunSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [result, setResult] = useState<SimResult | null>(null)

  const [records, setRecords] = useState<Records>(() => loadRecords())
  const [isNewBest, setIsNewBest] = useState(false)

  const slam = useMemo(() => SLAMS.find((s) => s.id === slamId)!, [slamId])
  const theme: Theme = THEMES[slamId]

  useEffect(() => {
    loadPlayers().then(setPlayers).catch((e) => setLoadError(String(e)))
  }, [])

  // Pinta el tema del Slam a nivel documento (fondo + scrollbar + acentos).
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--color-ball', theme.accent)
    root.style.setProperty('--color-court', theme.court)
    root.style.setProperty('--color-court-dark', theme.courtDark)
    document.body.style.background = theme.bg
  }, [theme])

  const combos = useMemo(
    () => (players ? availableCombos(players, tour) : []),
    [players, tour],
  )
  const usedIds = useMemo(
    () => new Set(slots.map((s) => s.player?.id).filter(Boolean) as string[]),
    [slots],
  )
  const pool = useMemo(
    () => (players && spinObj ? eligible(players, tour, spinObj, usedIds) : []),
    [players, tour, spinObj, usedIds],
  )

  // Semilla efectiva (manual o aleatoria) y cuadro de rivales reales del torneo.
  const effectiveSeed = seedText.trim() ? hashSeed(seedText.trim()) : runSeed
  const draw = useMemo(
    () => (players ? buildDraw(players, tour, slam.surface, effectiveSeed) : []),
    [players, tour, slam.surface, effectiveSeed],
  )

  function newSpin(previous: Spin | null) {
    if (!players) return
    const s = doSpin(players, tour, spinRng.current, previous ?? undefined)
    setSpinObj(s)
    setPhase('spin')
    setSpinId((n) => n + 1)
  }

  function startDraft() {
    const sd = daily ? hashSeed(`${todayStr()}|${tour}`) : Math.floor(Math.random() * 1e9)
    spinRng.current = daily ? rng(sd) : Math.random
    setSlots(emptySlots())
    setRound(0)
    setResult(null)
    setPendingPlayer(null)
    setRunSeed(sd)
    setScreen('draft')
    newSpin(null)
  }

  /** Fija el jugador `p` en el atributo `attr` y avanza. */
  function commit(attr: AttrKey, p: Player) {
    const next = slots.map((s) => (s.attr === attr ? { ...s, player: p } : s))
    setSlots(next)
    setPendingPlayer(null)
    const filled = next.filter((s) => s.player).length
    if (filled >= TOTAL_ROUNDS) {
      setScreen('summary')
    } else {
      setRound(round + 1)
      newSpin(spinObj)
    }
  }

  function pick(p: Player) {
    if (assignMode === 'byround') commit(ROUND_ATTRS[round], p)
    else setPendingPlayer(p) // modo libre: ahora elige qué atributo robar
  }

  function chooseAttr(attr: AttrKey) {
    if (pendingPlayer) commit(attr, pendingPlayer)
  }

  function runSim() {
    const attrs = buildAttrs(slots)
    const res = simulate(attrs, slam.surface, tour, effectiveSeed, draw)
    const { records: updated, isNewBest: nb } = recordResult(res, slam.name)
    setRecords(updated)
    setIsNewBest(nb)
    setResult(res)
    setScreen('sim')
  }

  // ---- estados de carga ----
  if (loadError) {
    return (
      <Shell theme={theme}>
        <div className="mx-auto max-w-md rounded-xl border border-red-400/40 bg-red-500/10 p-6 text-center">
          <p className="font-bold text-red-200">No se pudo cargar la base de jugadores.</p>
          <p className="mt-2 text-sm text-emerald-100/70">{loadError}</p>
          <p className="mt-2 text-xs text-emerald-100/50">
            ¿Corriste <code>python etl/build_players.py</code> y estás sirviendo con <code>npm run dev</code>?
          </p>
        </div>
      </Shell>
    )
  }
  if (!players) {
    return (
      <Shell theme={theme}>
        <div className="flex flex-col items-center gap-3 py-20 text-emerald-100/70">
          <div className="animate-ballspin text-3xl">🎾</div>
          <p>Cargando cracks…</p>
        </div>
      </Shell>
    )
  }

  // ---------------- HOME ----------------
  if (screen === 'home') {
    return (
      <Shell theme={theme}>
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <h1 className="text-7xl font-black tracking-tight text-ball drop-shadow sm:text-8xl">15-0</h1>
            <p className="-mt-1 text-xl font-bold tracking-wide text-emerald-50 sm:text-2xl">
              Slam Perfecto
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm text-emerald-100/70">
              Armá un tenista <b>Frankenstein</b> robando un atributo a un crack distinto en cada ronda.
              Después simulá un Grand Slam y buscá lo imposible:{' '}
              <b className="text-ball">ganarlo sin ceder un set</b>.
            </p>
          </div>

          <div className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-black/25 p-5">
            {/* Tour */}
            <Field label="Tour">
              <Segmented
                value={tour}
                onChange={(v) => setTour(v as Tour)}
                options={[
                  { value: 'atp', label: 'ATP (varones)' },
                  { value: 'wta', label: 'WTA (mujeres)' },
                ]}
              />
            </Field>

            {/* Slam */}
            <Field label="Grand Slam a intentar">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SLAMS.map((s) => {
                  const active = s.id === slamId
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSlamId(s.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? 'border-ball bg-ball/15'
                          : 'border-white/10 bg-white/[.03] hover:border-ball/40'
                      }`}
                    >
                      <div className="text-sm font-bold text-emerald-50">{s.name}</div>
                      <div className="mt-0.5 text-[11px] text-emerald-100/60">{SURFACE_LABEL[s.surface]}</div>
                      <div className="mt-1 text-[10px] text-ball/70">{s.emphasis}</div>
                    </button>
                  )
                })}
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Modo de draft */}
              <Field label="Cómo robás atributos">
                <Segmented
                  value={assignMode}
                  onChange={(v) => setAssignMode(v as AssignMode)}
                  options={[
                    { value: 'free', label: 'Asignación libre' },
                    { value: 'byround', label: 'Por ronda' },
                  ]}
                />
              </Field>

              {/* Stats */}
              <Field label="Stats de los jugadores">
                <Segmented
                  value={statsVisible ? 'on' : 'off'}
                  onChange={(v) => setStatsVisible(v === 'on')}
                  options={[
                    { value: 'off', label: 'Ocultas' },
                    { value: 'on', label: 'Visibles' },
                  ]}
                />
              </Field>
            </div>

            {/* Reto del día */}
            <Field label="Modo">
              <Segmented
                value={daily ? 'daily' : 'free'}
                onChange={(v) => setDaily(v === 'daily')}
                options={[
                  { value: 'free', label: 'Libre' },
                  { value: 'daily', label: '🏆 Reto del día' },
                ]}
              />
            </Field>

            <button
              onClick={startDraft}
              className="w-full rounded-xl bg-ball py-4 text-lg font-black text-court-dark transition hover:brightness-110 active:scale-[.99]"
            >
              {daily ? 'Jugar el reto del día ▸' : 'Jugar ▸'}
            </button>
          </div>

          {/* Récords */}
          {records.attempts > 0 && (
            <div className="mx-auto mt-4 flex max-w-md items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-xs">
              <span className="text-emerald-100/60">
                Intentos <b className="text-emerald-50">{records.attempts}</b> · Títulos{' '}
                <b className="text-emerald-50">{records.titles}</b> · Perfectos{' '}
                <b className="text-ball">{records.perfectos}</b>
              </span>
              {records.best && (
                <span className="text-emerald-100/60">
                  Mejor: <b className="text-ball">{records.best.label}</b>
                </span>
              )}
            </div>
          )}

          <ul className="mx-auto mt-5 max-w-md space-y-1 text-xs text-emerald-100/55">
            <li>1 · La tragamonedas elige una <b>década · región</b>. No podés optimizar libre.</li>
            <li>
              2 ·{' '}
              {assignMode === 'free'
                ? 'Elegís un jugador y después qué atributo (todavía vacío) te robás.'
                : 'Elegís un jugador y te quedás con el atributo fijo de la ronda.'}
            </li>
            <li>3 · Tras 6 rondas tenés tu Frankenstein y elegís en qué Slam jugarlo.</li>
            <li>4 · Si algún atributo queda por debajo de {FLOOR}, el perfecto es casi imposible.</li>
          </ul>
        </div>
      </Shell>
    )
  }

  // ---------------- DRAFT ----------------
  if (screen === 'draft' && spinObj) {
    const attrKey = ROUND_ATTRS[round]
    const empties = emptyAttrsOf(slots)
    const free = assignMode === 'free'
    return (
      <Shell theme={theme}>
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[.25em] text-ball/70">
                  Ronda {round + 1} / {TOTAL_ROUNDS} {daily && '· 🏆 reto del día'}
                </div>
                <h2 className="text-2xl font-black text-emerald-50">
                  {free ? (
                    <>Robá <span className="text-ball">un atributo</span></>
                  ) : (
                    <>Buscás: <span className="text-ball">{ATTR_LABELS[attrKey]}</span></>
                  )}
                </h2>
              </div>
              <ProgressDots total={TOTAL_ROUNDS} filled={slots.filter((s) => s.player).length} />
            </div>

            <SlotMachine
              target={spinObj}
              combos={combos}
              spinId={spinId}
              onDone={() => setPhase('pick')}
            />

            <div className="mt-4">
              {phase !== 'pick' ? (
                <div className="py-12 text-center text-emerald-100/50">girando la tragamonedas…</div>
              ) : pendingPlayer ? (
                <AttrChooser
                  player={pendingPlayer}
                  emptyAttrs={empties}
                  statsVisible={statsVisible}
                  onChoose={chooseAttr}
                  onCancel={() => setPendingPlayer(null)}
                />
              ) : (
                <>
                  <div className="mb-2 text-sm text-emerald-100/70">
                    Activos en <b className="text-emerald-50">{spinObj.decade}</b> ·{' '}
                    <b className="text-emerald-50">{REGION_LABEL[spinObj.region]}</b> —{' '}
                    {free ? (
                      <>elegí un crack y después qué atributo le robás:</>
                    ) : (
                      <>elegí de quién te llevás el{' '}
                        <b className="text-ball">{ATTR_LABELS[attrKey].toLowerCase()}</b>:</>
                    )}
                  </div>
                  <PlayerGrid
                    players={pool}
                    attr={free ? undefined : attrKey}
                    emptyAttrs={free ? empties : undefined}
                    statsVisible={statsVisible}
                    onPick={pick}
                  />
                </>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-4 lg:self-start">
            <BuilderPanel slots={slots} activeAttr={free ? null : attrKey} />
          </aside>
        </div>
      </Shell>
    )
  }

  // ---------------- SUMMARY ----------------
  if (screen === 'summary') {
    const attrs = buildAttrs(slots)
    const ov = Math.round(overall(attrs, slam.surface))
    const weakest = Math.min(...ROUND_ATTRS.map((k) => attrs[k]))
    const canPerfect = weakest >= FLOOR
    const fc = forecast(attrs, slam.surface, tour, draw.map((o) => o.rating))
    const fcColor =
      fc.tone === 'gold' ? '#ffd54a' : fc.tone === 'green' ? '#9bf6a0' : fc.tone === 'amber' ? '#fbbf24' : '#fca5a5'
    const finalBoss = draw[6]
    return (
      <Shell theme={theme}>
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <div className="text-xs uppercase tracking-[.25em] text-ball/70">Tu Frankenstein está listo</div>
            <h2 className="text-3xl font-black text-emerald-50">Resumen del tenista</h2>
          </div>

          {/* Elegir Slam al final: cada superficie cambia tu overall */}
          <div className="mt-5">
            <div className="mb-1.5 text-center text-[11px] uppercase tracking-wider text-emerald-100/55">
              ¿En qué Slam lo jugás? (la superficie cambia tu overall)
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SLAMS.map((s) => {
                const sov = Math.round(overall(attrs, s.surface))
                const active = s.id === slamId
                return (
                  <button
                    key={s.id}
                    onClick={() => setSlamId(s.id)}
                    className={`rounded-xl border p-2.5 text-center transition ${
                      active ? 'border-ball bg-ball/15' : 'border-white/10 bg-white/[.03] hover:border-ball/40'
                    }`}
                  >
                    <div className="text-sm font-bold text-emerald-50">{s.name}</div>
                    <div className="text-[10px] text-emerald-100/55">{SURFACE_LABEL[s.surface]}</div>
                    <div
                      className="mt-0.5 text-xl font-black tabular-nums"
                      style={{ color: active ? theme.accent : '#eafff5' }}
                    >
                      {sov}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/25 p-3">
              <RadarChart attrs={attrs} size={300} accent={theme.accent} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <ul className="space-y-1.5">
                {slots.map((s) => (
                  <li key={s.attr} className="flex items-center justify-between text-sm">
                    <span className="text-emerald-100/70">
                      <b className="text-emerald-50">{ATTR_LABELS[s.attr]}</b> de{' '}
                      {s.player ? (
                        <>
                          <Flag code={s.player.country} /> {s.player.name}
                        </>
                      ) : (
                        '—'
                      )}
                      {s.player && (
                        <span
                          className="ml-1 text-[11px]"
                          style={{ color: decadeColor(s.player.decade) }}
                        >
                          {s.player.decade}
                        </span>
                      )}
                    </span>
                    <span
                      className="font-black tabular-nums"
                      style={{ color: s.player && s.player.attrs[s.attr] >= FLOOR ? '#d8f24b' : '#f87171' }}
                    >
                      {s.player ? s.player.attrs[s.attr] : 0}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-sm text-emerald-100/70">
                  Overall en {slam.name} ({SURFACE_LABEL[slam.surface]})
                </span>
                <span className="text-2xl font-black text-ball">{ov}</span>
              </div>

              {/* Pronóstico */}
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-100/55">
                    Pronóstico en {slam.short}
                  </span>
                  <span className="text-sm font-black" style={{ color: fcColor }}>
                    {fc.label}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-white/[.04] py-2">
                    <div className="text-xl font-black tabular-nums" style={{ color: fcColor }}>
                      {fmtPct(fc.titlePct)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-100/50">
                      chance de título
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/[.04] py-2">
                    <div className="text-xl font-black tabular-nums text-ball">
                      {fmtPct(fc.flawlessPct)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-100/50">
                      15-0 perfecto
                    </div>
                  </div>
                </div>
                <div
                  className={`mt-2 rounded-lg px-3 py-1.5 text-[11px] ${
                    canPerfect ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-500/10 text-red-200'
                  }`}
                >
                  {canPerfect
                    ? `Ningún atributo bajo ${FLOOR}: el perfecto está habilitado. 🎾`
                    : `Atributo bajo ${FLOOR} (eslabón débil): el perfecto es casi imposible.`}
                </div>
              </div>
            </div>
          </div>

          {finalBoss && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-ball/40 bg-ball/10 px-4 py-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-emerald-100/55">
                  ★ Si llegás, la final es contra
                </div>
                <div className="text-lg font-black text-emerald-50">
                  <Flag code={finalBoss.player.country} /> {finalBoss.player.name}
                  <span className="ml-1.5 text-[11px]" style={{ color: decadeColor(finalBoss.player.decade) }}>
                    {finalBoss.player.decade}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100/55">el rey de {SURFACE_LABEL[slam.surface].toLowerCase()}</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tabular-nums text-ball">{Math.round(finalBoss.rating)}</div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-100/50">poder</div>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-col items-center gap-3">
            <div className="flex w-full max-w-md items-center gap-2">
              <input
                value={seedText}
                onChange={(e) => setSeedText(e.target.value)}
                placeholder="semilla opcional (para compartir tu run)"
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-100/30 focus:border-ball/50 focus:outline-none"
              />
            </div>
            <div className="flex w-full max-w-md gap-2">
              <button
                onClick={() => startDraft()}
                className="flex-1 rounded-xl border border-white/15 py-3 font-bold text-emerald-100/80 transition hover:bg-white/5"
              >
                Re-draftear
              </button>
              <button
                onClick={runSim}
                className="flex-[2] rounded-xl bg-ball py-3 font-black text-court-dark transition hover:brightness-110 active:scale-[.99]"
              >
                Simular el {slam.short} ▸
              </button>
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  // ---------------- SIM ----------------
  if (screen === 'sim' && result) {
    return (
      <Shell theme={theme}>
        <SimulationView result={result} slam={slam} onComplete={() => setScreen('result')} />
      </Shell>
    )
  }

  // ---------------- RESULT ----------------
  if (screen === 'result' && result) {
    const head = resultHeadline(result)
    const toneClass =
      head.tone === 'gold' ? 'text-ball' : head.tone === 'green' ? 'text-emerald-300' : 'text-red-300'
    return (
      <Shell theme={theme}>
        <div className="mx-auto max-w-xl text-center">
          {isNewBest && (
            <div className="mx-auto mb-3 inline-block rounded-full border border-ball/50 bg-ball/15 px-4 py-1 text-sm font-black text-ball animate-pop">
              🏆 ¡Nuevo récord personal!
            </div>
          )}
          <h2 className={`text-4xl font-black ${toneClass}`}>{head.title}</h2>
          <p className="mt-1 text-emerald-100/70">{head.sub}</p>
          <p className="mt-1 text-xs text-emerald-100/40">
            Semilla: {result.seed} · {tour.toUpperCase()} · {slam.name}
            {daily && ' · 🏆 reto del día'}
          </p>

          <div className="mt-5">
            <ResultCard
              slots={slots}
              result={result}
              slam={slam}
              tour={tour}
              accent={theme.accent}
              cardBg={theme.cardBg}
              material={theme.material}
            />
          </div>

          <div className="mx-auto mt-6 flex max-w-[340px] flex-col gap-2">
            <button
              onClick={() => setScreen('summary')}
              className="rounded-xl border border-white/15 py-2.5 text-sm font-bold text-emerald-100/80 transition hover:bg-white/5"
            >
              ← Volver al tenista
            </button>
            <button
              onClick={() => setScreen('home')}
              className="rounded-xl border border-white/15 py-2.5 text-sm font-bold text-emerald-100/80 transition hover:bg-white/5"
            >
              Empezar de cero
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  return <Shell theme={theme}>{null}</Shell>
}

/* ---------------- helpers de UI ---------------- */

function Shell({ children, theme }: { children: React.ReactNode; theme: Theme }) {
  const themeVars = {
    background: theme.bg,
    '--color-ball': theme.accent,
    '--color-court': theme.court,
    '--color-court-dark': theme.courtDark,
  } as unknown as React.CSSProperties
  return (
    <div className="themed min-h-full" style={themeVars}>
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-5">
        <header className="mb-5 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-ball">15-0</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-100/50">
              Slam Perfecto
            </span>
          </div>
          <span className="text-2xl">🎾</span>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-8 border-t border-white/10 pt-4 text-center text-[11px] leading-relaxed text-emerald-100/45">
          Datos de tenis: Jeff Sackmann / Tennis Abstract (github.com/JeffSackmann) — CC BY-NC-SA 4.0.
          Uso no comercial. · Atributos curados editorialmente para el prototipo.
        </footer>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/55">
        {label}
      </div>
      {children}
    </div>
  )
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
            value === o.value ? 'bg-ball text-court-dark' : 'text-emerald-100/70 hover:bg-white/5'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ProgressDots({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${
            i < filled ? 'bg-ball' : i === filled ? 'bg-ball/40' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  )
}
