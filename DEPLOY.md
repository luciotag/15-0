# Cómo lanzar 15-0 en un dominio .com

El juego es un **sitio estático** (no necesita servidor). Hosting gratis + tu dominio `.com`.

> ⚠️ **Licencia:** la metodología/atribución de datos es **CC BY-NC-SA 4.0 (uso NO comercial)**.
> Una página gratis con el crédito en el footer está OK. **No** pongas publicidad ni cobres por ella.

---

## Opción A — Vercel + GitHub (recomendada: deploy automático en cada cambio)

1. **Subí el código a GitHub**
   - Creá una cuenta en https://github.com y un repo nuevo vacío llamado `15-0` (privado o público).
   - En la carpeta del proyecto, conectá y subí (reemplazá TU-USUARIO):
     ```bash
     git remote add origin https://github.com/TU-USUARIO/15-0.git
     git branch -M main
     git push -u origin main
     ```
2. **Conectá Vercel**
   - Entrá a https://vercel.com con tu cuenta de GitHub → **Add New → Project** → elegí el repo `15-0`.
   - Vercel detecta Vite solo (Build: `npm run build`, Output: `dist`). **Deploy**. En ~1 min está online
     en una URL `tuproyecto.vercel.app`.
3. **Tu dominio .com**
   - En el proyecto → **Settings → Domains → Add**. Escribí tu dominio.
   - Si todavía **no lo tenés**: lo podés comprar ahí mismo en Vercel, o en
     [Namecheap](https://www.namecheap.com) / [Porkbun](https://porkbun.com) / [Cloudflare](https://www.cloudflare.com/products/registrar/) (~USD 10-15/año).
   - Si lo comprás afuera, Vercel te muestra los **registros DNS** (un `A` y/o `CNAME`) que tenés que
     cargar en el panel del registrador. En 5-30 min queda con HTTPS automático.

A partir de ahí, cada `git push` redeploya solo.

---

## Opción B — Netlify Drop (la más rápida para verlo online YA, sin git)

1. Generá el build:
   ```bash
   npm run build
   ```
2. Entrá a https://app.netlify.com/drop y **arrastrá la carpeta `dist`** a la ventana.
   En segundos tenés una URL pública `algo.netlify.app`.
3. Para el dominio .com: **Site settings → Domain management → Add custom domain** y seguí los pasos
   de DNS (igual que arriba). Para actualizar el sitio, volvés a arrastrar `dist`.

> Para deploy automático en Netlify también podés conectar el repo de GitHub (Add new site → Import).

---

## Sobre el nombre del dominio

`15-0.com` quizás esté tomado o se vea raro empezando con número. Alternativas:
`quincecero.com`, `slamperfecto.com`, `15-0tennis.com`, `jugar15-0.com`.
Verificá disponibilidad en el registrador antes de comprar.

## Notas técnicas

- `vite.config.ts` usa `base: './'`, así que funciona tanto en la raíz del dominio como en subcarpetas.
- Configs ya incluidas: `vercel.json` y `netlify.toml` (build `npm run build`, output `dist`, Node 20).
- No hay backend ni variables de entorno: es 100% estático.
