# Usuarios, roles y dirección pública — 2026-11-08

Implementación local autorizada por Juan. No se aplicó la migración ni se desplegó esta versión.

## Permisos acordados

| Operación | Super Admin | Admin | Dueño del sitio |
|---|---|---|---|
| Acceder a contenido y modificar URL | Todos los sitios | Solo asignados | Solo asignados |
| Crear/eliminar sitios | Sí | No | No |
| Crear Admins y asignarles sitios | Sí | No | No |
| Crear dueños y asignarles sitios | Sí | Solo sus sitios | No |
| Editar/desactivar perfiles | Admins y dueños | Dueños dentro de su ámbito | No |
| Gestionar tokens de API | Todos los sitios | Solo asignados | No |

Los roles son fijos: `super_admin`, `admin`, `site_owner`. No hay registro público ni creación de roles arbitrarios.
La propiedad de un sitio se expresa por las asignaciones de `cms.site_members`: un dueño puede tener varios sitios y un sitio puede tener varias personas asignadas.

Los Admins no pueden editarse a sí mismos, modificar Admins/Super Admins, ni administrar cuentas con sitios fuera de su ámbito. Un dueño sin sitios solo es gestionable por el Admin que lo creó o por un Super Admin. Las asignaciones de los Admins las modifica exclusivamente Super Admin.

Todos los Super Admin están protegidos frente a cambios de rol y desactivación desde la API. La herramienta local `npm run user` sigue disponible como mecanismo de recuperación para quien ya tiene acceso de confianza a la base. No se entrega esa conexión a los Admins.

La edición de perfiles sustituye sus asignaciones, cierra sesiones existentes y registra auditoría. Las contraseñas iniciales se almacenan con bcrypt en PostgreSQL y no vuelven en respuestas ni registros. Los cambios de permisos usan una transacción que serializa cambios de usuarios/asignaciones y vuelve a comprobar el rol actual del actor.

## Pantallas

- **Administración general**: navegación independiente del editor de proyectos, sin selector de sitio ni contexto de contenido. No requiere un proyecto seleccionado.
- **Usuarios** (`/usuarios`): crear cuentas sin proyectos vinculados, cambiar rol entre Admin y dueño (solo Super Admin), editar nombre, activar/desactivar. Contraseña inicial y confirmación al crear.
- **Asignar proyectos** (`/asignaciones`): seleccionar una cuenta existente y vincular/desvincular sus proyectos. Super Admin asigna Admins; Admin solo asigna dueños dentro de su ámbito.
- **Nuevo sitio**: dirección pública opcional.
- **Ver el sitio** (`/ver-sitio`): editar/borrar dirección y abrir **Ir a la web** en otra pestaña. Acepta únicamente HTTP/HTTPS sin credenciales. No configura DNS ni despliegues.
- Cuentas sin sitios: aviso explícito y cierre de sesión, sin carga infinita. Los administradores mantienen acceso a Usuarios; Super Admin puede crear sitios.
- Los tokens existentes siguen siendo credenciales de servicio vinculadas a su sitio; los cambios de asignación de usuarios no revocan automáticamente esas integraciones.

## Activación coordinada

1. Probar primero en una base aislada con las migraciones 001–007. **No iniciar el API local contra `.dev.vars` sin revisar el destino: la configuración anterior apunta a producción.**
2. Respaldar la base antes de aplicar cambios en producción.
3. Aplicar `npm run migrate` al destino confirmado: también aplicará 006 si seguía pendiente. La nueva 007 convierte los antiguos `is_owner=true` en Super Admin y los demás en dueños con sus asignaciones existentes.
4. Desplegar conjuntamente API y editor después de migrar. El código nuevo requiere `cms.users.role` y `created_by`.
5. Verificar inicio de sesión del dueño actual, creación de Admin con un sitio, creación de dueño, rechazo de acceso cruzado y edición de URL.

No hace falta crear ni compartir nuevas claves para este cambio. Los sitios públicos y sus Workers no necesitan redeploy por editar el enlace del CMS.

## Validación local

- `npm run typecheck`: editor y API sin errores.
- `npm test -w apps/api`: 20 pruebas HTTP/políticas pasan. Adaptador SQL en memoria; no usa secretos, conexión ni datos de Neon. Cubre alcance por sitio, creación sin proyecto y vinculación posterior, elevación de privilegios, cierre de sesiones, protección de Super Admin, tokens, CSRF y URL. Incluye regresiones para que editar perfiles conserve las asignaciones y asignar proyectos conserve nombre, rol y estado desactivado.
- `npm run build`: compilación correcta; persiste aviso de tamaño del bundle (aprox. 997 kB sin gzip).
- `git diff --check`: sin errores de formato.
- Revisión visual posterior completada en la demostración local: navegación general independiente, selector de usuarios y proyectos, guardado de asignaciones, Admin sin opción de crear Admins, edición de URL como dueño y actualización del enlace. Se restauraron las asignaciones y URL de muestra. Verificación visual en vista estrecha sin desbordamiento horizontal aparente.
- Se corrigieron escrituras cruzadas entre pantallas: PATCH acepta cambios parciales, sin valores por defecto que reactiven perfiles al asignar proyectos. Cada pantalla envía solo los campos que administra.
- No se ha ejecutado SQL en PostgreSQL real: faltan validación de migración y recorrido de interfaz con el API real sobre una base aislada antes de producción. La demostración no valida autenticación real ni persistencia.
