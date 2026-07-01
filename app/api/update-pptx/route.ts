import { NextRequest, NextResponse } from 'next/server'
import { SlidePlan } from '@/lib/slideTypes'

export async function POST(req: NextRequest) {
  try {
    const { slidePlan, accessToken, clientName } = await req.json()

    if (!slidePlan || !Array.isArray(slidePlan)) {
      return NextResponse.json({ error: 'slidePlan requerido' }, { status: 400 })
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'Necesitás conectar Google primero.', needsAuth: true }, { status: 401 })
    }

    const { generateAndUploadPptx } = await import('@/lib/generatePptx')
    const url = await generateAndUploadPptx(slidePlan as SlidePlan[], accessToken, clientName || 'Cliente')

    return NextResponse.json({ url, slideCount: slidePlan.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
