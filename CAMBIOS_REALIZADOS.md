# Jackpot Palace — revisión técnica 1

## Reparaciones aplicadas

- Se separó el motor matemático de la interfaz en `src/services/slotEngine.js`.
- Se unificaron las probabilidades en una sola tabla (`OUTCOME_RATES`).
- Los resultados `medium` y `jackpot` ahora son alcanzables.
- El Scatter ahora paga multiplicadores de la apuesta en vez de importes fijos.
- Se corrigieron líneas formadas únicamente por Wild y la sustitución de Wild.
- Se agregó un bloqueo inmediato para impedir dobles giros simultáneos.
- Se limpian los temporizadores de rodillos al desmontar el componente.
- Se eliminaron variables y funciones sin uso.
- ESLint finaliza sin errores ni advertencias.
- Se agregó `npm run test:rtp` para simulaciones matemáticas.

## Instalación limpia

El respaldo original contenía `node_modules` de otro entorno y le faltaba el binario opcional de Rolldown. No reutilizar esa carpeta.

```bash
rm -rf node_modules package-lock.json
npm install
npm run lint
npm run build
npm run test:rtp -- 1000000
```

## Seguridad pendiente de base de datos

La función `apply_game_result` no está incluida en el respaldo. Antes de operar con valor real, el resultado y el premio deben generarse o validarse íntegramente en Supabase dentro de una única transacción. El navegador no debe ser la autoridad del premio.
