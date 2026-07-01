'use client'

export type Stage = 'idle' | 'analyzing' | 'planning' | 'generating' | 'done' | 'error'

const STAGES: { key: Stage; label: string }[] = [
  { key: 'analyzing', label: 'Analizando diagnóstico' },
  { key: 'planning',  label: 'Planificando slides' },
  { key: 'generating', label: 'Generando presentación' },
  { key: 'done',      label: '¡Listo!' },
]

const ORDER: Stage[] = ['analyzing', 'planning', 'generating', 'done']

export default function GenerationProgress({ stage }: { stage: Stage }) {
  if (stage === 'idle') return null

  const currentIdx = ORDER.indexOf(stage)

  return (
    <div className="mt-6 p-4 rounded-xl border border-blue-200 bg-blue-50">
      <div className="flex items-center justify-between gap-2">
        {STAGES.map((s, i) => {
          const idx = ORDER.indexOf(s.key)
          const isDone = currentIdx > idx
          const isActive = currentIdx === idx
          return (
            <div key={s.key} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1
                ${isDone ? 'bg-[#011533] text-white' : ''}
                ${isActive ? 'bg-[#fe572a] text-white animate-pulse' : ''}
                ${!isDone && !isActive ? 'bg-gray-200 text-gray-400' : ''}
              `}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`text-xs text-center leading-tight
                ${isActive ? 'text-[#fe572a] font-semibold' : ''}
                ${isDone ? 'text-[#011533]' : ''}
                ${!isDone && !isActive ? 'text-gray-400' : ''}
              `}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
      {stage === 'error' && (
        <p className="mt-3 text-red-600 text-sm text-center font-medium">
          Hubo un error. Revisá la consola o intentá de nuevo.
        </p>
      )}
    </div>
  )
}
