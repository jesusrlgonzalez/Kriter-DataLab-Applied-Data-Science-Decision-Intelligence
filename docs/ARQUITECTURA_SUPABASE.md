# Arquitectura con Supabase y control de acceso por filas

**Proyecto:** Kriter DataLab · **Autor:** Jesus R.L. Gonzalez · **Marca:** Kriter Systems

## 1. Arquitectura implantada

```text
NAVEGADOR DEL USUARIO
   │
   ▼
HUGGING FACE STATIC SPACE            (solo HTML, CSS y JavaScript)
   ├── Tablero interactivo
   └── Cliente oficial supabase-js    (incluido en el artefacto, sin CDN)
           │  HTTPS + JWT de la sesión
           ▼
SUPABASE (plan Free)
   ├── Supabase Auth ........ identidad verificada, sesión y renovación
   ├── PostgreSQL ........... regions · products · sales · roles ·
   │                          profiles · user_roles · user_regions · security_audit
   ├── Row Level Security ... denegación por defecto; alcance por auth.uid()
   └── Funciones RPC ........ agregan dentro de la base, en modo SECURITY INVOKER
```

GitHub es el repositorio principal y ejecuta la integración continua.
Hugging Face solo sirve archivos estáticos. **No hay Docker, FastAPI ni servidor
de aplicación.**

## 2. Qué se migró desde la versión FastAPI

| Capacidad de la versión FastAPI | Dónde vive ahora | Nota |
|---|---|---|
| Identidad (OAuth de Hugging Face) | Supabase Auth (correo y contraseña; GitHub opcional) | El Space estático no puede ejecutar el intercambio OAuth servidor‑servidor |
| Política en `KRITER_RLS_POLICY_JSON` | Tablas `roles`, `user_roles`, `regions`, `user_regions` | La política deja de ser una variable de entorno y pasa a ser datos auditables |
| `filtered_rows()` como único punto de autorización | Políticas RLS sobre `sales` y `regions` | La autorización baja al motor de base de datos |
| `aggregate()` en Python | `kriter_dashboard()` en PL/pgSQL | Mismos indicadores; el cálculo nunca ve filas ajenas |
| `api/scenario` | `kriter_scenario()` | Exige la capacidad `scenarios` |
| `api/export.csv` | `kriter_export_products()` | Exige la capacidad `export` |
| `api/filters` | `kriter_filter_options()` | Las opciones se limitan al alcance del perfil |
| Cookie de sesión firmada | JWT de Supabase con renovación automática | Caducidad y renovación gestionadas por la librería oficial |
| Cabeceras CSP y `no-store` | **No migrado** | Un Space estático no permite fijar cabeceras |
| Dockerfile y `requirements.txt` | **Eliminados** | Ya no son necesarios |

## 3. Modelo de datos

| Tabla | Contenido | RLS |
|---|---|---|
| `regions` | Seis áreas comerciales ficticias; `is_public` marca el área de demostración | Lectura de las áreas autorizadas |
| `products` | 350 productos sintéticos con marca y segmento | Lectura libre (catálogo sin cifras) |
| `sales` | 20,160 hechos: área × producto × semana, valor y unidades | Lectura solo de áreas autorizadas |
| `roles` | Catálogo de los cuatro perfiles y sus capacidades | Lectura libre (catálogo) |
| `profiles` | Perfil ligado a `auth.users` (alta automática por disparador) | Solo el propio, o todos si es administrador |
| `user_roles` | Asignación de rol | Solo las propias, o todas si es administrador |
| `user_regions` | Asignación territorial | Solo las propias, o todas si es administrador |
| `security_audit` | Eventos de acceso y denegación | Solo perfiles con capacidad de auditoría |

Ninguna tabla tiene política de `INSERT`, `UPDATE` ni `DELETE`: **desde el
navegador no existe ninguna ruta de escritura**. La administración se realiza
con la clave de servicio, que nunca sale del servidor.

## 4. Capacidades por perfil

| Perfil | Áreas | Escenarios | Exportar CSV | Bitácora |
|---|---|:-:|:-:|:-:|
| Administrador | Todas | Sí | Sí | Sí |
| Gerente regional | Las asignadas | Sí | Sí | No |
| Analista | Las asignadas | Sí | Sí | No |
| Auditor | Las asignadas | **No** | Sí | **Sí** |
| Usuario autenticado sin rol | Solo el área pública | No | No | No |
| Visitante anónimo | Solo el área pública | No | No | No |

El área pública (`Norte`) es la única visible sin iniciar sesión; es el
equivalente a `public_regions` de la versión anterior.

## 5. Por qué las funciones no eluden la RLS

Las funciones `kriter_*` son **SECURITY INVOKER** (el modo por omisión): se
ejecutan con los permisos de quien llama, de modo que las políticas de `sales` y
`regions` se evalúan dentro de la agregación. Las únicas funciones
`SECURITY DEFINER` son auxiliares que resuelven **la identidad del propio
usuario** (`app.is_admin`, `app.allowed_region_ids`, `app.has_capability`) o
escriben en la bitácora; ninguna devuelve datos comerciales.

Además son **STABLE**, por lo que PostgREST las ejecuta en una transacción de
solo lectura: ni siquiera un error de programación podría escribir datos.

## 6. Dimensionamiento en el plan gratuito

| Elemento | Tamaño observado | Límite del plan Free |
|---|---|---|
| Base de datos completa | ~12 MB con índices | 500 MB |
| Tabla `sales` | 20,160 filas | — |
| Usuarios | 5 de prueba | 50,000 activos al mes |
| Transferencia por consulta | 40–120 KB (respuestas agregadas) | 5 GB al mes |

El tablero envía agregados, no filas: una sesión completa consume unos cientos
de kilobytes. Queda margen amplio para índices, autenticación y crecimiento.

## 7. Reproducir el entorno

1. Crear un proyecto Supabase gratuito en la organización `Kriter Systems`.
2. Aplicar en orden los archivos de `supabase/migrations/`.
3. Cargar el dataset sintético con `tools/cargar_dataset.mjs` (ver `tools/CARGA_DATASET.md`).
4. Opcional: crear identidades de prueba con `supabase/qa/crear_usuarios_prueba.sql`.
5. Ajustar `supabase/public_config.json` o las variables `SUPABASE_URL` y
   `SUPABASE_PUBLISHABLE_KEY`, y compilar con `python tools/build_secure.py`.
