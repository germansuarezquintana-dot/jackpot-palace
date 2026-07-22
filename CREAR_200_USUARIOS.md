# Crear los 200 usuarios

Este proyecto incluye un generador para crear o completar las cuentas `u001` a `u200`.

## Datos creados

- Usuarios: `u001` a `u200`
- Correos internos: `u001@jackpot.com` a `u200@jackpot.com`
- Contraseña inicial: `Jackpot2026`
- Créditos iniciales: `1000`
- Estado: activo
- Rol: jugador

El generador no modifica la cuenta administradora. Puede ejecutarse nuevamente: reutiliza las cuentas que ya existan y completa sus perfiles en `players`.

## Paso único antes de ejecutarlo

En Supabase abrí **Project Settings → API Keys** y copiá la clave **service_role**.

Agregá al archivo `.env` esta línea:

```env
SUPABASE_SERVICE_ROLE_KEY=PEGAR_AQUI_LA_CLAVE_SERVICE_ROLE
```

La clave `service_role` es secreta. No debe subirse a GitHub, Netlify, Vercel ni colocarse en variables que comiencen con `VITE_`.

## Ejecutar

Desde la carpeta del proyecto, abrí la terminal y escribí:

```bash
npm run create:users
```

Al terminar debe indicar:

```text
Los 200 usuarios quedaron listos.
```

Después eliminá la línea `SUPABASE_SERVICE_ROLE_KEY` del `.env` o guardala únicamente en una ubicación privada.
