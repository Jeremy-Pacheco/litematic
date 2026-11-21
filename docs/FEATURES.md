# Funcionalidades

Leyenda: ✅ implementada · 🚧 en desarrollo · ⏳ pendiente

| #   | Rama                               | Funcionalidad                                                              | Estado |
| --- | ---------------------------------- | -------------------------------------------------------------------------- | ------ |
| —   | `chore/line-endings`               | Finales de línea LF (`.gitattributes`)                                     | ✅     |
| 0   | `chore/project-setup`              | Base técnica: TS estricto, Vitest, ESLint, Prettier, carpetas, docs        | ✅     |
| 1   | `feature/app-shell`                | Layout, identidad visual, temas (oscuro/claro/automático), idiomas (es/en) | ✅     |
| 2   | `feature/nbt-reader`               | Lectura NBT en un Web Worker con validación y progreso                     | ✅     |
| 3   | `feature/litematic-parser`         | Formato `.litematic`                                                       | ✅     |
| 4   | `feature/schem-parser`             | Formato `.schem` (Sponge v1/v2/v3)                                         | ✅     |
| 5   | `feature/legacy-schematic-parser`  | Formato `.schematic` (MCEdit, IDs numéricos)                               | ✅     |
| 6   | `feature/material-list`            | Lista de materiales                                                        | ✅     |
| 7   | `feature/minecraft-assets`         | Carga de recursos desde el `client.jar` del usuario                        | ✅     |
| 8   | `feature/block-models`             | Blockstates, modelos y atlas de texturas                                   | ✅     |
| 9   | `feature/structure-viewer`         | Visor 3D                                                                   | ⏳     |
| 10  | `feature/layer-system`             | Construcción por capas                                                     | ⏳     |
| 11  | `feature/block-inspector`          | Selección e inspección de bloques                                          | ⏳     |
| 12  | `feature/texture-packs`            | Resource packs personalizados                                              | ⏳     |
| 13  | `feature/performance-optimization` | Optimización y mediciones de conjunto                                      | ⏳     |

La escritura de NBT y las funciones de edición se definirán cuando el visor esté
terminado.
