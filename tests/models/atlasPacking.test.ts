import { describe, expect, it } from 'vitest'
import { packAtlas } from '../../src/lib/models/atlasPacking'
import { classifyAlpha, RenderLayer } from '../../src/lib/models/renderLayer'

describe('packAtlas', () => {
  it('packs textures without overlaps inside a power-of-two square', () => {
    const textures = [
      ...Array.from({ length: 300 }, (_, i) => ({ id: `b${i}`, width: 16, height: 16 })),
      { id: 'chest', width: 64, height: 64 },
      { id: 'bed', width: 64, height: 64 },
    ]
    const { size, placements } = packAtlas(textures)
    expect(Math.log2(size) % 1).toBe(0)
    expect(placements.size).toBe(textures.length)
    const rects = [...placements.values()]
    for (const r of rects) {
      expect(r.x + r.width).toBeLessThanOrEqual(size)
      expect(r.y + r.height).toBeLessThanOrEqual(size)
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]
        const b = rects[j]
        const overlap =
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
        expect(overlap).toBe(false)
      }
    }
  })

  it('uses the smallest size that fits', () => {
    expect(packAtlas([{ id: 'a', width: 16, height: 16 }]).size).toBe(16)
    expect(
      packAtlas(Array.from({ length: 5 }, (_, i) => ({ id: `${i}`, width: 16, height: 16 }))).size,
    ).toBe(64)
  })

  it('fails clearly when textures cannot fit', () => {
    expect(() => packAtlas([{ id: 'huge', width: 8192, height: 16 }])).toThrow(RangeError)
  })
})

describe('classifyAlpha', () => {
  const pixels = (...alphas: number[]) => alphas.flatMap((a) => [10, 20, 30, a])

  it('classifies opaque, cutout and translucent textures', () => {
    expect(classifyAlpha(pixels(255, 255, 254))).toBe(RenderLayer.Opaque)
    expect(classifyAlpha(pixels(255, 0, 255, 1))).toBe(RenderLayer.Cutout)
    expect(classifyAlpha(pixels(255, 0, 128))).toBe(RenderLayer.Translucent)
  })
})
