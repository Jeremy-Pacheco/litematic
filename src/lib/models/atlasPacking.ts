/**
 * Shelf packing of textures into a square, power-of-two atlas.
 *
 * Textures are sorted by height and placed left to right in rows ("shelves").
 * Block textures are mostly 16×16, entity textures (chests, beds…) are
 * larger; shelf packing wastes little with such uniform sizes and is simple
 * and predictable.
 */

export interface TextureSize {
  id: string
  width: number
  height: number
}

export interface Placement {
  x: number
  y: number
  width: number
  height: number
}

export interface AtlasLayout {
  /** Atlas side in pixels (power of two). */
  size: number
  placements: Map<string, Placement>
}

/** Widely supported WebGL texture size limit. */
export const MAX_ATLAS_SIZE = 4096

export function packAtlas(textures: readonly TextureSize[], maxSize = MAX_ATLAS_SIZE): AtlasLayout {
  const sorted = [...textures].sort(
    (a, b) => b.height - a.height || b.width - a.width || a.id.localeCompare(b.id),
  )
  const area = sorted.reduce((sum, t) => sum + t.width * t.height, 0)
  const widest = sorted.reduce((max, t) => Math.max(max, t.width, t.height), 1)
  let size = 16
  while (size * size < area || size < widest) size *= 2

  for (; size <= maxSize; size *= 2) {
    const placements = tryPack(sorted, size)
    if (placements) return { size, placements }
  }
  throw new RangeError(`Textures do not fit in a ${maxSize}×${maxSize} atlas`)
}

function tryPack(sorted: readonly TextureSize[], size: number): Map<string, Placement> | null {
  const placements = new Map<string, Placement>()
  let x = 0
  let y = 0
  let shelfHeight = 0
  for (const t of sorted) {
    if (x + t.width > size) {
      x = 0
      y += shelfHeight
      shelfHeight = 0
    }
    if (y + t.height > size) return null
    placements.set(t.id, { x, y, width: t.width, height: t.height })
    x += t.width
    shelfHeight = Math.max(shelfHeight, t.height)
  }
  return placements
}
