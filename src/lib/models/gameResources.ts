import {
  BlockDefinition,
  BlockModel,
  type BlockDefinitionProvider,
  type BlockModelProvider,
} from 'deepslate/render'
import type { Identifier } from 'deepslate/core'

/**
 * Block states and models read from the extracted game files, in the form
 * Deepslate expects. JSON is parsed lazily and cached; models are flattened
 * (parent chain resolved) once.
 */
export class GameResources implements BlockDefinitionProvider, BlockModelProvider {
  readonly #files: ReadonlyMap<string, Uint8Array>
  readonly #definitions = new Map<string, BlockDefinition | null>()
  readonly #models = new Map<string, BlockModel | null>()
  readonly #decoder = new TextDecoder()

  constructor(files: ReadonlyMap<string, Uint8Array>) {
    this.#files = files
  }

  getBlockDefinition(id: Identifier): BlockDefinition | null {
    const key = id.toString()
    if (!this.#definitions.has(key)) {
      const json = this.#json(`assets/${id.namespace}/blockstates/${id.path}.json`)
      this.#definitions.set(key, json ? BlockDefinition.fromJson(json) : null)
    }
    return this.#definitions.get(key) ?? null
  }

  getBlockModel(id: Identifier): BlockModel | null {
    const key = id.toString()
    if (!this.#models.has(key)) {
      // Guard against parent cycles: mark as missing while resolving.
      this.#models.set(key, null)
      const json = this.#json(`assets/${id.namespace}/models/${id.path}.json`)
      if (json) {
        const model = BlockModel.fromJson(json)
        model.flatten(this)
        this.#models.set(key, model)
      }
    }
    return this.#models.get(key) ?? null
  }

  /** Raw bytes of a texture PNG (`block/stone` → its file), if present. */
  getTexture(id: Identifier): Uint8Array | undefined {
    return this.#files.get(`assets/${id.namespace}/textures/${id.path}.png`)
  }

  /** Animation metadata of a texture, if any. */
  hasAnimation(id: Identifier): boolean {
    return this.#files.has(`assets/${id.namespace}/textures/${id.path}.png.mcmeta`)
  }

  #json(path: string): unknown {
    const bytes = this.#files.get(path)
    if (!bytes) return null
    try {
      return JSON.parse(this.#decoder.decode(bytes))
    } catch {
      return null
    }
  }
}
