# PCH Diagnóstico Generator

Generá presentaciones de diagnóstico organizacional en Google Slides a partir de texto libre, con estilo PCH Consultora.

## Requisitos

- Node.js 18+
- Cuenta de Google con acceso a Drive y Slides
- API Key de Anthropic

## Setup Google Cloud Console

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto nuevo (o usar uno existente)
3. Habilitar APIs: **Google Slides API** + **Google Drive API**
4. Ir a "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth 2.0"
   - Tipo: Aplicación web
   - URI de redirección autorizado: `http://localhost:3000/api/auth/google/callback`
5. Copiar el Client ID y Client Secret

## Variables de entorno

Crear `.env.local` en la raíz del proyecto:

```env
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXTAUTH_SECRET=una_clave_secreta_cualquiera_larga
NEXTAUTH_URL=http://localhost:3000
```

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Primer uso

1. Hacer clic en **"Conectar Google"** y autorizar el acceso
2. (Recomendado) Ir a **"Material de referencia"** y subir el manual de marca PCH en la categoría "Manual de marca"
3. Pegar un diagnóstico en **"Generar diagnóstico"** y hacer clic en "Generar"

## Cómo usar las notas del consultor

El campo "Notas del consultor" es el más importante. Claude lo respeta por encima de cualquier otra decisión. Ejemplos:

```
El eje más importante es la falta de datos. El resto es secundario.
Presentar como un problema de crecimiento, no de mala gestión.
No incluir el mapa de procesos. Sí incluir cadena de valor Order to Delivery.
Las citas de los entrevistados son clave, darles protagonismo.
Empresa familiar en transición generacional — tenerlo en cuenta en el tono.
```

## Organización de `/references/`

```
references/
├── diagnosticos/      # Diagnósticos anteriores buenos (modelo de tono y profundidad)
├── presentaciones/    # Descripciones del estilo visual esperado
└── marca/             # Manual de marca PCH
```

Cuantos más ejemplos cargues, mejor el output. Podés subir pares: diagnóstico malo + versión mejorada.

## Deploy en Vercel

```bash
vercel --prod
```

Actualizar `GOOGLE_REDIRECT_URI` y `NEXTAUTH_URL` con la URL de producción en las variables de entorno de Vercel.
