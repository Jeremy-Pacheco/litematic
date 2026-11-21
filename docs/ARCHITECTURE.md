# Arquitectura

## Estructura

```text
src/
├── lib/
│   ├── components/      Componentes Svelte, agrupados por área
│   │   ├── layout/      Estructura principal (AppShell, TopBar)
│   │   ├── controls/    Controles reutilizables (Button, Icon, SegmentedControl…)
│   │   ├── import/      Pantalla de importación y zona de arrastrar y soltar
│   │   ├── feedback/    Notificaciones
│   │   ├── viewer/      Lienzo 3D (pendiente)
│   │   ├── materials/   Lista de materiales (MaterialList, MaterialRow)
│   │   ├── layers/      Selector de capas (pendiente)
│   │   └── dialogs/     Ventanas modales (pendiente)
│   ├── data/            Datos generados (tabla de IDs antiguos) y sus licencias
│   ├── i18n/            Idiomas: diccionarios y traducción
│   ├── models/          Preparación de modelos: Deepslate, atlas, capas, cobertura
│   ├── materials/       Cálculo de materiales: bloque → ítems, agrupado, stacks
│   ├── styles/          Variables de diseño (tokens.css)
│   ├── stores/          Estado global reactivo (runas de Svelte 5)
│   ├── constants/       Constantes compartidas
│   ├── utils/           Funciones puras sin dependencias de la interfaz
│   ├── managers/        AssetManager (recursos del juego); escena y cámara pendientes
│   ├── assets/          Lectura segura de ZIP, client.jar y caché IndexedDB
│   ├── parsers/         Lectura de archivos: NBT, detección de formato y errores
│   │   └── nbt/         Descompresión y lector NBT propio
│   ├── workers/         Web Workers y su cliente para el hilo principal
│   └── types/           Tipos compartidos (modelo NBT)
├── App.svelte           Componente raíz: solo compone AppShell + pantalla actual
├── app.css              Estilos base globales
└── main.ts              Punto de entrada: carga preferencias y monta la app
tests/                   Tests de Vitest, con la misma estructura que src/
scripts/                 Scripts de mantenimiento (regenerar datos), se ejecutan con Node
docs/                    Documentación
```

## Módulos implementados

| Módulo                                 | Responsabilidad                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `styles/tokens.css`                    | Paleta, tipografía, espaciado, radios y duración de animaciones                           |
| `stores/theme.svelte.ts`               | Tema elegido (automático, claro, oscuro) y tema efectivo                                  |
| `i18n/translate.ts`                    | Tipos de mensajes, `translate()` y detección del idioma del navegador                     |
| `i18n/i18n.svelte.ts`                  | Idioma activo y función `t()` reactiva                                                    |
| `i18n/locales/{es,en}.ts`              | Textos de la interfaz                                                                     |
| `stores/toasts.svelte.ts`              | Cola de notificaciones con cierre automático                                              |
| `stores/importState.svelte.ts`         | Archivo elegido, estado de su lectura y `Structure` resultante; cancela la anterior       |
| `assets/zipReader.ts`                  | Extracción segura de ZIP: rutas, límites, CRC-32                                          |
| `assets/minecraftJar.ts`               | Valida el client.jar, lee `version.json` y elige qué extraer                              |
| `assets/assetCache.ts`                 | Caché IndexedDB (meta, idioma, archivos)                                                  |
| `models/gameResources.ts`              | Block states y modelos del juego para Deepslate (caché, herencia resuelta)                |
| `models/atlasPacking.ts`               | Empaquetado del atlas en estantes                                                         |
| `models/renderLayer.ts`                | Capa de dibujo según el canal alfa                                                        |
| `models/atlas.ts`                      | Atlas en worker (OffscreenCanvas), textura «falta textura»                                |
| `models/bakeStates.ts`                 | Estado → quads por capa y lado, cobertura de lados, bloques especiales                    |
| `models/bakeModels.ts`                 | Flujo completo: texturas usadas → atlas → estados                                         |
| `managers/ModelManager.ts`             | API para el visor: prepara una paleta en un worker                                        |
| `managers/AssetManager.ts`             | API de recursos del juego para el resto de la app; worker por jar                         |
| `stores/assets.svelte.ts`              | Estado de los recursos para la interfaz y tabla de idioma                                 |
| `components/dialogs/AssetsDialog`      | Diálogo «Recursos de Minecraft» (`<dialog>` nativo)                                       |
| `components/layout/AssetsIndicator`    | Indicador de recursos en la barra superior                                                |
| `types/nbt.ts`                         | Modelo NBT en memoria (`Map`, `TypedArray`, listas y long arrays como objetos simples)    |
| `types/structure.ts`                   | Modelo común `Structure` (paleta global + array denso Y-Z-X)                              |
| `parsers/blockState.ts`                | Clave canónica de un estado de bloque, aire y sus variantes                               |
| `parsers/structureBuilder.ts`          | Paleta global sin duplicados, límite de tamaño y reserva del array de bloques             |
| `parsers/litematic/bitArray.ts`        | Decodificador del empaquetado de bits de Litematica                                       |
| `parsers/litematic/LitematicParser.ts` | `.litematic` → `Structure` (regiones, tamaños negativos, entidades, metadatos)            |
| `parsers/blockStateString.ts`          | Interpreta `id[clave=valor,…]` como `BlockState`                                          |
| `parsers/sponge/varint.ts`             | Lector secuencial de varints sin copia                                                    |
| `parsers/sponge/SpongeParser.ts`       | `.schem` v1/v2/v3 → `Structure`                                                           |
| `utils/structureTitle.ts`              | Título visible: nombre de la estructura o, si es genérico, nombre del archivo             |
| `parsers/mcedit/McEditParser.ts`       | `.schematic` (IDs numéricos anteriores a 1.13) → `Structure`                              |
| `parsers/mcedit/legacyBlocks.ts`       | Tabla `id:meta` → blockstate moderno, con caché y carga bajo demanda                      |
| `data/legacyBlocks.json`               | Tabla generada desde minecraft-data (MIT); aviso en `data/LICENSE-minecraft-data.txt`     |
| `parsers/nbt/decompress.ts`            | Detección de compresión y descompresión en streaming con límite de 1 GiB                  |
| `parsers/nbt/NbtReader.ts`             | Lector NBT binario con validación de longitudes y profundidad                             |
| `parsers/nbt/modifiedUtf8.ts`          | Decodificación de cadenas en UTF-8 modificado de Java                                     |
| `parsers/nbt/access.ts`                | Lectura tipada de compuestos (`getInteger`, `getCompound`…)                               |
| `parsers/detectFormat.ts`              | Identifica Litematica, Sponge v1/v2/v3 o MCEdit por el contenido                          |
| `parsers/readStructureFile.ts`         | Flujo completo: descomprimir → NBT → detectar formato → parser del formato                |
| `parsers/errors.ts`                    | `StructureReadError` con códigos de error traducibles                                     |
| `workers/structure.worker.ts`          | Ejecuta `readStructureFile` fuera del hilo principal                                      |
| `workers/structureWorkerClient`        | Crea un worker por archivo; promesa, progreso y cancelación                               |
| `utils/structureFile.ts`               | Comprobación previa del archivo (extensión y tamaño cero)                                 |
| `utils/storage.ts`                     | Acceso a `localStorage` que no rompe la app si no está disponible                         |
| `utils/format.ts`                      | `formatBytes` y `formatCount`: tamaños y cantidades según el idioma                       |
| `constants/formats.ts`                 | Formatos de estructura y sus extensiones                                                  |
| `constants/storage.ts`                 | Claves de `localStorage`                                                                  |
| `components/layout/AppShell`           | Barra superior + contenido + notificaciones                                               |
| `components/layout/TopBar`             | Marca, archivo seleccionado (nombre, tamaño, dimensiones), idioma y tema                  |
| `components/import/ImportScreen`       | Orquesta la importación y traduce el resultado a notificaciones                           |
| `components/import/*`                  | `DropZone`, `WindowDropTarget`, `FilePickerButton`, `ReadingProgress`, `StructureSummary` |
| `materials/blockToItems.ts`            | Reglas bloque colocado → ítems necesarios                                                 |
| `materials/materialList.ts`            | Agrupa los recuentos de la estructura por ítem; nombre provisional legible                |
| `materials/stackSizes.ts`              | Tamaño de stack por ítem, desglose en stacks y cajas de shulker                           |
| `stores/materials.svelte.ts`           | Cantidades que el usuario tiene, guardadas por archivo en `localStorage`                  |
| `components/materials/*`               | `MaterialList` (búsqueda, orden, filtros, progreso, apartado especial), `MaterialRow`     |
| `components/feedback/Toaster`          | Muestra las notificaciones (`aria-live`), respeta `prefers-reduced-motion`                |
| `components/controls/*`                | `Button`, `Icon` (SVG propios), `SegmentedControl`, `ThemeSwitcher`, `LanguageSwitcher`   |

## Interfaz

### Identidad visual

- **Principal: cobre** (`--color-primary`). Botones principales, selección, foco.
- **Secundario: cobre oxidado / verdín** (`--color-secondary`). Progreso y estados correctos.
- **Neutros: grises pizarra** fríos para fondos, paneles, bordes y texto.
- **Error**: rojo, claramente distinto del cobre.
- Tipografía del sistema para la interfaz y monoespaciada para nombres de archivo, formatos,
  coordenadas y cantidades. No se descargan fuentes.

Los pares principales cumplen WCAG 2.1 AA (≥ 4,5:1 para texto).

### Temas

Cada color se declara una sola vez con `light-dark(claro, oscuro)` en `tokens.css`:

- **Automático**: `<html>` no tiene `data-theme`; `color-scheme: light dark` hace que el
  navegador elija según `prefers-color-scheme`, también si cambia en directo.
- **Claro / oscuro**: `ThemeStore` pone `data-theme="light"` o `"dark"` en `<html>`, lo que fija
  `color-scheme` y por tanto el valor de `light-dark()`.
- La elección se guarda en `localStorage` (`lv:theme`). Un script en línea en `index.html` la
  aplica **antes del primer pintado** para evitar un parpadeo del tema equivocado.
- `theme.resolved` expone el tema efectivo para el código que no puede usar CSS (por ejemplo,
  el fondo del futuro visor 3D).

Requiere navegadores con soporte de `light-dark()`: Chrome/Edge 123+, Firefox 120+, Safari 17.5+.

### Idiomas

- `es.ts` define la forma de los mensajes; `en.ts` está tipado con `Messages`, así que
  TypeScript da error si le falta o le sobra una clave. Un test comprueba además que ambos
  idiomas tienen las mismas claves y los mismos `{parámetros}`.
- `i18n.t('import.title')` acepta solo claves que existen (`MessageKey`).
- Primera visita: se usa el primer idioma compatible de `navigator.languages` (`es-MX` → `es`);
  si ninguno lo es, inglés. Después se recuerda la elección (`lv:locale`) y se actualiza el
  atributo `lang` de `<html>`.
- Las notificaciones guardan claves, no texto, así que se traducen de nuevo si cambia el idioma.

### Flujo de importación

```text
ImportScreen ─► checkStructureFile (extensión, tamaño 0: solo orientativo)
     │
     ▼
importState.load(file) ─► readStructureInWorker ─► [worker] readStructureFile
     │                         ▲                         │ decompressBlob → readNbt → detectFormat
     │                         └──── progreso ◄──────────┤
     ▼                                                   ▼
ReadingProgress (barra + cancelar)            StructureFileInfo | StructureReadError
     │
     ▼
StructureSummary (formato, dimensiones, bloques, paleta, regiones, avisos…) + notificación
```

1. El usuario elige un archivo o lo suelta en cualquier parte de la ventana.
2. `checkStructureFile` descarta al momento extensiones ajenas y archivos vacíos. La extensión
   **no se considera fiable**: decide el contenido.
3. `importState.load()` cancela cualquier lectura anterior y crea un **worker nuevo** para el
   archivo. Al terminar o cancelar, el worker se destruye y su memoria se libera entera.
4. El worker descomprime, lee el NBT, detecta el formato y, si ya existe su parser, lo convierte
   en una `Structure`. Al hilo principal vuelven el resumen (`StructureFileInfo`) y la
   `Structure`, con su array de bloques **transferido** (sin copia); el árbol NBT no se envía.
5. Si el contenido no coincide con la extensión, se avisa y se usa el contenido.
6. Los errores llegan con un código (`too-large`, `invalid-nbt`…) que se traduce a una
   notificación. Ver [NBT-FORMATS.md](NBT-FORMATS.md).

Los tres formatos tienen parser. El de MCEdit es asíncrono: carga bajo demanda la tabla de IDs
antiguos (`data/legacyBlocks.json`), que es un fragmento aparte del build.

## Lista de materiales

```text
[worker] finishStructure ─► blockCounts (veces que se usa cada estado de la paleta)
                                    │   misma pasada que cuenta los bloques que no son aire
                                    ▼
[principal] buildMaterialList(palette, blockCounts)   coste ∝ tamaño de la paleta
                                    │   blockToItems(estado) → ítems × cantidad
                                    ▼
          { items (obtenibles), special (fluidos / no obtenibles), totalItems }
                                    ▼
MaterialList ◄── materialProgress (cantidades que el usuario tiene, por archivo)
```

### De bloque a ítem (`blockToItems`)

Un bloque colocado no siempre equivale a un ítem del mismo id. Reglas, por orden:

| Caso                       | Ejemplo                                                                           | Resultado                                    |
| -------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| Aire y partes técnicas     | `cave_air`, `piston_head`, `moving_piston`                                        | No cuentan                                   |
| No obtenibles              | `bedrock`, portales, `fire`, `spawner`, bloques de comandos                       | Apartado especial                            |
| Fluidos                    | `water`/`lava` fuente, `bubble_column`                                            | Cubo, apartado especial; la fluida no cuenta |
| Dos bloques de alto, camas | puertas y flores altas (`half=upper`), camas (`part=head`)                        | Solo cuenta una mitad                        |
| Cantidad en el estado      | losa `type=double`, `candles`, `pickles`, `eggs`, nieve `layers`, `flower_amount` | N ítems                                      |
| Macetas y tartas con vela  | `potted_cactus`, `red_candle_cake`                                                | Dos ítems                                    |
| Cultivos y plantas         | `wheat`, `carrots`, `cocoa`, `cave_vines`, `redstone_wire`, `tripwire`            | Semilla o ítem que lo planta                 |
| Bloques transformados      | `farmland`, `dirt_path`, calderos llenos                                          | `dirt`, `cauldron`                           |
| Variantes de pared         | `wall_torch`, `*_wall_sign`, `*_wall_banner`, `*_wall_skull`, `*_wall_fan`        | El ítem sin `_wall`                          |
| Resto                      | `oak_stairs[facing=north]`                                                        | Mismo id, sin importar el estado             |

Bloques de otros namespaces (mods) se cuentan con su propio id.

### Cantidades del usuario

- La lista muestra **lo necesario**. Opcionalmente, en «Tengo», el usuario escribe cuántos tiene y
  la app muestra **cuántos faltan** (`max(0, necesarios − tengo)`).
- El progreso suma `min(tengo, necesarios)` de cada material sobre el total.
- Se guardan en `localStorage` con la clave `lv:materials:<nombre>|<tamaño>|<fecha>` del archivo,
  así que al volver a abrirlo se recuperan. Los datos guardados se validan al leerlos.

### Nombres

Hasta tener los recursos de Minecraft (`feature/minecraft-assets`), el nombre es el id legible
(`minecraft:oak_stairs` → «Oak stairs»). Los nombres oficiales traducidos y los iconos llegarán
con el `client.jar`; no se usan iconos inventados.

## Principios

- **`App.svelte` no contiene lógica de negocio.** Solo compone componentes.
- **Los workers no contienen lógica.** `structure.worker.ts` solo envuelve funciones puras
  (`readStructureFile`) que se testean directamente en Node.
- **Lógica pura separada del estado reactivo.** Las funciones testeables (`resolveTheme`,
  `translate`, `detectLocale`, `checkStructureFile`…) no dependen de Svelte ni del DOM; los
  stores solo las conectan con el navegador.
- **Un formato interno único.** Cada parser convertirá su formato a un mismo tipo
  `Structure`; el resto de la app no sabrá de qué formato viene la estructura.
- **El trabajo pesado va en Web Workers** (descompresión, NBT, geometría, materiales,
  texturas) para no bloquear la interfaz.
- **Cada manager tiene una única responsabilidad** y no hay dependencias circulares.
- **Sin alertas del navegador.** Errores y avisos usan las notificaciones propias.
