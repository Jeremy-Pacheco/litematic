import { BlockState as DsBlockState, Identifier } from 'deepslate/core'
import {
  BlockModel,
  Mesh,
  SpecialRenderers,
  type Quad,
  type TextureAtlasProvider,
} from 'deepslate/render'
import { isAirId } from '../parsers/blockState'
import type { BlockState } from '../types/structure'
import type { GameResources } from './gameResources'
import { RENDER_LAYERS, RenderLayer } from './renderLayer'

/**
 * "Bakes" each state of a structure palette into ready-to-mesh geometry:
 * quads in block space (0–1), grouped by render layer and by the side of the
 * block they lie on, so the mesher can drop the faces hidden by a neighbor
 * without looking at models again. Done once per palette state, not per block.
 */

/** Sides in group order. Group 6 holds faces that are never culled. */
export const FACES = ['up', 'down', 'north', 'south', 'east', 'west'] as const
export type Face = (typeof FACES)[number]
export const INNER_GROUP = 6
export const GROUP_COUNT = 7

/** Texture id used for blocks without a model or with a missing texture. */
export const MISSING_TEXTURE = 'litematicviewer:missing'

/** An atlas the baker can query: UVs (deepslate interface) and render layers. */
export interface BakeAtlas extends TextureAtlasProvider {
  /** Render layer of the texture at normalized atlas coordinates. */
  layerAt(u: number, v: number): RenderLayer
}

/** Flat vertex data of a group of quads (4 vertices per quad). */
export interface QuadGeometry {
  quadCount: number
  /** xyz per vertex, block space 0–1. */
  positions: Float32Array
  /** uv per vertex, normalized atlas coordinates (v pointing down). */
  uvs: Float32Array
  /** rgb tint per vertex (1,1,1 when untinted). */
  colors: Float32Array
  /** xyz normal per vertex. */
  normals: Float32Array
}

export interface BakedState {
  /** `geometry[layer][group]`: groups 0–5 follow `FACES`, 6 is never culled. */
  geometry: (QuadGeometry | null)[][]
  /** Bit `i` set: side `FACES[i]` is completely covered by an opaque face. */
  opaqueFaces: number
  /** Bit `i` set: side `FACES[i]` is completely covered (any layer). */
  fullFaces: number
  /** No model was found: drawn with the missing texture. */
  missing: boolean
  /** Nothing to draw (air). */
  empty: boolean
}

export interface BakeResult {
  states: BakedState[]
  /** Block ids that had no model (unique, sorted). */
  missingBlocks: string[]
}

const EPS = 1e-4

/** Texture ids referenced by a palette, found with a recording atlas. */
export function collectTextureIds(
  palette: readonly BlockState[],
  resources: GameResources,
): Set<string> {
  const ids = new Set<string>([MISSING_TEXTURE])
  const recorder: TextureAtlasProvider = {
    getTextureAtlas: () => {
      throw new Error('Not available while recording')
    },
    getTextureUV(id: Identifier) {
      ids.add(id.toString())
      return [0, 0, 1, 1]
    },
  }
  for (const state of palette) meshOf(state, resources, recorder)
  return ids
}

export function bakePalette(
  palette: readonly BlockState[],
  resources: GameResources,
  atlas: BakeAtlas,
): BakeResult {
  const missing = new Set<string>()
  const states = palette.map((state) => {
    const baked = bakeState(state, resources, atlas)
    if (baked.missing) missing.add(state.name)
    return baked
  })
  return { states, missingBlocks: [...missing].sort() }
}

export function bakeState(
  state: BlockState,
  resources: GameResources,
  atlas: BakeAtlas,
): BakedState {
  if (isAirId(state.name)) return emptyState()
  const result = meshOf(state, resources, atlas)
  const quads = result ? result.quads : missingCube(atlas)

  // quads[layer][group]
  const buckets: Quad[][][] = RENDER_LAYERS.map(() => Array.from({ length: GROUP_COUNT }, () => []))
  // A side can be covered by several quads (e.g. the back of stairs: slab +
  // step), so coverage is the union of quads on a 16×16 grid per side.
  const anyCoverage = Array.from({ length: 6 }, () => new Uint8Array(256))
  const opaqueCoverage = Array.from({ length: 6 }, () => new Uint8Array(256))

  for (const quad of quads) {
    const layer = layerOf(quad, atlas)
    const side = boundarySide(quad)
    buckets[layer][side ?? INNER_GROUP].push(quad)
    if (side !== null) {
      markCoverage(quad, side, anyCoverage[side])
      if (layer === RenderLayer.Opaque) markCoverage(quad, side, opaqueCoverage[side])
    }
  }

  return {
    geometry: buckets.map((groups) => groups.map((g) => (g.length ? toGeometry(g) : null))),
    opaqueFaces: coverageMask(opaqueCoverage),
    fullFaces: coverageMask(anyCoverage),
    missing: result === null,
    empty: quads.length === 0,
  }
}

/** Mesh of one state (no culling), or null when the block has no model at all. */
function meshOf(
  state: BlockState,
  resources: GameResources,
  atlas: TextureAtlasProvider,
): Mesh | null {
  const name = Identifier.parse(state.name)
  const dsState = new DsBlockState(name, { ...state.properties })
  const mesh = new Mesh()
  let found = false
  try {
    const definition = resources.getBlockDefinition(name)
    if (definition) {
      mesh.merge(definition.getMesh(name, { ...state.properties }, atlas, resources, {}))
      found = true
    }
    const special = SpecialRenderers.getBlockMesh(dsState, undefined, atlas, {})
    if (!special.isEmpty()) {
      mesh.merge(special)
      found = true
    }
  } catch {
    // A referenced model is missing (e.g. a block newer than the game files).
    return null
  }
  return found ? mesh : null
}

/** Side of the block the quad lies on (all vertices on that boundary plane), or null. */
function boundarySide(quad: Quad): number | null {
  const v = quad.vertices().map((vertex) => vertex.pos)
  const all = (axis: 'x' | 'y' | 'z', value: number) =>
    v.every((p) => Math.abs(p[axis] - value) < EPS)
  if (all('y', 1)) return 0
  if (all('y', 0)) return 1
  if (all('z', 0)) return 2
  if (all('z', 1)) return 3
  if (all('x', 1)) return 4
  if (all('x', 0)) return 5
  return null
}

/**
 * Marks the 1/16-block cells of a side covered by a quad. Faces on a block
 * boundary are axis-aligned, so their bounding rectangle is the face itself.
 */
function markCoverage(quad: Quad, side: number, cells: Uint8Array): void {
  const [a, b] =
    side <= 1 ? (['x', 'z'] as const) : side <= 3 ? (['x', 'y'] as const) : (['y', 'z'] as const)
  const v = quad.vertices().map((vertex) => vertex.pos)
  const cell = (value: number) => Math.min(16, Math.max(0, Math.round(value * 16)))
  const a0 = cell(Math.min(...v.map((p) => p[a])))
  const a1 = cell(Math.max(...v.map((p) => p[a])))
  const b0 = cell(Math.min(...v.map((p) => p[b])))
  const b1 = cell(Math.max(...v.map((p) => p[b])))
  for (let i = a0; i < a1; i++) for (let j = b0; j < b1; j++) cells[i * 16 + j] = 1
}

/** Bit `i` set when every cell of side `i` is covered. */
function coverageMask(coverage: Uint8Array[]): number {
  let mask = 0
  coverage.forEach((cells, side) => {
    if (cells.every((c) => c === 1)) mask |= 1 << side
  })
  return mask
}

function layerOf(quad: Quad, atlas: BakeAtlas): RenderLayer {
  const uvs = quad.vertices().map((v) => v.texture ?? [0, 0])
  const u = uvs.reduce((s, t) => s + t[0], 0) / 4
  const vv = uvs.reduce((s, t) => s + t[1], 0) / 4
  return atlas.layerAt(u, vv)
}

function toGeometry(quads: Quad[]): QuadGeometry {
  const n = quads.length * 4
  const positions = new Float32Array(n * 3)
  const uvs = new Float32Array(n * 2)
  const colors = new Float32Array(n * 3)
  const normals = new Float32Array(n * 3)
  let i = 0
  for (const quad of quads) {
    const normal = quad.normal()
    for (const vertex of quad.vertices()) {
      positions.set([vertex.pos.x, vertex.pos.y, vertex.pos.z], i * 3)
      uvs.set(vertex.texture ?? [0, 0], i * 2)
      colors.set(vertex.color ?? [1, 1, 1], i * 3)
      normals.set([normal.x, normal.y, normal.z], i * 3)
      i++
    }
  }
  return { quadCount: quads.length, positions, uvs, colors, normals }
}

/** Unit cube with the missing texture on every side (one quad per side). */
function missingCube(atlas: TextureAtlasProvider): Quad[] {
  const model = new Mesh()
  const id = Identifier.parse(MISSING_TEXTURE)
  const faces = Object.fromEntries(FACES.map((f) => [f, { texture: '#all', cullface: f }]))
  const cube = BlockModel.fromJson({
    textures: { all: id.toString() },
    elements: [{ from: [0, 0, 0], to: [16, 16, 16], faces }],
  })
  model.merge(cube.getMesh(atlas, {}, undefined))
  // BlockModel meshes are in 1/16 units; scale to block space.
  for (const quad of model.quads) {
    for (const vertex of quad.vertices()) {
      vertex.pos = vertex.pos.scale(1 / 16)
    }
  }
  return model.quads
}

function emptyState(): BakedState {
  return {
    geometry: RENDER_LAYERS.map(() => new Array<QuadGeometry | null>(GROUP_COUNT).fill(null)),
    opaqueFaces: 0,
    fullFaces: 0,
    missing: false,
    empty: true,
  }
}
