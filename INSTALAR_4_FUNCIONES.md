# Instalación de las 4 funciones nuevas

## 1. Base de datos
En Supabase, abrir **SQL Editor**, pegar y ejecutar todo el archivo:

`supabase/migrations/20260722_admin_security.sql`

## 2. Función segura del administrador
En Supabase, abrir **Edge Functions**, crear una función llamada exactamente:

`admin-actions`

Copiar dentro el contenido de:

`supabase/functions/admin-actions/index.ts`

Luego desplegarla. Supabase agrega automáticamente las variables seguras necesarias; la service role no queda expuesta en el navegador.

## 3. Probar
Ejecutar:

`npm run dev`

Entrar como administrador. Arriba del panel aparecerán Online/Offline, backup/restauración. En cada jugador aparecerán Cambiar contraseña y Cerrar sesión.
