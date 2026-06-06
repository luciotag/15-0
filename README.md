# 15-0 · Slam Perfecto 🎾

Juego web viral de tenis inspirado en [82-0.com](https://www.82-0.com) (NBA) y
[7a0.com.br](https://7a0.com.br) (Mundial), adaptado a un deporte individual.

Armás un tenista **Frankenstein** robando un atributo a un crack distinto en cada ronda
(saque de uno, revés de otro, físico de un tercero…). Después el motor simula un Grand Slam de
7 rondas y te dice si lográs lo imposible: **ganar el título sin ceder un set**.

## Cómo correrlo

```bash
npm install
npm run data      # genera public/data/players.json desde el roster curado (etl/build_players.py)
npm run dev       # http://localhost:5173
```

Build de producción (sitio 100% estático, deploy en Vercel / Netlify / GitHub Pages):

```bash
npm run build     # -> dist/
npm run preview
```

## Cómo se juega

1. Elegís **tour** (ATP/WTA), cómo robás atributos (**asignación libre** o **por ronda**), stats
   **visibles u ocultas** ("ball knower", default oculto) y modo **libre** o **🏆 reto del día**.
2. En cada una de las **6 rondas** la tragamonedas elige una restricción `(década · región)`.
   No optimizás libre: elegís dentro del pool que te tocó.
3. **Asignación libre:** elegís un jugador y *después* qué atributo (todavía vacío) le robás —
   dilemas reales (tomás a Sampras por el saque, pero si ya tenés saque te quedás su revés flojo).
   **Por ronda:** te quedás con el atributo fijo de la ronda.
4. Al terminar elegís **en qué Slam** jugar tu tenista, viendo tu overall por cada superficie.
   Cada cancha **pinta la UI** con su material (césped, polvo, cemento) y cambia el vector de pesos.
5. Jugás el torneo **partido por partido** contra **rivales reales** cada vez más difíciles; la final
   es contra el **rey de esa superficie** (RG → Nadal/Alcaraz, Wimbledon → Federer/Sampras…).
6. Regla del "perfecto" estilo 82-0: si **algún atributo queda por debajo de 60**, el récord perfecto
   se vuelve casi imposible aunque tu promedio sea alto.
7. Card compartible (PNG descargable, con la textura de la cancha) y récords guardados localmente.

## Arquitectura

```
etl/build_players.py   ETL: roster curado -> public/data/players.json (ver nota de datos)
etl/overrides.csv      ajustes manuales de atributos (curaduría editorial)
public/data/players.json   output del ETL (lo consume el front; NO se leen CSV en runtime)
src/engine/ratings.ts  pesos por superficie, sigmoid, piso (FLOOR), overall
src/engine/simulate.ts motor de Slam de 7 rondas (RNG sembrado para compartir runs)
src/game/draft.ts      randomizador década/región, pools, dedupe de jugadores
src/game/types.ts      tipos
src/components/*        SlotMachine, PlayerGrid, BuilderPanel, RadarChart, SimulationView, ResultCard
src/App.tsx            máquina de estados de pantallas
```

### Pesos por superficie (`src/engine/ratings.ts`)

| Atributo  | Dura | Polvo | Césped |
|-----------|------|-------|--------|
| serve     | 0.22 | 0.12  | 0.30   |
| return    | 0.16 | 0.22  | 0.12   |
| forehand  | 0.18 | 0.18  | 0.16   |
| backhand  | 0.14 | 0.16  | 0.12   |
| movement  | 0.16 | 0.24  | 0.12   |
| mental    | 0.14 | 0.08  | 0.18   |

Todo está parametrizado para re-tunear (pesos, `FLOOR`, dificultad de rivales en `simulate.ts`).

## Nota sobre los datos (importante)

En esta versión los **atributos 0–100 están curados editorialmente a mano** (en `etl/build_players.py`),
basados en el estilo/era de cada tenista. Esto hace al juego jugable al instante sin descargar gigas de CSV.

El pipeline está preparado para enchufar la **data real de Jeff Sackmann / Tennis Abstract** (ver §5 del
spec y el docstring de `build_players.py`): clonás `tennis_atp` / `tennis_wta` / `MatchChartingProject`
en `data_raw/`, derivás `serve` / `return` / `mental` de las stats de partido (sumando columnas `w_*`/`l_*`
por jugador) y normalizás por **percentil** dentro del pool. `forehand` / `backhand` / `movement` no están
en los match CSV: salen del Match Charting Project o de la baseline curada.

## Licencia de datos

> **Datos de tenis: Jeff Sackmann / Tennis Abstract (github.com/JeffSackmann) — CC BY-NC-SA 4.0.
> Uso NO comercial.** Atribución obligatoria. No desplegar una versión comercial/monetizada con estos
> datos sin cambiar de fuente o conseguir permiso.
