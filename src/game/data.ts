import type { PlayersFile, Player } from './types'

export async function loadPlayers(): Promise<Player[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/players.json`)
  if (!res.ok) throw new Error(`No se pudo cargar players.json (${res.status})`)
  const data: PlayersFile = await res.json()
  return data.players
}
