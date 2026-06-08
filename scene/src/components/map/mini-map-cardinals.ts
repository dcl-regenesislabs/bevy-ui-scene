import { type Coords } from '@dcl/sdk/ecs'

type CardinalPositions = {
  N: { x: number; y: number }
  E: { x: number; y: number }
  S: { x: number; y: number }
  W: { x: number; y: number }
}

/**
 * Devuelve las posiciones de N,E,S,W en píxeles dentro de un minimapa cuadrado
 * centrado, dado su tamaño y el ángulo de rotación (en grados).
 *
 * @param size Tamaño del minimapa en px (width === height)
 * @param rotationDeg Rotación del minimapa en grados (0 = norte hacia arriba, sentido horario positivo)
 * @param margin Margen interior desde el borde donde colocar las etiquetas (px)
 */
export function getCardinalLabelPositions(
  size: number,
  rotationDeg: number,
  margin = 8
): CardinalPositions {
  const half = size / 2
  const radius = half - margin

  const cx = half
  const cy = half

  // convertir grados a radianes
  const theta = (rotationDeg * Math.PI) / 180

  const rotate = (x: number, y: number, angleRad: number): Coords => {
    const c = Math.cos(angleRad)
    const s = Math.sin(angleRad)
    return { x: x * c - y * s, y: x * s + y * c }
  }

  const toCircleEdge = (dx: number, dy: number): Coords => ({
    x: cx + dx * radius,
    y: cy + dy * radius
  })

  const base = {
    N: { x: 0, y: -1 },
    E: { x: 1, y: 0 },
    S: { x: 0, y: 1 },
    W: { x: -1, y: 0 }
  } as const

  const Ndir = rotate(base.N.x, base.N.y, theta)
  const Edir = rotate(base.E.x, base.E.y, theta)
  const Sdir = rotate(base.S.x, base.S.y, theta)
  const Wdir = rotate(base.W.x, base.W.y, theta)

  return {
    N: toCircleEdge(Ndir.x, Ndir.y),
    E: toCircleEdge(Edir.x, Edir.y),
    S: toCircleEdge(Sdir.x, Sdir.y),
    W: toCircleEdge(Wdir.x, Wdir.y)
  }
}
