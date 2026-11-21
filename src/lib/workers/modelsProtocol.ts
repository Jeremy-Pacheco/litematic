import type { BakedModels } from '../models/bakeModels'
import type { BlockState } from '../types/structure'

export type ModelsWorkerRequest = { type: 'bake'; palette: BlockState[] }

export type ModelsErrorCode = 'no-assets' | 'bake-failed'

export type ModelsWorkerResponse =
  { type: 'done'; models: BakedModels } | { type: 'error'; code: ModelsErrorCode; message: string }
