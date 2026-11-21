# Sistema de texturas

> **Estado:** la **carga de los recursos de Minecraft** y la **preparación de modelos y atlas** están
> implementadas (ver [RENDERING.md](RENDERING.md)). Los resource packs
> (`feature/texture-packs`) están **pendientes**.

## Licencia de los recursos

Las texturas, modelos y textos de Minecraft son propiedad de Mojang y **no se incluyen en el
repositorio ni en la aplicación**. Se leen del `client.jar` que el propio usuario selecciona, en su
navegador, y nunca se suben a ningún servidor.

## Recursos del juego (`feature/minecraft-assets`)

### Origen

El usuario selecciona el `client.jar` de su instalación:

| Sistema | Ruta (launcher oficial)                                        |
| ------- | -------------------------------------------------------------- |
| Windows | `%APPDATA%\.minecraft\versions\<versión>\<versión>.jar`        |
| macOS   | `~/Library/Application Support/minecraft/versions/<v>/<v>.jar` |
| Linux   | `~/.minecraft/versions/<versión>/<versión>.jar`                |

Versión de referencia: **26.3** (última estable al implementarlo; `world_version` 5023, formato de
recursos 97, jar de unos 40 MB).

### Qué se extrae

De las ~34 000 entradas del jar (casi todas código), solo:

| Ruta                                                                     | Para qué                                  |
| ------------------------------------------------------------------------ | ----------------------------------------- |
| `version.json`                                                           | Versión, DataVersion, formato de recursos |
| `assets/minecraft/blockstates/*.json`                                    | Qué modelo usa cada estado de bloque      |
| `assets/minecraft/models/{block,item}/**.json`                           | Modelos                                   |
| `assets/minecraft/items/*.json`                                          | Modelos de ítem (1.21.4+)                 |
| `assets/minecraft/textures/{block,item,entity,colormap}/**.{png,mcmeta}` | Texturas, animaciones, colores de bioma   |
| `assets/minecraft/lang/en_us.json`                                       | Nombres oficiales                         |

Con el jar 26.3: **10 138 archivos, 4,5 MB**.

**Idiomas:** el jar solo incluye `en_us.json`. El resto de idiomas los descarga el launcher aparte
(`.minecraft/assets/objects`, con nombres en forma de hash), así que los nombres oficiales se
muestran en inglés.

### Seguridad de la extracción (`assets/zipReader.ts`)

| Riesgo              | Medida                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zip Slip            | Se rechaza el archivo entero si **cualquier** entrada tiene `..`, `.`, segmentos vacíos, ruta absoluta, letra de unidad, `\` o caracteres de control. (En el navegador no se escribe en disco, pero las rutas se usan como claves.) |
| Archivos no pedidos | Lista blanca de rutas y extensiones; lo demás no se descomprime                                                                                                                                                                     |
| ZIP bomb            | Antes de descomprimir: tamaño declarado ≤ 16 MB por archivo, proporción ≤ 100:1, total ≤ 256 MB, ≤ 100 000 entradas                                                                                                                 |
| Tamaños falsos      | `fflate` descomprime en un buffer del tamaño declarado y **recorta** si el real es mayor; por eso se verifica el **CRC-32** de cada archivo contra el del directorio central                                                        |
| Datos dañados       | El CRC-32 también detecta cualquier alteración (`corrupt-zip`)                                                                                                                                                                      |
| Jar equivocado      | Sin `version.json`, block states o idioma → `not-client-jar` (p. ej. el jar del servidor)                                                                                                                                           |

Biblioteca: [`fflate`](https://github.com/101arrowz/fflate) 0.8.3 (MIT, sin dependencias).

### Caché (`assets/assetCache.ts`)

IndexedDB, base `litematicviewer`, almacén `assets`, tres registros:

| Clave           | Contenido                       | Se lee                                  |
| --------------- | ------------------------------- | --------------------------------------- |
| `vanilla:meta`  | Versión, nº de archivos, tamaño | Al arrancar                             |
| `vanilla:lang`  | `en_us` (solo textos)           | Al arrancar                             |
| `vanilla:files` | Todos los archivos extraídos    | Solo cuando los necesite el renderizado |

Si IndexedDB no está disponible (modo privado, almacenamiento bloqueado), la app sigue funcionando
sin recursos. El usuario puede quitarlos desde el diálogo.

### Flujo

```text
Diálogo «Recursos de Minecraft» ─► AssetManager.importJar(file)
   └─► [worker] loadClientJar: leer ─► readClientJar (zipReader + validación) ─► saveAssets (IndexedDB)
   ◄── { meta, lang }  →  store `assets`  →  nombres oficiales en la lista de materiales
Arranque ─► assets.init() ─► loadAssetsSummary() (meta + lang)
```

### Uso actual

- **Nombres oficiales** en la lista de materiales: `block.minecraft.<id>` o `item.minecraft.<id>`.
- **Aviso** si una estructura tiene una DataVersion mayor que la de los recursos cargados.

## Atlas y modelos (`feature/block-models`)

- El atlas se construye en un worker con `OffscreenCanvas` (el de Deepslate necesita `document`), solo con las texturas que usa la paleta de la estructura.
- Empaquetado en estantes en un cuadrado potencia de dos, hasta 4096 px.
- Texturas animadas: primer fotograma. Texturas ausentes: casilla magenta y negra de Minecraft.
- La capa de cada textura (opaca, recortada, translúcida) se deduce de su canal alfa.
- UV normalizadas con v hacia abajo: el visor subirá el atlas sin invertirlo.

Detalles en [RENDERING.md](RENDERING.md).

## Pendiente

- Resource packs del usuario superpuestos a los recursos por defecto (`feature/texture-packs`).
- Patrones de estandartes, texto de carteles y colores del bioma real.
