# Política de datos sintéticos

**Kriter DataLab** · Jesus R.L. Gonzalez · Kriter Systems · 2026

## 1. Declaración

Todos los datos publicados en este proyecto, en cualquiera de sus dos versiones,
son **sintéticos y generados por programa**. No proceden de ninguna empresa,
cliente, persona ni operación real, y no deben interpretarse como resultados
comerciales.

## 2. Cómo se generan

`tools/generate_data.py` produce 20,160 registros con una semilla fija
(`random.Random(20261112)`), de modo que cualquiera obtiene el mismo archivo:

| Elemento | Valor |
|---|---|
| Archivo | `data/demo_sales.csv` |
| SHA-256 | `e33df39cd5be722fc828179bcee16fe43f1c20671d48b17cbb90d0998898bfa6` |
| Registros | 20,160 (6 áreas × 350 productos × 80 semanas con muestreo) |
| Periodo | 2024-S02 a 2025-S29 |
| Áreas | Norte, Occidente, Bajío, Centro, Metropolitana, Sureste (ficticias) |
| Marcas | «Portafolio 01» a «Portafolio 24» (ficticias) |
| Productos | `KS-0001` a `KS-0350` (ficticios) |
| Valor total | 48,820,590.6720 unidades de valor simuladas |

Ninguna de esas denominaciones corresponde a una marca, producto o territorio
comercial existente. La unidad monetaria **no está certificada**: se declara como
«unidades de valor simuladas».

## 3. Qué se publica y qué no

| Se publica | No se publica |
|---|---|
| El generador y el dataset sintético | Datos de clientes, ventas o personas reales |
| El esquema, las políticas y las funciones | Claves privilegiadas (`service_role`) o contraseñas |
| Las cifras agregadas del tablero | Archivos académicos o material de terceros sin licencia |
| Las evidencias de prueba | Credenciales de las cuentas de prueba |

`tools/security_scan.py` lo comprueba de forma automática en cada validación: el
artefacto publicado no puede contener códigos de producto, la cabecera del CSV,
claves con cuerpo, JWT con rol privilegiado ni claves PEM.

## 4. Identificación en la interfaz

La condición sintética se declara en cinco lugares, no en uno:

1. La etiqueta **«Datos sintéticos»** en la barra de filtros, visible en todas
   las páginas y tamaños de pantalla.
2. El aviso de **«Entorno de demostración»** en el resumen ejecutivo.
3. La página **Datos y metodología**, con el alcance verificado de la sesión.
4. El pie de página.
5. La descripción del Space y el README del repositorio.

## 5. Escenarios, no pronósticos

La página de simulación proyecta de forma plana el promedio de una ventana
histórica sobre un horizonte hipotético, con multiplicadores ajustables. Es un
**análisis de sensibilidad**: no incorpora estacionalidad, intervalos de
confianza ni validación estadística, y así se declara en la propia página y en la
respuesta del servidor.

## 6. Si en el futuro se usan datos reales

Esta política dejaría de aplicarse y habría que, como mínimo:

1. Dejar de publicar el repositorio de datos y cargar desde el servidor con la
   clave de servicio.
2. Retirar las identidades de prueba (`supabase/respaldo/retirar_cuentas_prueba.sql`).
3. Obtener autorización escrita del dueño de los datos.
4. Revisar la base legal del tratamiento y, en México, las obligaciones de la
   LFPDPPP si hubiera datos personales.
5. Hacer privado el Space y revisar que la clave publicable solo exponga lo que
   las políticas autoricen.
6. Volver a ejecutar las pruebas de aislamiento con las identidades reales.
