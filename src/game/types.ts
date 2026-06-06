export type Tour = 'atp' | 'wta'

export type Region =
  | 'north_america'
  | 'south_america'
  | 'europe'
  | 'oceania'
  | 'asia'
  | 'africa'

export type Decade = '1960s' | '1970s' | '1980s' | '1990s' | '2000s' | '2010s' | '2020s'

export type AttrKey = 'serve' | 'return' | 'forehand' | 'backhand' | 'movement' | 'mental'

export type Surface = 'hard' | 'clay' | 'grass'

export type SlamId = 'ao' | 'rg' | 'wimbledon' | 'uso'

export interface Attrs {
  serve: number
  return: number
  forehand: number
  backhand: number
  movement: number
  mental: number
}

export interface Player {
  id: string
  name: string
  country: string
  region: Region
  decade: Decade
  activeYears: [number, number]
  hand: 'R' | 'L'
  tour: Tour
  attrs: Attrs
  peakRank: number
}

export interface PlayersFile {
  schemaVersion: number
  players: Player[]
}

export interface Slam {
  id: SlamId
  name: string
  short: string
  surface: Surface
  emphasis: string
}

/** Un slot del tenista que se va armando: a qué atributo corresponde y de qué jugador salió. */
export interface Slot {
  attr: AttrKey
  player: Player | null
}
