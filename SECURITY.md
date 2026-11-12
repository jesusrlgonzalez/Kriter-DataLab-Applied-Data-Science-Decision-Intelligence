# Seguridad y publicación

- La aplicación es estática, sin autenticación, sin backend y sin credenciales embebidas.
- No subas CSV de clientes, extractos de ERP, archivos PBIX ni secretos al repositorio público.
- Los secretos de despliegue se configuran en GitHub Actions → Secrets and variables.
- Los Spaces públicos exponen su contenido fuente: no contienen protección de acceso.
- En caso de descubrir datos reales, retira la publicación y revoca credenciales expuestas; ten en cuenta que la eliminación de un commit no garantiza eliminar copias anteriores.
- Para conectar una fuente real se necesita catálogo autorizado, contrato de datos, privacidad, segregación de entornos y una arquitectura de ingestión distinta a la versión estática.
