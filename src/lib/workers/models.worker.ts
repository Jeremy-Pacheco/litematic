/// <reference lib="webworker" />
import { loadAssetFiles } from '../assets/assetCache'
import { bakeModels, bakedTransferables } from '../models/bakeModels'
import type { ModelsWorkerRequest, ModelsWorkerResponse } from './modelsProtocol'

/**
 * Bakes block models and the texture atlas for a palette, off the main
 * thread. Game files are read from IndexedDB here, so the 4 MB of assets are
 * never copied through the main thread.
 */
const scope = self as unknown as DedicatedWorkerGlobalScope

scope.onmessage = async (event: MessageEvent<ModelsWorkerRequest>) => {
  if (event.data.type !== 'bake') return
  try {
    const files = await loadAssetFiles()
    if (!files) {
      const message: ModelsWorkerResponse = {
        type: 'error',
        code: 'no-assets',
        message: 'No game assets loaded',
      }
      scope.postMessage(message)
      return
    }
    const models = await bakeModels(event.data.palette, files)
    const message: ModelsWorkerResponse = { type: 'done', models }
    scope.postMessage(message, bakedTransferables(models))
  } catch (error) {
    const message: ModelsWorkerResponse = {
      type: 'error',
      code: 'bake-failed',
      message: error instanceof Error ? error.message : String(error),
    }
    scope.postMessage(message)
  }
}
