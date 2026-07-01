import fs from 'fs'
import path from 'path'

const REFS_DIR = path.join(process.cwd(), 'references')
const CATEGORIES = ['diagnosticos', 'presentaciones', 'marca'] as const
type Category = typeof CATEGORIES[number]

export interface ReferenceFile {
  name: string
  category: Category
  uploadedAt: string
  size: number
}

export async function loadReferences(): Promise<string[]> {
  const results: string[] = []

  for (const category of CATEGORIES) {
    const dir = path.join(REFS_DIR, category)
    if (!fs.existsSync(dir)) continue

    const files = fs.readdirSync(dir)
      .filter(f => /\.(txt|pdf|docx|pptx|ppt|png|svg|jpg|jpeg)$/i.test(f))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5)

    for (const { name } of files) {
      const filePath = path.join(dir, name)
      try {
        const content = await extractText(filePath)
        if (content.trim()) {
          results.push(`[REFERENCIA — ${category.toUpperCase()} — ${name}]\n${content.slice(0, 3000)}`)
        }
      } catch {
        // skip unreadable files silently
      }
    }
  }

  return results
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase()

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8')
  }

  if (ext === '.pdf') {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const buffer = fs.readFileSync(filePath)
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
    const pdf = await loadingTask.promise
    const pages: string[] = []
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      pages.push(content.items.map((item: unknown) => (item as { str?: string }).str || '').join(' '))
    }
    return pages.join('\n\n')
  }

  if (ext === '.docx') {
    const mammoth = await import('mammoth')
    const buffer = fs.readFileSync(filePath)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (ext === '.pptx' || ext === '.ppt') {
    const JSZip = (await import('jszip')).default
    const buffer = fs.readFileSync(filePath)
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
    return texts.join('\n\n')
  }

  return ''
}

export function listReferenceFiles(): ReferenceFile[] {
  const files: ReferenceFile[] = []

  for (const category of CATEGORIES) {
    const dir = path.join(REFS_DIR, category)
    if (!fs.existsSync(dir)) continue

    fs.readdirSync(dir)
      .filter(f => /\.(txt|pdf|docx|pptx|ppt|png|svg|jpg|jpeg)$/i.test(f))
      .forEach(f => {
        const stat = fs.statSync(path.join(dir, f))
        files.push({
          name: f,
          category,
          uploadedAt: stat.mtime.toISOString(),
          size: stat.size,
        })
      })
  }

  return files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
}

export function saveReferenceFile(
  buffer: Buffer,
  filename: string,
  category: Category
): void {
  const dir = path.join(REFS_DIR, category)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, filename), buffer)

  // If it's an image in "marca", also copy to public/ so it's accessible via URL
  const ext = path.extname(filename).toLowerCase()
  if (category === 'marca' && ['.png', '.svg', '.jpg', '.jpeg'].includes(ext)) {
    const publicDir = path.join(process.cwd(), 'public')
    fs.mkdirSync(publicDir, { recursive: true })
    fs.copyFileSync(path.join(dir, filename), path.join(publicDir, `logo${ext}`))
  }
}

export function getLogoPublicPath(): string | null {
  const publicDir = path.join(process.cwd(), 'public')
  for (const ext of ['.png', '.svg', '.jpg', '.jpeg']) {
    const p = path.join(publicDir, `logo${ext}`)
    if (fs.existsSync(p)) return `/logo${ext}`
  }
  return null
}

export function deleteReferenceFile(filename: string, category: Category): void {
  const filePath = path.join(REFS_DIR, category, filename)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

export { CATEGORIES }
export type { Category }
