'use client'

import { useState } from 'react'
import { SlidePlan } from '@/lib/slideTypes'

interface Props {
  analysis: object
  slidePlan: SlidePlan[] | null
  onApprove: (analysis: object) => void
}

const TYPE_LABELS: Record<string, string> = {
  cover: 'Portada',
  section_divider: 'Separador',
  rules: 'Reglas',
  intro_columns: 'Columnas intro',
  method_card: 'Card método',
  bullet_list_rounded: 'Lista bullets',
  quotes_grid: 'Citas',
  concept_definition: 'Definición',
  situation_improvement: 'Situación / Mejora',
  value_chain: 'Cadena de valor',
  process_map: 'Mapa de procesos',
  leverage_points: 'Apalancamiento',
  action_plan_gantt: 'Gantt',
  two_column_analysis: 'Dos columnas',
  highlight_statement: 'Destacado',
  next_steps: 'Próximos pasos',
  closing: 'Cierre',
}

export default function SlidePreview({ analysis, slidePlan, onApprove }: Props) {
  const [editingJson, setEditingJson] = useState(JSON.stringify(analysis, null, 2))
  const [jsonError, setJsonError] = useState('')
  const [showRawJson, setShowRawJson] = useState(false)

  function handleApprove() {
    try {
      const parsed = JSON.parse(editingJson)
      setJsonError('')
      onApprove(parsed)
    } catch {
      setJsonError('JSON inválido. Corregí los errores antes de continuar.')
    }
  }

  return (
    <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-[#011533] text-white px-5 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">Vista previa del análisis</span>
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="text-xs text-[#e0fcad] hover:underline"
        >
          {showRawJson ? 'Ver resumen' : 'Ver JSON completo'}
        </button>
      </div>

      {!showRawJson && slidePlan && (
        <div className="p-5">
          <p className="text-xs text-gray-500 mb-3">
            {slidePlan.length} slides planificadas. Podés aprobar este análisis o editar el JSON antes de generar.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {slidePlan.map((slide, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-gray-400 text-xs w-5 text-right">{i + 1}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium
                  ${slide.type === 'section_divider' || slide.type === 'cover' || slide.type === 'closing'
                    ? 'bg-[#011533] text-white'
                    : 'bg-gray-200 text-gray-700'}
                `}>
                  {TYPE_LABELS[slide.type] || slide.type}
                </span>
                <span className="text-gray-600 truncate text-xs">
                  {slide.title || slide.sectionLabel || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showRawJson && (
        <div className="p-4">
          <textarea
            value={editingJson}
            onChange={e => setEditingJson(e.target.value)}
            className="w-full font-mono text-xs border border-gray-200 rounded-lg p-3 h-80 resize-y focus:outline-none focus:ring-2 focus:ring-[#011533]"
          />
          {jsonError && <p className="text-red-500 text-xs mt-1">{jsonError}</p>}
        </div>
      )}

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleApprove}
          className="bg-[#fe572a] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
        >
          Continuar con este análisis →
        </button>
      </div>
    </div>
  )
}
