# Accesibilidad, rendimiento y compatibilidad

**Kriter DataLab** · Jesus R.L. Gonzalez · 2026

## 1. Contraste de color (WCAG 2.1 AA)

Medición automatizada de la relación de contraste de cada combinación
color-sobre-fondo del artefacto publicado. Se corrigieron tres tokens que no
alcanzaban 4.5:1 en texto normal:

| Uso | Antes | Ratio | Después | Ratio | Resultado |
|---|---|---|---|---|---|
| Texto secundario y etiquetas de eje | `#7890a0` | 3.03:1 | `#4a6375` | 5.84:1 | **Cumple AA** |
| Texto auxiliar de tarjetas | `#6c8998` | 3.37:1 | `#4a6375` | 5.84:1 | **Cumple AA** |
| Acento sobre fondo claro | `#0a868e` | 3.19:1 | `#0a6066` | 5.48:1 | **Cumple AA** |
| Pie de página | `#8796a5` | 2.86:1 | `#445c6d` | 6.49:1 | **Cumple AA** |

Las combinaciones restantes ya cumplían: texto principal `#0f3442` sobre blanco
(11.6:1), encabezados sobre el fondo claro (9.8:1), texto blanco sobre el azul
de la barra (8.4:1).

## 2. Semántica y navegación por teclado

| Defecto encontrado | Corrección |
|---|---|
| Los 80 puntos de la gráfica de línea eran enfocables (`tabindex="0"`), obligando a 80 tabulaciones para cruzar el tablero | Se retiró el foco de los puntos; la serie se describe en texto y la tabla de datos equivalente sigue siendo enfocable |
| La tabla de la bitácora no tenía encabezados de fila, de modo que un lector de pantalla leía celdas sin referencia | Primera celda de cada fila como `<th scope="row">`, con estilo propio |
| Sin revelación del estado de los controles | `aria-sort` en las columnas ordenables, `aria-expanded` en el detalle, `aria-pressed` en los conmutadores y `aria-live` en los avisos de error y de sesión |

Todos los controles son elementos nativos (`button`, `select`, `input`,
`dialog`), con foco visible y orden de tabulación que sigue el orden visual. El
diálogo de inicio de sesión usa `<dialog>` nativo, que retiene el foco y cierra
con Escape.

## 3. Tamaño de los objetivos táctiles

Verificado sobre el artefacto renderizado: ningún control interactivo mide menos
de 44 × 44 px efectivos en móvil. Los conmutadores de página de la barra
superior se envuelven en dos filas por debajo de 460 px en lugar de comprimirse.

## 4. Navegación móvil

| Ancho | Observado |
|---|---|
| 390 px (iPhone) | Sin desbordamiento horizontal; barra de sesión en dos líneas; tablas con desplazamiento propio |
| 360 px (Android común) | Igual |
| 768 px (tableta) | Diseño de dos columnas |

Se corrigió un desbordamiento de 381 px causado por la barra de sesión, con
reglas específicas por debajo de 460 px. Las capturas de evidencia están en
`evidence-secure/02_movil_gerente_regional.jpg` y
`evidence-secure/04_space_publicado_movil.jpg`.

## 5. Rendimiento

Medido en el Space publicado, con la base en su región real:

| Operación | Coste en el servidor | Observado de extremo a extremo |
|---|---|---|
| Tablero completo (administrador, 2,100 productos) | 200 ms | < 1 s |
| Exportación completa (2,100 filas) | 135 ms | < 1 s |
| Catálogo paginado con búsqueda | 60 ms | inmediato |

El artefacto pesa **menos de 400 KB** en un solo archivo, con el cliente de
Supabase incorporado: no hay peticiones a redes de distribución externas en
tiempo de ejecución, lo que elimina la dependencia de terceros y acorta el
arranque. Los límites de tiempo del servidor (3 s para anónimos, 8 s para
autenticados) dejan un margen de más de un orden de magnitud frente a lo medido.

## 6. Compatibilidad entre navegadores

| Navegador | Estado | Cómo se verificó |
|---|---|---|
| Chromium / Chrome / Edge | **Verificado** | Ejecución real sobre el Space publicado, escritorio y móvil |
| Firefox | **No verificado** | No fue posible instalar el motor en el entorno de trabajo |
| Safari / WebKit | **No verificado** | Igual |

**Declaración honesta:** no se afirma compatibilidad con Firefox ni Safari
porque no se probaron. El código no usa interfaces propietarias —`fetch`,
`<dialog>`, `localStorage`, variables CSS, `grid` y `flex`, todas soportadas en
las versiones vigentes de los tres motores desde 2022—, así que no se anticipan
problemas, pero *no anticipar* no es *haber comprobado*.

### Lista de comprobación manual (10 minutos por navegador)

1. Abrir el Space y confirmar que el resumen carga con el alcance público.
2. Iniciar sesión con una identidad de prueba; verificar que el nombre y el
   alcance aparecen en la barra.
3. Cambiar de página en los seis apartados.
4. Filtrar por un área autorizada y por una no autorizada: la segunda debe
   mostrar el mensaje del servidor, no una tabla vacía.
5. Pulsar *Exportar*: debe descargar un CSV cuya suma coincida con el indicador.
6. Reducir la ventana a 380 px: no debe haber desplazamiento horizontal.
7. Recorrer la página con Tab: el foco debe ser visible y seguir el orden visual.
8. Cerrar sesión: el tablero debe volver al alcance público sin recargar a mano.

Anotar el resultado en este archivo, con navegador, versión y fecha.
