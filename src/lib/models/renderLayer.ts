/**
 * How a texture (and the faces that use it) must be drawn. Minecraft decides
 * this in code, not in the resource files, so it is derived from the texture's
 * alpha channel:
 *
 * - `opaque`: no transparent pixel (stone, planks).
 * - `cutout`: only fully transparent or fully opaque pixels (leaves, flowers,
 *   glass, doors): drawn with alpha test, no blending.
 * - `translucent`: some partially transparent pixel (stained glass, ice,
 *   water, slime): drawn blended, after the rest.
 */
export const RenderLayer = {
  Opaque: 0,
  Cutout: 1,
  Translucent: 2,
} as const

export type RenderLayer = (typeof RenderLayer)[keyof typeof RenderLayer]

export const RENDER_LAYERS: readonly RenderLayer[] = [
  RenderLayer.Opaque,
  RenderLayer.Cutout,
  RenderLayer.Translucent,
]

/**
 * Classifies RGBA pixels. Alpha values within `tolerance` of 0 or 255 count
 * as fully transparent/opaque, which absorbs compression noise in some PNGs.
 */
export function classifyAlpha(rgba: ArrayLike<number>, tolerance = 2): RenderLayer {
  let transparent = false
  for (let i = 3; i < rgba.length; i += 4) {
    const a = rgba[i]
    if (a >= 255 - tolerance) continue
    if (a <= tolerance) transparent = true
    else return RenderLayer.Translucent
  }
  return transparent ? RenderLayer.Cutout : RenderLayer.Opaque
}
