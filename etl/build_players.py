#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
15-0 · Slam Perfecto — ETL de jugadores -> public/data/players.json

ESTADO (v1):
  Este script emite players.json a partir de una TABLA CURADA editorialmente
  (roster de abajo). Los atributos 0-100 son una calibración a mano basada en el
  estilo/era de cada tenista. Es la fuente de verdad para el prototipo y es lo que
  hace al juego inmediatamente jugable, sin descargar gigas de CSV.

COMO ENCHUFAR LA DATA REAL DE SACKMANN (siguiente fase, ver §5 del spec):
  1) Cloná los repos en data_raw/:
       git clone https://github.com/JeffSackmann/tennis_atp data_raw/tennis_atp
       git clone https://github.com/JeffSackmann/tennis_wta data_raw/tennis_wta
       git clone https://github.com/JeffSackmann/tennis_MatchChartingProject data_raw/mcp
  2) Implementá derive_from_sackmann() (esqueleto documentado más abajo):
       - serve_raw  = z(ace_rate)+z(first_won%)+z(second_won%)+z(hold%)
       - return_raw = z(return_pts_won%)+z(break%)
       - mental_raw = z(bpSaved%)+z(tb_win%)+z(final_win%)
       - forehand/backhand/movement/net: NO están en los match CSVs ->
         salen del Match Charting Project o de la baseline curada por estilo.
       - normalizar a 0-100 por PERCENTIL dentro del pool (rank-based).
  3) overrides.csv pisa atributos puntuales para leyendas pre-data-era.

Uso:
    python etl/build_players.py
Salida:
    public/data/players.json

Datos de tenis: Jeff Sackmann / Tennis Abstract (github.com/JeffSackmann) — CC BY-NC-SA 4.0. Uso no comercial.
"""

import csv
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "players.json"
OVERRIDES = ROOT / "etl" / "overrides.csv"

# Atributos en orden de ronda: serve, return, forehand, backhand, movement, mental
ATTR_KEYS = ["serve", "return", "forehand", "backhand", "movement", "mental"]

# ---------------------------------------------------------------------------
# ROSTER CURADO
# (nombre, país IOC, región, década, (desde, hasta), mano, peakRank,
#  [serve, return, forehand, backhand, movement, mental])
# ---------------------------------------------------------------------------

ATP = [
    # --- 1960s / 1970s ---
    ("Rod Laver",        "AUS", "oceania",       "1960s", (1962, 1976), "L", 1, [82, 85, 90, 86, 88, 95]),
    ("Ken Rosewall",     "AUS", "oceania",       "1960s", (1956, 1977), "R", 1, [70, 88, 80, 92, 85, 92]),
    ("Roy Emerson",      "AUS", "oceania",       "1960s", (1961, 1973), "R", 1, [84, 80, 82, 78, 84, 86]),
    ("John Newcombe",    "AUS", "oceania",       "1970s", (1965, 1981), "R", 1, [88, 75, 84, 76, 80, 86]),
    ("Björn Borg",       "SWE", "europe",        "1970s", (1973, 1983), "R", 1, [84, 86, 90, 88, 95, 96]),
    ("Jimmy Connors",    "USA", "north_america", "1970s", (1972, 1992), "L", 1, [76, 92, 86, 90, 88, 94]),
    ("Ilie Nastase",     "ROU", "europe",        "1970s", (1969, 1981), "R", 1, [78, 85, 86, 82, 90, 68]),
    ("Guillermo Vilas",  "ARG", "south_america", "1970s", (1973, 1989), "L", 2, [78, 84, 88, 84, 88, 90]),
    ("Arthur Ashe",      "USA", "north_america", "1970s", (1968, 1980), "R", 2, [86, 80, 82, 80, 82, 88]),
    ("Stan Smith",       "USA", "north_america", "1970s", (1968, 1980), "R", 1, [85, 78, 80, 76, 78, 82]),
    ("Adriano Panatta",  "ITA", "europe",        "1970s", (1970, 1983), "R", 4, [80, 80, 86, 80, 84, 78]),
    ("Manuel Orantes",   "ESP", "europe",        "1970s", (1969, 1982), "L", 2, [74, 86, 82, 84, 86, 84]),
    # --- 1980s ---
    ("John McEnroe",     "USA", "north_america", "1980s", (1978, 1992), "L", 1, [86, 88, 84, 82, 86, 82]),
    ("Ivan Lendl",       "CZE", "europe",        "1980s", (1980, 1994), "R", 1, [88, 84, 92, 80, 82, 88]),
    ("Mats Wilander",    "SWE", "europe",        "1980s", (1981, 1996), "R", 1, [76, 88, 84, 88, 90, 92]),
    ("Stefan Edberg",    "SWE", "europe",        "1980s", (1983, 1996), "R", 1, [88, 82, 78, 86, 90, 86]),
    ("Boris Becker",     "GER", "europe",        "1980s", (1984, 1999), "R", 1, [94, 80, 88, 80, 80, 86]),
    ("Yannick Noah",     "FRA", "europe",        "1980s", (1977, 1996), "R", 3, [86, 78, 86, 76, 86, 80]),
    ("Pat Cash",         "AUS", "oceania",       "1980s", (1982, 1997), "R", 4, [86, 78, 80, 78, 84, 80]),
    ("Andrés Gómez",     "ECU", "south_america", "1980s", (1980, 1995), "L", 4, [82, 80, 86, 78, 80, 80]),
    ("José Luis Clerc",  "ARG", "south_america", "1980s", (1977, 1988), "R", 4, [78, 84, 86, 80, 86, 80]),
    # --- 1990s ---
    ("Pete Sampras",     "USA", "north_america", "1990s", (1988, 2002), "R", 1, [98, 72, 90, 78, 86, 92]),
    ("Andre Agassi",     "USA", "north_america", "1990s", (1986, 2006), "R", 1, [78, 95, 92, 88, 84, 84]),
    ("Goran Ivanisevic", "CRO", "europe",        "1990s", (1988, 2004), "L", 2, [99, 64, 80, 72, 74, 72]),
    ("Jim Courier",      "USA", "north_america", "1990s", (1988, 2000), "R", 1, [80, 82, 92, 78, 82, 86]),
    ("Michael Chang",    "USA", "north_america", "1990s", (1988, 2003), "R", 2, [72, 88, 84, 82, 94, 90]),
    ("Yevgeny Kafelnikov","RUS", "europe",       "1990s", (1992, 2003), "R", 1, [82, 86, 84, 86, 84, 78]),
    ("Patrick Rafter",   "AUS", "oceania",       "1990s", (1991, 2001), "R", 1, [88, 80, 82, 76, 86, 84]),
    ("Marcelo Ríos",     "CHI", "south_america", "1990s", (1994, 2004), "L", 1, [76, 88, 90, 88, 92, 76]),
    ("Thomas Muster",    "AUT", "europe",        "1990s", (1985, 1999), "L", 1, [80, 84, 92, 78, 88, 90]),
    ("Wayne Ferreira",   "RSA", "africa",        "1990s", (1989, 2005), "R", 6, [84, 80, 84, 80, 82, 76]),
    ("Sergi Bruguera",   "ESP", "europe",        "1990s", (1988, 2002), "R", 3, [78, 84, 90, 78, 90, 84]),
    ("Carlos Moyá",      "ESP", "europe",        "1990s", (1995, 2010), "R", 1, [84, 80, 90, 76, 84, 80]),
    # --- 2000s ---
    ("Roger Federer",    "SUI", "europe",        "2000s", (1998, 2022), "R", 1, [92, 84, 97, 84, 94, 92]),
    ("Rafael Nadal",     "ESP", "europe",        "2000s", (2001, 2024), "L", 1, [84, 92, 97, 86, 96, 98]),
    ("Andy Roddick",     "USA", "north_america", "2000s", (2000, 2012), "R", 1, [97, 74, 88, 74, 78, 82]),
    ("Lleyton Hewitt",   "AUS", "oceania",       "2000s", (1998, 2016), "R", 1, [78, 90, 82, 84, 94, 92]),
    ("David Nalbandian", "ARG", "south_america", "2000s", (2000, 2013), "R", 3, [80, 88, 88, 92, 82, 80]),
    ("Marat Safin",      "RUS", "europe",        "2000s", (1997, 2009), "R", 1, [90, 86, 90, 88, 82, 72]),
    ("Juan Carlos Ferrero","ESP", "europe",      "2000s", (1998, 2012), "R", 1, [80, 84, 90, 80, 90, 84]),
    ("Gustavo Kuerten",  "BRA", "south_america", "2000s", (1995, 2008), "R", 1, [84, 82, 92, 86, 86, 86]),
    ("Fernando González","CHI", "south_america", "2000s", (1999, 2012), "R", 5, [84, 78, 96, 70, 80, 78]),
    ("Gastón Gaudio",    "ARG", "south_america", "2000s", (1999, 2011), "R", 5, [74, 82, 86, 88, 84, 76]),
    ("Guillermo Coria",  "ARG", "south_america", "2000s", (2000, 2009), "R", 3, [72, 88, 86, 84, 94, 70]),
    ("Nikolay Davydenko","RUS", "europe",        "2000s", (1999, 2014), "R", 3, [76, 86, 88, 86, 86, 78]),
    # --- 2010s ---
    ("Novak Djokovic",   "SRB", "europe",        "2010s", (2003, 2024), "R", 1, [86, 97, 92, 96, 97, 97]),
    ("Andy Murray",      "GBR", "europe",        "2010s", (2005, 2024), "R", 1, [84, 92, 84, 90, 92, 88]),
    ("Stan Wawrinka",    "SUI", "europe",        "2010s", (2002, 2024), "R", 3, [86, 82, 90, 95, 80, 86]),
    ("Juan Martín del Potro","ARG","south_america","2010s",(2005, 2022), "R", 3, [90, 82, 96, 78, 76, 84]),
    ("David Ferrer",     "ESP", "europe",        "2010s", (2000, 2019), "R", 3, [74, 86, 84, 82, 92, 90]),
    ("Tomáš Berdych",    "CZE", "europe",        "2010s", (2002, 2019), "R", 4, [88, 78, 88, 82, 78, 76]),
    ("Jo-Wilfried Tsonga","FRA", "europe",       "2010s", (2004, 2022), "R", 5, [90, 78, 90, 76, 82, 80]),
    ("Milos Raonic",     "CAN", "north_america", "2010s", (2008, 2023), "R", 3, [97, 70, 86, 74, 72, 78]),
    ("Kei Nishikori",    "JPN", "asia",          "2010s", (2007, 2024), "R", 4, [76, 88, 88, 88, 88, 80]),
    ("Marin Čilić",      "CRO", "europe",        "2010s", (2005, 2023), "R", 3, [92, 78, 86, 82, 78, 78]),
    ("Grigor Dimitrov",  "BUL", "europe",        "2010s", (2008, 2024), "R", 3, [84, 80, 86, 82, 88, 76]),
    ("Kevin Anderson",   "RSA", "africa",        "2010s", (2007, 2022), "R", 5, [95, 74, 84, 78, 72, 78]),
    ("Gaël Monfils",     "FRA", "europe",        "2010s", (2004, 2024), "R", 6, [86, 84, 84, 80, 96, 72]),
    ("Nick Kyrgios",     "AUS", "oceania",       "2010s", (2013, 2023), "R", 13, [95, 78, 86, 80, 82, 64]),
    ("John Isner",       "USA", "north_america", "2010s", (2007, 2023), "R", 8, [99, 62, 84, 72, 64, 78]),
    # --- 2020s ---
    ("Carlos Alcaraz",   "ESP", "europe",        "2020s", (2020, 2025), "R", 1, [86, 88, 95, 86, 96, 90]),
    ("Jannik Sinner",    "ITA", "europe",        "2020s", (2019, 2025), "R", 1, [86, 90, 93, 92, 90, 90]),
    ("Daniil Medvedev",  "RUS", "europe",        "2020s", (2016, 2025), "R", 1, [88, 92, 82, 86, 90, 84]),
    ("Alexander Zverev",  "GER", "europe",       "2020s", (2016, 2025), "R", 2, [90, 84, 86, 88, 84, 76]),
    ("Stefanos Tsitsipas","GRE", "europe",       "2020s", (2018, 2025), "R", 3, [86, 80, 90, 80, 84, 80]),
    ("Dominic Thiem",    "AUT", "europe",        "2020s", (2014, 2024), "R", 3, [86, 82, 92, 88, 82, 82]),
    ("Casper Ruud",      "NOR", "europe",        "2020s", (2017, 2025), "R", 2, [82, 82, 88, 80, 86, 84]),
    ("Diego Schwartzman","ARG", "south_america", "2020s", (2011, 2024), "R", 8, [64, 88, 84, 82, 92, 82]),
    ("Taylor Fritz",     "USA", "north_america", "2020s", (2015, 2025), "R", 4, [90, 80, 88, 82, 82, 80]),
    ("Frances Tiafoe",   "USA", "north_america", "2020s", (2015, 2025), "R", 10, [86, 82, 86, 80, 88, 80]),
    ("Alex de Minaur",   "AUS", "oceania",       "2020s", (2017, 2025), "R", 6, [78, 86, 82, 82, 94, 84]),
    ("Hubert Hurkacz",   "POL", "europe",        "2020s", (2016, 2025), "R", 6, [94, 74, 86, 78, 78, 78]),
    # --- ESPECIALISTAS CON HUECOS (para que la asignación libre y el piso=60 generen dilemas) ---
    ("Ivo Karlović",     "CRO", "europe",        "2000s", (2000, 2018), "R", 14, [99, 55, 76, 64, 56, 72]),
    ("Reilly Opelka",    "USA", "north_america", "2020s", (2015, 2024), "R", 17, [98, 58, 80, 66, 56, 64]),
    ("Sam Querrey",      "USA", "north_america", "2010s", (2006, 2023), "R", 11, [92, 64, 84, 70, 66, 72]),
    ("Feliciano López",  "ESP", "europe",        "2010s", (1998, 2022), "L", 12, [90, 66, 78, 66, 76, 74]),
    ("Gilles Simon",     "FRA", "europe",        "2010s", (2005, 2022), "R", 6, [64, 84, 76, 82, 88, 80]),
    ("Fabio Fognini",    "ITA", "europe",        "2010s", (2007, 2024), "R", 9, [74, 82, 88, 82, 80, 56]),
    ("Richard Gasquet",  "FRA", "europe",        "2010s", (2002, 2024), "R", 7, [80, 80, 78, 93, 80, 64]),
    ("Ernests Gulbis",   "LAT", "europe",        "2010s", (2006, 2020), "R", 10, [86, 72, 88, 72, 72, 52]),
    ("Jack Sock",        "USA", "north_america", "2010s", (2011, 2023), "R", 8, [86, 70, 91, 58, 72, 64]),
    ("Nicolás Almagro",  "ESP", "europe",        "2010s", (2003, 2018), "R", 9, [82, 74, 89, 80, 76, 60]),
    ("Mikhail Youzhny",  "RUS", "europe",        "2000s", (1999, 2018), "R", 8, [76, 82, 80, 87, 82, 72]),
    ("Tommy Robredo",    "ESP", "europe",        "2000s", (1998, 2019), "R", 5, [76, 80, 86, 80, 84, 82]),
    ("Dustin Brown",     "GER", "europe",        "2010s", (2004, 2020), "R", 64, [88, 62, 82, 66, 80, 56]),
    ("Benoît Paire",     "FRA", "europe",        "2010s", (2008, 2023), "R", 18, [80, 74, 84, 80, 72, 48]),
]

WTA = [
    # --- 1970s / 1980s ---
    ("Billie Jean King", "USA", "north_america", "1970s", (1968, 1983), "R", 1, [80, 82, 80, 80, 84, 92]),
    ("Chris Evert",      "USA", "north_america", "1970s", (1972, 1989), "R", 1, [70, 88, 84, 92, 84, 96]),
    ("Tracy Austin",     "USA", "north_america", "1970s", (1977, 1983), "R", 1, [74, 88, 82, 86, 86, 88]),
    ("Evonne Goolagong", "AUS", "oceania",       "1970s", (1970, 1983), "R", 1, [78, 82, 86, 82, 92, 82]),
    ("Margaret Court",   "AUS", "oceania",       "1970s", (1960, 1977), "R", 1, [84, 84, 86, 82, 84, 90]),
    ("Kerry Reid",       "AUS", "oceania",       "1970s", (1967, 1985), "R", 5, [78, 80, 82, 80, 82, 80]),
    ("Martina Navratilova","USA","north_america","1980s", (1975, 1994), "L", 1, [90, 84, 88, 84, 92, 92]),
    ("Hana Mandlíková",  "CZE", "europe",        "1980s", (1978, 1990), "R", 3, [82, 82, 86, 82, 88, 78]),
    # --- 1990s ---
    ("Steffi Graf",      "GER", "europe",        "1990s", (1982, 1999), "R", 1, [86, 86, 96, 78, 94, 94]),
    ("Monica Seles",     "YUG", "europe",        "1990s", (1989, 2003), "L", 1, [80, 92, 92, 92, 82, 90]),
    ("Gabriela Sabatini","ARG", "south_america", "1990s", (1985, 1996), "R", 3, [82, 84, 88, 80, 86, 82]),
    ("Arantxa Sánchez Vicario","ESP","europe",   "1990s", (1986, 2002), "R", 1, [74, 90, 82, 84, 94, 90]),
    ("Martina Hingis",   "SUI", "europe",        "1990s", (1994, 2007), "R", 1, [74, 88, 82, 84, 90, 88]),
    ("Jana Novotná",     "CZE", "europe",        "1990s", (1987, 1999), "R", 2, [86, 80, 82, 80, 88, 74]),
    # --- 2000s ---
    ("Serena Williams",  "USA", "north_america", "2000s", (1998, 2022), "R", 1, [96, 88, 92, 88, 86, 96]),
    ("Venus Williams",   "USA", "north_america", "2000s", (1997, 2024), "R", 1, [94, 82, 88, 82, 88, 84]),
    ("Justine Henin",    "BEL", "europe",        "2000s", (1999, 2011), "R", 1, [80, 88, 90, 94, 92, 92]),
    ("Kim Clijsters",    "BEL", "europe",        "2000s", (1999, 2012), "R", 1, [84, 86, 88, 84, 92, 84]),
    ("Amélie Mauresmo",  "FRA", "europe",        "2000s", (1999, 2009), "R", 1, [82, 80, 88, 86, 84, 76]),
    ("Lindsay Davenport","USA", "north_america", "2000s", (1993, 2008), "R", 1, [90, 82, 88, 84, 74, 82]),
    ("Jennifer Capriati","USA", "north_america", "2000s", (1990, 2004), "R", 1, [82, 86, 88, 84, 82, 80]),
    ("Svetlana Kuznetsova","RUS","europe",       "2000s", (2000, 2021), "R", 2, [84, 86, 88, 84, 88, 80]),
    # --- 2010s ---
    ("Maria Sharapova",  "RUS", "europe",        "2010s", (2001, 2020), "R", 1, [88, 84, 88, 86, 78, 92]),
    ("Victoria Azarenka","BLR", "europe",        "2010s", (2003, 2024), "R", 1, [82, 88, 86, 88, 86, 84]),
    ("Petra Kvitová",    "CZE", "europe",        "2010s", (2006, 2024), "L", 2, [90, 80, 92, 84, 78, 78]),
    ("Simona Halep",     "ROU", "europe",        "2010s", (2008, 2024), "R", 1, [76, 90, 86, 86, 92, 82]),
    ("Caroline Wozniacki","DEN","europe",        "2010s", (2005, 2023), "R", 1, [76, 88, 80, 84, 92, 84]),
    ("Angelique Kerber", "GER", "europe",        "2010s", (2003, 2024), "L", 1, [78, 88, 82, 86, 92, 86]),
    ("Garbiñe Muguruza", "ESP", "europe",        "2010s", (2012, 2023), "R", 1, [84, 82, 88, 84, 82, 80]),
    ("Li Na",            "CHN", "asia",          "2010s", (2008, 2014), "R", 2, [82, 84, 88, 86, 84, 82]),
    # --- 2020s ---
    ("Iga Świątek",      "POL", "europe",        "2020s", (2019, 2025), "R", 1, [82, 90, 94, 86, 92, 88]),
    ("Aryna Sabalenka",  "BLR", "europe",        "2020s", (2018, 2025), "R", 1, [90, 84, 92, 86, 80, 80]),
    ("Naomi Osaka",      "JPN", "asia",          "2020s", (2016, 2025), "R", 1, [92, 84, 92, 84, 82, 80]),
    ("Ashleigh Barty",   "AUS", "oceania",       "2020s", (2016, 2022), "R", 1, [84, 86, 88, 84, 90, 90]),
    ("Coco Gauff",       "USA", "north_america", "2020s", (2019, 2025), "R", 2, [84, 88, 82, 86, 92, 84]),
    ("Madison Keys",     "USA", "north_america", "2020s", (2014, 2025), "R", 7, [90, 80, 92, 82, 82, 78]),
    ("Elena Rybakina",   "KAZ", "asia",          "2020s", (2019, 2025), "R", 3, [92, 80, 90, 84, 82, 82]),
    ("Zheng Qinwen",     "CHN", "asia",          "2020s", (2021, 2025), "R", 5, [88, 82, 90, 82, 84, 82]),
    ("Jessica Pegula",   "USA", "north_america", "2020s", (2019, 2025), "R", 3, [80, 86, 86, 84, 84, 82]),
    ("Barbora Krejčíková","CZE", "europe",       "2020s", (2018, 2025), "R", 2, [80, 86, 86, 86, 84, 86]),
    ("Marketa Vondrousova","CZE", "europe",      "2020s", (2017, 2025), "L", 6, [80, 84, 86, 84, 88, 82]),
    # --- ESPECIALISTAS CON HUECOS ---
    ("Sabine Lisicki",   "GER", "europe",        "2010s", (2008, 2020), "R", 12, [92, 66, 82, 72, 68, 56]),
    ("Karolína Plíšková","CZE", "europe",        "2010s", (2013, 2024), "R", 1, [92, 74, 86, 82, 70, 64]),
    ("Sara Errani",      "ITA", "europe",        "2010s", (2007, 2024), "R", 5, [58, 86, 78, 80, 90, 80]),
    ("Dominika Cibulková","SVK", "europe",       "2010s", (2008, 2019), "R", 4, [74, 84, 86, 80, 88, 70]),
    ("Jeļena Ostapenko", "LAT", "europe",        "2010s", (2015, 2025), "R", 5, [84, 74, 92, 84, 70, 50]),
    ("CoCo Vandeweghe",  "USA", "north_america", "2010s", (2008, 2021), "R", 9, [88, 70, 86, 76, 70, 62]),
    ("Anett Kontaveit",  "EST", "europe",        "2020s", (2015, 2023), "R", 2, [82, 80, 86, 80, 78, 68]),
]


def slug(name: str) -> str:
    repl = (("á", "a"), ("é", "e"), ("í", "i"), ("ó", "o"), ("ú", "u"),
            ("ñ", "n"), ("č", "c"), ("š", "s"), ("ž", "z"), ("ć", "c"),
            ("ı", "i"), ("ý", "y"), ("ü", "u"), ("ö", "o"))
    s = name.lower()
    for a, b in repl:
        s = s.replace(a, b)
    parts = s.replace(".", "").replace("'", "").split()
    return "_".join(parts)


def build_rows(rows, tour):
    out = []
    for (name, country, region, decade, years, hand, peak, attrs) in rows:
        out.append({
            "id": f"{slug(name)}_{tour}",
            "name": name,
            "country": country,
            "region": region,
            "decade": decade,
            "activeYears": [years[0], years[1]],
            "hand": hand,
            "tour": tour,
            "attrs": {k: int(v) for k, v in zip(ATTR_KEYS, attrs)},
            "peakRank": peak,
        })
    return out


def apply_overrides(players):
    """overrides.csv: id,attr,value  -> pisa atributos puntuales (curaduría)."""
    if not OVERRIDES.exists():
        return players
    by_id = {p["id"]: p for p in players}
    with open(OVERRIDES, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = (row.get("id") or "").strip()
            attr = (row.get("attr") or "").strip()
            val = (row.get("value") or "").strip()
            if pid in by_id and attr in ATTR_KEYS and val:
                by_id[pid]["attrs"][attr] = max(0, min(100, int(val)))
                print(f"  override: {pid}.{attr} = {val}")
    return players


def main():
    players = build_rows(ATP, "atp") + build_rows(WTA, "wta")
    players = apply_overrides(players)

    # validación de cobertura: cada (tour, década, región) debería tener >=3
    from collections import Counter
    combos = Counter((p["tour"], p["decade"], p["region"]) for p in players)
    thin = {k: c for k, c in combos.items() if c < 3}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"schemaVersion": 1, "players": players}, f,
                  ensure_ascii=False, indent=2)

    atp_n = sum(1 for p in players if p["tour"] == "atp")
    wta_n = sum(1 for p in players if p["tour"] == "wta")
    print(f"OK -> {OUT}")
    print(f"   {len(players)} jugadores ({atp_n} ATP, {wta_n} WTA)")
    print(f"   combos jugables (>=3): {sum(1 for c in combos.values() if c >= 3)}")
    if thin:
        print(f"   nota: {len(thin)} combos finos (<3) no se ofrecerán en la tragamonedas.")


if __name__ == "__main__":
    main()
