# Seguridad y publicación

El repositorio contiene dos versiones del mismo producto, con modelos de seguridad distintos.

## Versión pública (`site/`)

- Aplicación estática: sin autenticación, sin backend y sin credenciales embebidas.
- Los datos sintéticos viajan incrustados en el HTML; cualquiera que abra la página puede leerlos.
- El Space público expone su contenido fuente: no tiene protección de acceso.

## Versión candidata con control de acceso (`site-secure/`)

- Autenticación con Supabase Auth y autorización en PostgreSQL mediante **Row Level Security**; el navegador no decide qué filas ve cada perfil.
- El HTML incluye la URL del proyecto y la **clave publicable** (`sb_publishable_…`). Es pública por diseño: por sí sola no da acceso a filas fuera de lo que permiten las políticas RLS. La clave de servicio y las contraseñas de las cuentas de prueba **nunca** se versionan; viven en GitHub Actions → Secrets.
- La publicación es manual y se bloquea si faltan los secretos para ejecutar las pruebas de aislamiento (`tests/adversarial_http.mjs`).
- Riesgos aceptados y controles compensatorios: [modelo de seguridad](docs/MODELO_SEGURIDAD_RLS.md) (protección contra contraseñas filtradas solo disponible en plan Pro; canal acotado de bitácora con `SECURITY DEFINER`).

## Reglas para ambas versiones

- No subas CSV de clientes, extractos de ERP, archivos PBIX ni secretos al repositorio público. `python tools/security_scan.py` lo comprueba en CI.
- En caso de descubrir datos reales, retira la publicación y revoca credenciales expuestas; ten en cuenta que la eliminación de un commit no garantiza eliminar copias anteriores.
- Conectar una fuente real requiere catálogo autorizado, contrato de datos, privacidad y segregación de entornos.
