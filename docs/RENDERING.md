# Renderizado

> **Estado:** la **preparación de modelos** (`feature/block-models`) está implementada. El visor
> 3D (`feature/structure-viewer`) y el sistema de capas (`feature/layer-system`) están
> **pendientes**: todavía no se dibuja nada en pantalla.

## Preparación de modelos («bake»)

Antes de dibujar, cada **estado de la paleta** de la estructura se convierte una sola vez en
geometría lista para usar. Una estructura tiene decenas o cientos de estados aunque tenga millones
de bloques, así que este paso no depende del tamaño de la estructura.

```text
[models worker]  archivos del juego (IndexedDB, cargados en feature/minecraft-assets)
   ├─ collectTextureIds   recorre la paleta con un atlas «grabador» → texturas usadas
   ├─ buildAtlas          atlas propio (OffscreenCanvas) + capa de cada textura
   └─ bakePalette         por estado: quads por capa y por lado, cobertura de los lados
        ▲ Deepslate: BlockDefinition (variants/multipart, rotaciones, uvlock),
          BlockModel (herencia, elementos, rotaciones), BlockColors (tintes),
          SpecialRenderers (cofres, carteles, camas, estandartes, cabezas,
          cajas de shulker, campanas, macetas decoradas, fluidos, waterlogged)
   ──► BakedModels (arrays transferidos sin copia)  ──► visor (feature/structure-viewer)
```

API: `ModelManager.bake(palette)` → `BakedModels`.

### Resultado por estado (`BakedState`)

| Campo         | Contenido                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `geometry`    | `geometry[capa][grupo]`: posiciones (0–1), UV, color de tinte y normales por vértice, 4 vértices por quad |
| `opaqueFaces` | Bit por lado: el lado está **totalmente cubierto por caras opacas**                                       |
| `fullFaces`   | Bit por lado: el lado está totalmente cubierto (cualquier capa)                                           |
| `missing`     | El bloque no tiene modelo: se dibuja con la textura de «falta textura»                                    |
| `empty`       | Nada que dibujar (aire)                                                                                   |

**Grupos:** 0–5 = caras que están sobre el lado `up, down, north, south, east, west` del bloque; 6 =
caras interiores, que nunca se ocultan. Una cara pertenece a un lado si todos sus vértices están en
ese plano del bloque.

**Cobertura de un lado:** unión de las caras de ese lado sobre una rejilla de 16 × 16 (la resolución
de los modelos). Hace falta la unión: la parte trasera de una escalera son dos caras (losa +
escalón).

### Cómo usará esto el visor (eliminación de caras ocultas)

Una cara del grupo `lado` se omite si el vecino en esa dirección tiene el lado opuesto en
`opaqueFaces`. Ocultar caras detrás de una cara opaca que cubre todo el lado es siempre correcto,
aunque el modelo no declare `cullface`. Para bloques transparentes iguales (cristal junto a
cristal), se usará `fullFaces`.

### Capas de dibujo

| Capa          | Ejemplos                        | Cómo se dibujará     |
| ------------- | ------------------------------- | -------------------- |
| `Opaque`      | piedra, tablones                | normal               |
| `Cutout`      | hojas, cristal, puertas, flores | con prueba de alfa   |
| `Translucent` | cristal tintado, hielo, agua    | con mezcla, al final |

Minecraft no guarda la capa en los recursos, así que se deduce del **canal alfa de cada textura**
(`classifyAlpha`). La capa se decide **por cara**, no por bloque: una escalera inundada
(`waterlogged`) tiene caras opacas y agua translúcida.

### Bloques especiales

Los bloques que Minecraft dibuja como entidades no tienen modelo JSON y se generan con los
`SpecialRenderers` de Deepslate: cofres, carteles (sin texto), camas, estandartes (color base, sin
patrones todavía), cabezas, cajas de shulker, campanas, macetas decoradas y fluidos.

### Bloques o texturas que faltan

Un bloque sin modelo (más nuevo que los recursos cargados, o de un mod) se dibuja como un cubo con
la textura de «falta textura» de Minecraft (cuadros magenta y negros) y se lista en
`missingBlocks`. Nunca se inventa una textura.

## Limitaciones conocidas

- **Fluidos:** la altura de la superficie se prepara sin conocer el bloque de encima; en columnas de
  agua pueden verse superficies internas. Se resolverá en el visor si es necesario.
- **Estandartes:** solo el color base; los patrones (que están en el block entity) llegarán más
  adelante. Los carteles no muestran su texto.
- **Texturas animadas:** se usa el primer fotograma.
- **Tintes:** colores de bioma por defecto (Deepslate `BlockColors`), no los del bioma real.
