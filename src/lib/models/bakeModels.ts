import type { BlockState } from '../types/structure'
import { buildAtlas } from './atlas'
import { bakePalette, collectTextureIds, type BakedState } from './bakeStates'
import { GameResources } from './gameResources'

/** Everything the viewer needs to draw a structure's palette. */
export interface BakedModels {
  /** One entry per palette index. */
  states: BakedState[]
  atlas: { size: number; pixels: Uint8ClampedArray }
  /** Block ids without a model (drawn with the missing texture). */
  missingBlocks: string[]
  /** Textures referenced but absent from the game files. */
  missingTextures: string[]
  durationMs: number
}

/**
 * Full bake for a palette: find the textures it uses, build the atlas, then
 * bake every state. Runs in the models worker (needs OffscreenCanvas).
 */
export async function bakeModels(
  palette: readonly BlockState[],
  files: ReadonlyMap<string, Uint8Array>,
): Promise<BakedModels> {
  const start = performance.now()
  const resources = new GameResources(files)
  const atlas = await buildAtlas(collectTextureIds(palette, resources), resources)
  const { states, missingBlocks } = bakePalette(palette, resources, atlas)
  return {
    states,
    atlas: { size: atlas.size, pixels: atlas.pixels },
    missingBlocks,
    missingTextures: atlas.missingTextures,
    durationMs: Math.round(performance.now() - start),
  }
}

/** Buffers to transfer (not copy) when posting baked models between threads. */
export function bakedTransferables(models: BakedModels): ArrayBuffer[] {
  const buffers: ArrayBuffer[] = [models.atlas.pixels.buffer as ArrayBuffer]
  for (const state of models.states) {
    for (const groups of state.geometry) {
      for (const g of groups) {
        if (g) {
          buffers.push(
            g.positions.buffer as ArrayBuffer,
            g.uvs.buffer as ArrayBuffer,
            g.colors.buffer as ArrayBuffer,
            g.normals.buffer as ArrayBuffer,
          )
        }
      }
    }
  }
  return buffers
}
