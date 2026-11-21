import { Identifier } from 'deepslate/core'
import type { UV } from 'deepslate/render'
import { packAtlas, type Placement } from './atlasPacking'
import { MISSING_TEXTURE, type BakeAtlas } from './bakeStates'
import type { GameResources } from './gameResources'
import { classifyAlpha, RenderLayer } from './renderLayer'

const Id = Identifier

/**
 * Texture atlas built inside a worker (Deepslate's own atlas needs `document`).
 *
 * - Animated textures (with `.png.mcmeta`) contribute their first frame.
 * - Textures that are referenced but absent use the "missing" pattern
 *   (magenta and black, as in Minecraft), never an invented texture.
 * - Each texture's render layer is classified from its alpha channel.
 * - UVs are normalized with v pointing down (canvas order); the viewer uploads
 *   the atlas without flipping it.
 */
export interface BuiltAtlas extends BakeAtlas {
  size: number
  /** RGBA pixels, `size × size`. */
  pixels: Uint8ClampedArray
  /** Texture ids that were referenced but not found in the game files. */
  missingTextures: string[]
}

export async function buildAtlas(
  ids: Iterable<string>,
  resources: GameResources,
): Promise<BuiltAtlas> {
  const bitmaps = new Map<string, ImageBitmap>()
  const missingTextures: string[] = []

  for (const id of ids) {
    if (id === MISSING_TEXTURE) continue
    const identifier = Id.parse(id)
    const bytes = resources.getTexture(identifier)
    if (!bytes) {
      missingTextures.push(id)
      continue
    }
    try {
      bitmaps.set(id, await createImageBitmap(new Blob([bytes as BlobPart], { type: 'image/png' })))
    } catch {
      missingTextures.push(id)
    }
  }

  // Animated textures are vertical strips of square frames: keep the first.
  const frameHeight = (id: string, bitmap: ImageBitmap) =>
    resources.hasAnimation(Id.parse(id)) && bitmap.height > bitmap.width
      ? bitmap.width
      : bitmap.height

  const layout = packAtlas([
    { id: MISSING_TEXTURE, width: 16, height: 16 },
    ...[...bitmaps].map(([id, bitmap]) => ({
      id,
      width: bitmap.width,
      height: frameHeight(id, bitmap),
    })),
  ])

  const canvas = new OffscreenCanvas(layout.size, layout.size)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas is not available in this worker')
  ctx.imageSmoothingEnabled = false

  drawMissing(ctx, layout.placements.get(MISSING_TEXTURE)!)
  for (const [id, bitmap] of bitmaps) {
    const p = layout.placements.get(id)!
    ctx.drawImage(bitmap, 0, 0, p.width, p.height, p.x, p.y, p.width, p.height)
    bitmap.close()
  }

  const pixels = ctx.getImageData(0, 0, layout.size, layout.size).data
  const regions = [...layout.placements].map(([id, p]) => ({
    id,
    p,
    layer: classifyAlpha(regionPixels(pixels, layout.size, p)),
  }))
  const byId = new Map(regions.map((r) => [r.id, r]))
  const missingIds = new Set(missingTextures)
  const missingRegion = byId.get(MISSING_TEXTURE)!

  const uvOf = ({ x, y, width, height }: Placement): UV => [
    x / layout.size,
    y / layout.size,
    (x + width) / layout.size,
    (y + height) / layout.size,
  ]

  return {
    size: layout.size,
    pixels,
    missingTextures: missingTextures.sort(),
    getTextureAtlas: () => new ImageData(pixels, layout.size, layout.size),
    getTextureUV(id: Identifier) {
      const key = id.toString()
      const region = missingIds.has(key) ? missingRegion : (byId.get(key) ?? missingRegion)
      return uvOf(region.p)
    },
    getPixelSize: () => 1 / layout.size,
    layerAt(u, v) {
      const x = u * layout.size
      const y = v * layout.size
      for (const r of regions) {
        if (x >= r.p.x && x < r.p.x + r.p.width && y >= r.p.y && y < r.p.y + r.p.height)
          return r.layer
      }
      return RenderLayer.Opaque
    },
  }
}

function regionPixels(pixels: Uint8ClampedArray, size: number, p: Placement): Uint8ClampedArray {
  const out = new Uint8ClampedArray(p.width * p.height * 4)
  for (let row = 0; row < p.height; row++) {
    const start = ((p.y + row) * size + p.x) * 4
    out.set(pixels.subarray(start, start + p.width * 4), row * p.width * 4)
  }
  return out
}

/** Minecraft's missing texture: 2×2 checkerboard of magenta and black. */
function drawMissing(ctx: OffscreenCanvasRenderingContext2D, p: Placement): void {
  const half = p.width / 2
  ctx.fillStyle = '#f800f8'
  ctx.fillRect(p.x, p.y, half, half)
  ctx.fillRect(p.x + half, p.y + half, half, half)
  ctx.fillStyle = '#000000'
  ctx.fillRect(p.x + half, p.y, half, half)
  ctx.fillRect(p.x, p.y + half, half, half)
}
