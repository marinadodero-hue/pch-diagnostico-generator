import { NextRequest, NextResponse } from 'next/server'
import { analyzeDiagnostic, planSlides } from '@/lib/claude'
import { loadReferences } from '@/lib/references'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      rawText,
      consultantNotes = '',
      clientContext = '',
      clientName = '',
      period = '',
      accessToken,
      skipGeneration = false,
      preApprovedAnalysis,
    } = body

    if (!rawText || rawText.trim().length < 10) {
      return NextResponse.json({ error: 'El texto del diagnóstico es requerido.' }, { status: 400 })
    }

    // Step 1: load references
    const references = await loadReferences()

    // Step 2: analyze (or use pre-approved analysis)
    const analysis = preApprovedAnalysis
      ? preApprovedAnalysis
      : await analyzeDiagnostic(rawText, consultantNotes, clientContext, clientName, period, references)

    if (skipGeneration) {
      return NextResponse.json({ analysis })
    }

    // Step 3: plan slides
    const slidePlan = await planSlides(analysis, consultantNotes)

    if (!accessToken) {
      return NextResponse.json({ analysis, slidePlan, needsAuth: true })
    }

    // Step 4: generate PPTX with PCH design and upload to Drive as Google Slides
    const { generateAndUploadPptx } = await import('@/lib/generatePptx')
    const url = await generateAndUploadPptx(
      slidePlan,
      accessToken,
      analysis.clientName || clientName
    )

    return NextResponse.json({ analysis, slidePlan, url, slideCount: slidePlan.length })
  } catch (err: unknown) {
    console.error('Generate error:', err)
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
