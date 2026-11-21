import type { BakedModels } from '../models/bakeModels'
import type { BlockState } from '../types/structure'
import type {
  ModelsErrorCode,
  ModelsWorkerRequest,
  ModelsWorkerResponse,
} from '../workers/modelsProtocol'

export class ModelBakeError extends Error {
  readonly code: ModelsErrorCode

  constructor(code: ModelsErrorCode, message: string) {
    super(message)
    this.name = 'ModelBakeError'
    this.code = code
  }
}

/**
 * Bakes the models of a structure palette in a dedicated worker (one per
 * request, terminated afterwards). Used by the 3D viewer.
 */
export const ModelManager = {
  bake(palette: readonly BlockState[]): { promise: Promise<BakedModels>; cancel: () => void } {
    const worker = new Worker(new URL('../workers/models.worker.ts', import.meta.url), {
      type: 'module',
    })
    let settled = false
    let rejectTask: (error: Error) => void = () => {}

    const promise = new Promise<BakedModels>((resolve, reject) => {
      rejectTask = reject
      worker.onmessage = (event: MessageEvent<ModelsWorkerResponse>) => {
        settled = true
        worker.terminate()
        const message = event.data
        if (message.type === 'done') resolve(message.models)
        else reject(new ModelBakeError(message.code, message.message))
      }
      worker.onerror = (event: ErrorEvent) => {
        event.preventDefault()
        settled = true
        worker.terminate()
        reject(new ModelBakeError('bake-failed', event.message || 'Worker error'))
      }
      const request: ModelsWorkerRequest = { type: 'bake', palette: [...palette] }
      worker.postMessage(request)
    })

    const cancel = () => {
      if (settled) return
      settled = true
      worker.terminate()
      rejectTask(new DOMException('Baking was cancelled', 'AbortError'))
    }
    return { promise, cancel }
  },
}
