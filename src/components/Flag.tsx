import { iso2Of } from '../game/labels'

interface Props {
  /** Código IOC de 3 letras (ej. ARG, ESP, USA). */
  code: string
  className?: string
}

/**
 * Bandera del país como imagen real (flagcdn, SVG nítido) — funciona en TODOS los
 * dispositivos, incluido Windows (donde los emojis de bandera no se renderizan).
 * Escala con el tamaño del texto que la rodea.
 */
export default function Flag({ code, className = '' }: Props) {
  const iso = iso2Of(code)
  if (!iso) return <span className={className}>🎾</span>
  return (
    <img
      src={`https://flagcdn.com/${iso}.svg`}
      alt={code}
      title={code}
      loading="lazy"
      className={`inline-block rounded-[2px] ring-1 ring-black/25 ${className}`}
      style={{ height: '0.95em', width: 'auto', verticalAlign: '-0.13em' }}
    />
  )
}
