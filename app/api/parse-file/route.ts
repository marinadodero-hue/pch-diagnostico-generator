import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    let text = ''

    if (ext === 'txt') {
      text = buffer.toString('utf-8')
    } else if (ext === 'pdf') {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
      const pdf = await loadingTask.promise
      const pages: string[] = []
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p)
        const content = await page.getTextContent()
        pages.push(content.items.map((item: unknown) => (item as { str?: string }).str || '').join(' '))
      }
      text = pages.join('\n\n')
    } else if (ext === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (ext === 'pptx') {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(buffer)
      const slideFiles = Object.keys(zip.files)
        .filter(f => f.match(/ppt\/slides\/slide\d+\.xml$/))
        .sort()
      const texts: string[] = []
      for (const slideFile of slideFiles) {
        const xml = await zip.files[slideFile].async('text')
        const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || []
        const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ')
        if (slideText.trim()) texts.push(slideText.trim())
      }
      text = texts.join('\n\n')
    } else if (ext === 'xlsx' || ext === 'xls') {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(buffer)
      const sharedStringsFile = zip.files['xl/sharedStrings.xml']
      if (sharedStringsFile) {
        const xml = await sharedStringsFile.async('text')
        const matches = xml.match(/<t[^>]*>([^<]+)<\/t>/g) || []
        text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ')
      }
    } else {
      return NextResponse.json({ error: 'Formato no soportado. Usá PDF, DOCX, PPTX, XLSX o TXT.' }, { status: 400 })
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'No se pudo extraer texto del archivo. Probá con otro formato.' }, { status: 400 })
    }

    return NextResponse.json({ text: text.trim() })
  } catch (err) {
    console.error('parse-file error:', err)
    return NextResponse.json({ error: 'Error al procesar el archivo.' }, { status: 500 })
  }
}
