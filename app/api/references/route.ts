import { NextRequest, NextResponse } from 'next/server'
import { listReferenceFiles, saveReferenceFile, deleteReferenceFile, CATEGORIES } from '@/lib/references'

export async function GET() {
  const files = listReferenceFiles()
  return NextResponse.json({ files })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const category = formData.get('category') as string

  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  if (!CATEGORIES.includes(category as typeof CATEGORIES[number])) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')
  saveReferenceFile(buffer, safeName, category as typeof CATEGORIES[number])
  return NextResponse.json({ success: true, name: safeName })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filename = searchParams.get('filename')
  const category = searchParams.get('category')

  if (!filename || !category) {
    return NextResponse.json({ error: 'Parámetros requeridos' }, { status: 400 })
  }

  deleteReferenceFile(filename, category as typeof CATEGORIES[number])
  return NextResponse.json({ success: true })
}
