'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import GenerationProgress, { Stage } from '@/components/GenerationProgress'
import SlidePreview from '@/components/SlidePreview'
import ReferenceManager from '@/components/ReferenceManager'
import { SlidePlan } from '@/lib/slideTypes'

function AppContent() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'generar' | 'referencias'>('generar')
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const [clientName, setClientName] = useState('')
  const [period, setPeriod] = useState('')
  const [rawText, setRawText] = useState('')
  const [consultantNotes, setConsultantNotes] = useState('')
  const [clientContext, setClientContext] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const [stage, setStage] = useState<Stage>('idle')
  const [analysis, setAnalysis] = useState<unknown>(null)
  const [slidePlan, setSlidePlan] = useState<SlidePlan[] | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [slideCount, setSlideCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [micError, setMicError] = useState<string | null>(null)

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsRecording(false)
    setInterimText('')
  }, [])

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording()
      return
    }

    setMicError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMicError('Tu browser no soporta dictado. Abrí la app en Chrome o Edge.')
      return
    }

    // Request microphone permission explicitly first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setMicError('No se pudo acceder al micrófono. Verificá los permisos del browser.')
      return
    }

    const rec = new SpeechRecognition()
    rec.lang = 'es-AR'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      if (final) {
        setConsultantNotes(prev => {
          const sep = prev && !prev.endsWith('\n') ? '\n' : ''
          return prev + sep + '• ' + final.trim()
        })
      }
      setInterimText(interim)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      const msg: Record<string, string> = {
        'not-allowed': 'Permiso denegado. Habilitá el micrófono en el browser.',
        'no-speech': 'No se detectó voz. Intentá de nuevo.',
        'network': 'Error de red. Verificá tu conexión.',
      }
      setMicError(msg[e.error] || `Error: ${e.error}`)
      setIsRecording(false)
      setInterimText('')
    }

    rec.onend = () => {
      // Auto-restart if still supposed to be recording (browser stops after silence)
      if (recognitionRef.current) {
        try { recognitionRef.current.start() } catch { /* already stopped */ }
      } else {
        setIsRecording(false)
        setInterimText('')
      }
    }

    recognitionRef.current = rec
    rec.start()
    setIsRecording(true)
  }, [isRecording, stopRecording])

  type FileEntry = { name: string; status: 'processing' | 'done' | 'error'; text?: string; error?: string }
  const [uploadedFiles, setUploadedFiles] = useState<FileEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const token = searchParams.get('access_token')
    const authStatus = searchParams.get('auth')
    if (token) {
      setAccessToken(token)
      localStorage.setItem('pch_access_token', token)
      window.history.replaceState({}, '', '/')
    } else {
      const stored = localStorage.getItem('pch_access_token')
      if (stored) setAccessToken(stored)
    }
    if (authStatus === 'error') {
      setError('Error al conectar con Google. Intentá de nuevo.')
    }
  }, [searchParams])

  async function processFile(file: File): Promise<FileEntry> {
    if (file.name.endsWith('.txt')) {
      const text = await file.text()
      return { name: file.name, status: 'done', text }
    }
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/parse-file', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) {
      return { name: file.name, status: 'done', text: data.text }
    } else {
      return { name: file.name, status: 'error', error: data.error || 'No se pudo leer el archivo.' }
    }
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    setError(null)

    const newEntries: FileEntry[] = files.map(f => ({ name: f.name, status: 'processing' as const }))
    setUploadedFiles(prev => {
      const existing = prev.filter(e => !files.find(f => f.name === e.name))
      return [...existing, ...newEntries]
    })

    const results = await Promise.all(files.map(processFile))

    setUploadedFiles(prev => {
      const updated = prev.map(e => {
        const r = results.find(r => r.name === e.name)
        return r || e
      })
      const combined = updated
        .filter(e => e.status === 'done' && e.text)
        .map(e => `[ARCHIVO: ${e.name}]\n${e.text}`)
        .join('\n\n---\n\n')
      setRawText(combined)
      return updated
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  function removeFile(name: string) {
    setUploadedFiles(prev => {
      const updated = prev.filter(e => e.name !== name)
      const combined = updated
        .filter(e => e.status === 'done' && e.text)
        .map(e => `[ARCHIVO: ${e.name}]\n${e.text}`)
        .join('\n\n---\n\n')
      setRawText(combined)
      return updated
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  async function connectGoogle() {
    const res = await fetch('/api/auth/google?action=url')
    const { url } = await res.json()
    window.location.href = url
  }

  function disconnect() {
    setAccessToken(null)
    localStorage.removeItem('pch_access_token')
  }

  async function handleGenerate(preApprovedAnalysis?: unknown) {
    setError(null)
    setResultUrl(null)

    const hasProcessingFiles = uploadedFiles.some(f => f.status === 'processing')
    if (hasProcessingFiles) {
      setError('Esperá a que terminen de procesarse todos los archivos.')
      return
    }
    if (!rawText.trim()) {
      setError('Agregá al menos un archivo o pegá texto del diagnóstico.')
      return
    }

    setStage('analyzing')

    try {
      if (!preApprovedAnalysis && showPreview) {
        // Step 1: get analysis + plan for preview
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText, consultantNotes, clientContext, clientName, period, skipGeneration: true }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error en análisis')
        setAnalysis(data.analysis)

        setStage('planning')
        const planRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText, consultantNotes, clientContext, clientName, period, preApprovedAnalysis: data.analysis, accessToken: null }),
        })
        const planData = await planRes.json()
        setSlidePlan(planData.slidePlan || null)
        setStage('idle')
        return
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText, consultantNotes, clientContext, clientName, period,
          accessToken,
          preApprovedAnalysis: preApprovedAnalysis || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar')

      setAnalysis(data.analysis)
      setSlidePlan(data.slidePlan || null)
      setStage('generating')

      if (data.needsAuth) {
        setError('Necesitás conectar tu cuenta de Google para generar la presentación.')
        setStage('idle')
        return
      }

      setResultUrl(data.url)
      setSlideCount(data.slideCount || 0)
      setStage('done')
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStage('error')
    }
  }

  const [isUpdating, setIsUpdating] = useState(false)

  async function handleUpdatePptx() {
    if (!slidePlan || !accessToken) return
    setIsUpdating(true)
    setError(null)
    try {
      const res = await fetch('/api/update-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slidePlan, accessToken, clientName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar')
      setResultUrl(data.url)
      setSlideCount(data.slideCount || 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsUpdating(false)
    }
  }

  const isGenerating = ['analyzing', 'planning', 'generating'].includes(stage)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#011533' }}>
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: '#e0fcad', color: '#011533' }}>
              P
            </div>
            <div>
              <span className="text-white font-semibold text-base">PCH Consultora</span>
              <span className="text-white/40 mx-2">·</span>
              <span style={{ color: '#e0fcad' }} className="text-sm font-medium">Generador de Diagnósticos</span>
            </div>
          </div>
          <div>
            {accessToken ? (
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-xs">● Google conectado</span>
                <button onClick={disconnect} className="text-white/40 hover:text-white text-xs transition-colors">Desconectar</button>
              </div>
            ) : (
              <button onClick={connectGoogle} className="text-sm px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors">
                Conectar Google
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="border-b border-white/10 px-6">
        <div className="max-w-4xl mx-auto flex">
          {[{ key: 'generar', label: 'Generar diagnóstico' }, { key: 'referencias', label: 'Material de referencia' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as 'generar' | 'referencias')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === t.key ? 'border-[#fe572a] text-white' : 'border-transparent text-white/50 hover:text-white/80'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {tab === 'referencias' && <ReferenceManager />}

          {tab === 'generar' && (
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Nombre del cliente</label>
                  <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="Ej: Distribuidora García S.A."
                    className="w-full rounded-lg px-4 py-2.5 text-sm bg-white border-0 focus:ring-2 focus:ring-[#fe572a] focus:outline-none" />
                </div>
                <div className="w-44">
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Período</label>
                  <input type="text" value={period} onChange={e => setPeriod(e.target.value)}
                    placeholder="Ej: Mayo 2026"
                    className="w-full rounded-lg px-4 py-2.5 text-sm bg-white border-0 focus:ring-2 focus:ring-[#fe572a] focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">Material del diagnóstico</label>
                <div
                  ref={dropZoneRef}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative w-full rounded-xl border-2 border-dashed cursor-pointer transition-all p-6 text-center
                    ${isDragging ? 'border-[#fe572a] bg-[#fe572a]/10' : 'border-white/20 hover:border-white/40 bg-white/5'}`}
                >
                  <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx,.pptx,.xlsx,.xls" className="hidden" multiple onChange={handleFileInputChange} />
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div>
                      <span className="text-sm text-white/70 font-medium">Arrastrá archivos o hacé click para seleccionar</span>
                      <p className="text-xs text-white/40 mt-1">PDF, PPTX, DOCX, XLSX, TXT — podés subir varios a la vez</p>
                    </div>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map(f => (
                      <div key={f.name} className="flex items-center gap-3 rounded-lg px-3 py-2 bg-white/5 border border-white/10">
                        <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0
                          ${f.status === 'done' ? 'bg-[#e0fcad] text-[#011533]' : f.status === 'error' ? 'bg-red-500 text-white' : 'bg-white/20 text-white/50'}`}>
                          {f.status === 'done' ? '✓' : f.status === 'error' ? '!' : '…'}
                        </span>
                        <span className="text-sm text-white/80 flex-1 truncate">{f.name}</span>
                        {f.status === 'done' && f.text && (
                          <span className="text-xs text-white/30">{f.text.length.toLocaleString('es-AR')} car.</span>
                        )}
                        {f.status === 'error' && (
                          <span className="text-xs text-red-400">{f.error}</span>
                        )}
                        <button onClick={e => { e.stopPropagation(); removeFile(f.name) }} className="text-white/30 hover:text-white/70 text-sm flex-shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedFiles.length === 0 && (
                  <div className="mt-3">
                    <label className="block text-xs text-white/40 mb-1">O pegá texto directamente</label>
                    <textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={6}
                      placeholder="Notas dispersas, transcripciones, texto sin formato — Claude lo procesa igual."
                      className="w-full rounded-lg px-4 py-3 text-sm bg-white/5 text-white border border-white/10 focus:ring-2 focus:ring-[#fe572a] focus:outline-none resize-y placeholder:text-white/25" />
                    {rawText && <span className="text-white/30 text-xs">{rawText.length.toLocaleString('es-AR')} caracteres</span>}
                  </div>
                )}
              </div>

              <div className="rounded-xl p-0.5" style={{ background: 'linear-gradient(135deg, #e0fcad 0%, #bce4fe 100%)' }}>
                <div className="rounded-[10px] bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#e0fcad', color: '#011533' }}>
                        Notas del consultor
                      </span>
                      <span className="text-xs text-gray-400">Claude las respeta por encima de cualquier otra decisión</span>
                    </div>
                    <button
                      onClick={toggleRecording}
                      title={isRecording ? 'Detener grabación' : 'Hablar — transcripción automática'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                        ${isRecording
                          ? 'bg-red-500 text-white shadow-md shadow-red-200 animate-pulse'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm-1 1.93A5.001 5.001 0 017 11H5a7 7 0 0014 0h-2a5.001 5.001 0 01-4 4.93V18h3v2H8v-2h3v-2.07z"/>
                      </svg>
                      {isRecording ? 'Grabando...' : 'Dictar'}
                    </button>
                  </div>
                  <textarea value={consultantNotes} onChange={e => setConsultantNotes(e.target.value)} rows={5}
                    placeholder={`Ejemplos:\n• "El eje más importante es la falta de datos. El resto es secundario."\n• "Presentar como problema de crecimiento, no de mala gestión."\n• "El cliente es sensible al tema de roles. Manejarlo con cuidado."\n• "No incluir mapa de procesos. Sí incluir cadena de valor Order to Delivery."\n• "Las citas de los entrevistados son clave, darles protagonismo."`}
                    className="w-full text-sm border-0 focus:outline-none resize-y text-gray-700 placeholder:text-gray-300 leading-relaxed" />
                  {micError && (
                    <p className="mt-1 text-xs text-red-500 border-t border-gray-100 pt-1">
                      ⚠ {micError}
                    </p>
                  )}
                  {interimText && (
                    <p className="mt-1 text-xs text-gray-400 italic border-t border-gray-100 pt-1">
                      🎙 {interimText}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Contexto del cliente <span className="text-white/30 font-normal text-xs">(opcional)</span>
                </label>
                <textarea value={clientContext} onChange={e => setClientContext(e.target.value)} rows={2}
                  placeholder="Rubro, tamaño, etapa de la empresa, contexto previo relevante..."
                  className="w-full rounded-lg px-4 py-3 text-sm bg-white/10 text-white border border-white/10 focus:ring-2 focus:ring-[#fe572a] focus:outline-none resize-none placeholder:text-white/30" />
              </div>

              <div className="flex items-center gap-3">
                <button role="switch" aria-checked={showPreview} onClick={() => setShowPreview(!showPreview)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showPreview ? 'bg-[#fe572a]' : 'bg-white/20'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${showPreview ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-white/60 cursor-pointer select-none" onClick={() => setShowPreview(!showPreview)}>
                  Mostrar análisis antes de generar
                </span>
              </div>

              <button onClick={() => handleGenerate()} disabled={isGenerating}
                className={`w-full py-4 rounded-xl text-white font-bold text-base transition-all
                  ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#fe572a] hover:bg-orange-500 active:scale-[0.99]'}`}>
                {isGenerating ? 'Generando...' : 'Generar presentación en Google Slides'}
              </button>

              <GenerationProgress stage={stage} />

              {error && !isGenerating && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                  {error}
                  {!accessToken && error.toLowerCase().includes('google') && (
                    <button onClick={connectGoogle} className="ml-3 text-[#fe572a] underline font-medium">Conectar ahora</button>
                  )}
                </div>
              )}

              {showPreview && analysis !== null && stage === 'idle' && !resultUrl && (
                <SlidePreview analysis={analysis as object} slidePlan={slidePlan} onApprove={(a) => handleGenerate(a)} />
              )}

              {resultUrl && stage === 'done' && (
                <div className="rounded-xl overflow-hidden border border-green-200">
                  <div className="bg-green-50 px-5 py-4 flex items-start gap-3">
                    <div className="text-green-500 text-2xl">✓</div>
                    <div>
                      <p className="text-green-800 font-semibold">¡Presentación generada!</p>
                      <p className="text-green-600 text-sm mt-0.5">{slideCount} slides creadas en tu Google Drive.</p>
                    </div>
                  </div>
                  <div className="bg-white px-5 py-4 flex flex-wrap items-center gap-3">
                    <a href={resultUrl} target="_blank" rel="noopener noreferrer"
                      className="bg-[#011533] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#2c3850] transition-colors">
                      Abrir en Google Slides →
                    </a>
                    {slidePlan && accessToken && (
                      <button onClick={handleUpdatePptx} disabled={isUpdating}
                        className={`text-sm px-4 py-2 rounded-lg border font-medium transition-colors
                          ${isUpdating ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-[#fe572a] text-[#fe572a] hover:bg-[#fe572a]/5'}`}>
                        {isUpdating ? 'Actualizando...' : 'Regenerar PPTX (mismo contenido)'}
                      </button>
                    )}
                    <button onClick={() => { setResultUrl(null); setStage('idle'); setAnalysis(null); setSlidePlan(null) }}
                      className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
                      Generar otra
                    </button>
                  </div>
                </div>
              )}

              {!accessToken && (
                <p className="text-center text-white/30 text-xs pt-2">
                  Para generar la presentación necesitás{' '}
                  <button onClick={connectGoogle} className="text-[#e0fcad] underline hover:text-white transition-colors">
                    conectar tu cuenta de Google
                  </button>
                  . El análisis de Claude funciona sin autenticación.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#011533' }}>
        <div className="text-white/40 text-sm">Cargando...</div>
      </div>
    }>
      <AppContent />
    </Suspense>
  )
}
