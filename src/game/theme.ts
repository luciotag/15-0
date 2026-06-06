import type { SlamId } from './types'

export interface Theme {
  accent: string // color de marca (token --color-ball)
  court: string // verde/azul/naranja base
  courtDark: string // texto oscuro sobre el acento (botones)
  bg: string // fondo de pantalla con TEXTURA del material de la cancha
  cardBg: [string, string, string] // gradiente base de la card compartible (canvas)
  material: 'grass' | 'clay' | 'hard' // para texturizar la card
  ring: string
}

// Vignette radial reutilizable por tema (último layer del background).
const vignette = (a: string, b: string, c: string) =>
  `radial-gradient(135% 125% at 50% -10%, ${a} 0%, ${b} 45%, ${c} 100%)`

// Rayas de pasto cortado (césped).
const grassStripes =
  'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 34px, rgba(0,0,0,0.06) 34px 68px)'

// Granulado de polvo de ladrillo.
const clayGrain =
  'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.5px) 0 0 / 7px 7px,' +
  'radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1.5px) 4px 3px / 9px 9px'

// Grano fino de cemento acrílico.
const cementGrain = 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1.3px) 0 0 / 6px 6px'

/** Cada Slam pinta toda la UI con la identidad y el MATERIAL de su cancha. */
export const THEMES: Record<SlamId, Theme> = {
  // Australian Open — cemento azul (Plexicushion), más claro.
  ao: {
    accent: '#49c5ff',
    court: '#1565a0',
    courtDark: '#05172b',
    bg: `${cementGrain}, ${vignette('#1f74b8', '#11456c', '#07182b')}`,
    cardBg: ['#1f74b8', '#114062', '#06162a'],
    material: 'hard',
    ring: 'rgba(73,197,255,.40)',
  },
  // Roland Garros — polvo de ladrillo (terracota granulada).
  rg: {
    accent: '#ff9f45',
    court: '#a4502a',
    courtDark: '#2a1109',
    bg: `${clayGrain}, ${vignette('#c2622f', '#7c3417', '#2a1208')}`,
    cardBg: ['#bb5f2e', '#7a3417', '#23100a'],
    material: 'clay',
    ring: 'rgba(255,159,69,.42)',
  },
  // Wimbledon — césped con rayas de corte.
  wimbledon: {
    accent: '#caf24b',
    court: '#157a4c',
    courtDark: '#052017',
    bg: `${grassStripes}, ${vignette('#15824f', '#0a4329', '#04200f')}`,
    cardBg: ['#137a4a', '#0a3f28', '#04200f'],
    material: 'grass',
    ring: 'rgba(202,242,75,.42)',
  },
  // US Open — cemento azul profundo (Laykold).
  uso: {
    accent: '#5ea0ff',
    court: '#1f3f9c',
    courtDark: '#06163a',
    bg: `${cementGrain}, ${vignette('#234fb0', '#122a63', '#060f24')}`,
    cardBg: ['#234fb0', '#122a5e', '#060f22'],
    material: 'hard',
    ring: 'rgba(94,160,255,.42)',
  },
}
