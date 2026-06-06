import type { Region, Decade } from './types'

export const REGION_LABEL: Record<Region, string> = {
  north_america: 'Norteamérica',
  south_america: 'Sudamérica',
  europe: 'Europa',
  oceania: 'Oceanía',
  asia: 'Asia',
  africa: 'África',
}

export const REGION_EMOJI: Record<Region, string> = {
  north_america: '🌎',
  south_america: '🌎',
  europe: '🌍',
  oceania: '🌏',
  asia: '🌏',
  africa: '🌍',
}

/** IOC (3 letras) -> emoji bandera. Solo los países presentes en el dataset. */
const IOC_TO_ISO2: Record<string, string> = {
  USA: 'US', CAN: 'CA', ARG: 'AR', BRA: 'BR', CHI: 'CL', ECU: 'EC',
  ESP: 'ES', SUI: 'CH', SRB: 'RS', SWE: 'SE', GER: 'DE', FRA: 'FR',
  GBR: 'GB', CRO: 'HR', AUT: 'AT', RUS: 'RU', CZE: 'CZ', ITA: 'IT',
  GRE: 'GR', BEL: 'BE', NED: 'NL', ROU: 'RO', BUL: 'BG', NOR: 'NO',
  POL: 'PL', AUS: 'AU', JPN: 'JP', CHN: 'CN', KAZ: 'KZ', KOR: 'KR',
  RSA: 'ZA', YUG: 'RS', BLR: 'BY', DEN: 'DK', LAT: 'LV', SVK: 'SK', EST: 'EE',
}

export function flagEmoji(ioc: string): string {
  const iso = IOC_TO_ISO2[ioc]
  if (!iso) return '🎾'
  return String.fromCodePoint(
    ...iso.split('').map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)),
  )
}

export function decadeColor(d: Decade): string {
  const map: Record<Decade, string> = {
    '1960s': '#a78bfa',
    '1970s': '#f472b6',
    '1980s': '#fb923c',
    '1990s': '#facc15',
    '2000s': '#34d399',
    '2010s': '#38bdf8',
    '2020s': '#d8f24b',
  }
  return map[d]
}
