'use client'

import { useState, useEffect, useRef } from 'react'

interface ReferenceFile {
  name: string
  category: string
  uploadedAt: string
  size: number
}

const CATEGORY_LABELS: Record<string, string> = {
  diagnosticos:   'Diagnósticos anteriores',
  presentaciones: 'Presentaciones de ejemplo',
  marca:          'Manual de marca',
}

const CATEGORY_ICONS: Record<string, string> = {
  diagnosticos:   '📄',
  presentaciones: '🖼️',
  marca:          '🎨',
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ReferenceManager() {
  const [files, setFiles] = useState<ReferenceFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('diagnosticos')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadFiles() {
    const res = await fetch('/api/references')
    const data = await res.json()
    setFiles(data.files || [])
  }

  useEffect(() => { loadFiles() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage('')
    const form = new FormData()
    form.append('file', file)
    form.append('category', selectedCategory)
    const res = await fetch('/api/references', { method: 'POST', body: form })
    const data = await res.json()
    if (data.success) {
      setMessage(`✓ "${data.name}" subido correctamente.`)
      await loadFiles()
    } else {
      setMessage(`Error: ${data.error}`)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(filename: string, category: string) {
    if (!confirm(`¿Eliminar "${filename}"?`)) return
    await fetch(`/api/references?filename=${encodeURIComponent(filename)}&category=${category}`, {
      method: 'DELETE',
    })
    await loadFiles()
  }

  const grouped = Object.fromEntries(
    Object.keys(CATEGORY_LABELS).map(cat => [
      cat,
      files.filter(f => f.category === cat),
    ])
  )

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <strong>¿Para qué sirve esto?</strong> Este material le enseña a Claude el estilo y el criterio de PCH.
        Cuantos más ejemplos cargues, mejor el output. Podés subir diagnósticos buenos como modelo, o diagnósticos
        malos junto con su versión mejorada.
      </div>

      {/* Upload */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Subir referencia</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#011533]"
          >
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <label className="flex-1 cursor-pointer">
            <div className={`border-2 border-dashed rounded-lg px-4 py-3 text-center text-sm transition-colors
              ${uploading ? 'border-gray-200 text-gray-400' : 'border-[#011533] text-[#011533] hover:bg-blue-50'}
            `}>
              {uploading ? 'Subiendo...' : '+ Seleccionar archivo (PDF, DOCX, PPTX, TXT, PNG, SVG)'}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.png,.svg,.jpg,.jpeg,.pptx,.ppt"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
        {message && (
          <p className={`mt-2 text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
      </div>

      {/* Files by category */}
      {Object.entries(grouped).map(([cat, catFiles]) => (
        <div key={cat} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <span>{CATEGORY_ICONS[cat]}</span>
            <span className="font-semibold text-sm text-gray-700">{CATEGORY_LABELS[cat]}</span>
            <span className="ml-auto text-xs text-gray-400">{catFiles.length} archivo{catFiles.length !== 1 ? 's' : ''}</span>
          </div>
          {catFiles.length === 0 ? (
            <div className="px-5 py-4 text-sm text-gray-400 italic">Sin archivos cargados.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {catFiles.map(f => (
                <li key={f.name} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <span className="text-gray-400 text-xs">
                    {f.name.endsWith('.pdf') ? '📕' : f.name.endsWith('.docx') ? '📘' : '📄'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(f.uploadedAt).toLocaleDateString('es-AR')} · {formatSize(f.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(f.name, f.category)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg"
                    title="Eliminar"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
