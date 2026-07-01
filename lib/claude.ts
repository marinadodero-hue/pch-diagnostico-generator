import Anthropic from '@anthropic-ai/sdk'
import { DiagnosticAnalysis, SlidePlan } from './slideTypes'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CHUNK_SIZE = 10000
const CHUNK_OVERLAP = 500

function chunkText(text: string): string {
  if (text.length <= CHUNK_SIZE) return text
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    chunks.push(text.slice(i, i + CHUNK_SIZE))
    i += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks.map((c, idx) => `[FRAGMENTO ${idx + 1}/${chunks.length}]\n${c}`).join('\n\n')
}

export async function analyzeDiagnostic(
  rawText: string,
  consultantNotes: string,
  clientContext: string,
  clientName: string,
  period: string,
  references: string[]
): Promise<DiagnosticAnalysis> {
  const processedText = chunkText(rawText)

  const refSection = references.length > 0
    ? references.slice(0, 5).join('\n\n---\n\n')
    : '(sin material de referencia cargado)'

  const systemPrompt = `Sos un consultor experto de PCH Consultora especializado en diagnósticos organizacionales de pymes argentinas.
Tu tarea es analizar un texto de diagnóstico (que puede estar bien o mal estructurado, o ser notas dispersas) y extraer toda la información necesaria para armar una presentación profesional.

CONTEXTO DE PCH:
PCH se dedica a profesionalizar pymes. Sus diagnósticos tienen foco en procesos, diseño organizacional, estrategia, y plan de trabajo. El tono es profesional, directo y empático. Nunca paniquea al cliente: nombra los problemas con claridad pero siempre orientado a la mejora.

MATERIAL DE REFERENCIA (diagnósticos y presentaciones anteriores de PCH):
${refSection}

INSTRUCCIONES DE EXTRACCIÓN:
1. Leé primero las NOTAS DEL CONSULTOR — son instrucciones de mayor jerarquía
2. Extraé todos los hallazgos, situaciones, citas y propuestas del texto
3. Identificá qué ejes temáticos están presentes (estrategia, procesos, organización, comunicación, datos, RRHH, etc.)
4. Identificá si hay una cadena de proceso con fallas secuenciales
5. Extraé citas textuales de entrevistados (entre comillas), preservándolas exactamente
6. Identificá puntos de apalancamiento o fortalezas mencionadas
7. Si hay plan de acción: extraelo. Si no hay: generá uno coherente y marcalo con "(propuesta PCH)"
8. NO inventés hallazgos. Si algo no está en el texto, no lo incluyas.

Respondé ÚNICAMENTE con JSON válido (sin markdown, sin texto adicional, sin bloques de código).`

  const userMessage = `NOTAS DEL CONSULTOR (respetar como prioridad sobre cualquier otra decisión):
${consultantNotes || '(sin notas adicionales)'}

NOMBRE DEL CLIENTE: ${clientName || '(a detectar del texto)'}
PERÍODO: ${period || '(a detectar del texto)'}

CONTEXTO DEL CLIENTE:
${clientContext || '(sin contexto adicional)'}

TEXTO DEL DIAGNÓSTICO:
${processedText}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  if (response.stop_reason === 'max_tokens') {
    console.error('Claude analysis was cut off. Response length:', text.length)
    throw new Error('El diagnóstico es demasiado largo. Reducí el texto o dividilo en partes.')
  }

  try {
    return JSON.parse(cleaned) as DiagnosticAnalysis
  } catch {
    console.error('Claude analysis JSON parse error. Raw response:', text.slice(0, 500))
    throw new Error('Claude devolvió una respuesta inválida. Intentá de nuevo.')
  }
}

export async function planSlides(
  analysis: DiagnosticAnalysis,
  consultantNotes: string
): Promise<SlidePlan[]> {
  const systemPrompt = `Sos un diseñador de presentaciones ejecutivas para PCH Consultora.
Recibís un análisis estructurado de un diagnóstico y tenés que decidir exactamente qué slides generar, en qué orden, y con qué formato visual. Tu output se convierte directamente en una presentación de Google Slides.

TIPOS DE SLIDES DISPONIBLES:
cover, section_divider, rules, intro_columns, method_card, bullet_list_rounded,
quotes_grid, concept_definition, situation_improvement, value_chain, process_map,
leverage_points, action_plan_gantt, two_column_analysis, highlight_statement,
next_steps, closing

SLIDES OBLIGATORIAS (siempre aparecen en este orden fijo):
1. cover
2. rules
3. section_divider (Introducción)
4. intro_columns
5. method_card
6. bullet_list_rounded (acerca de los entrevistados)
[si hay citas] → quotes_grid
section_divider (Diagnóstico: Situaciones detectadas)
bullet_list_rounded (síntomas iniciales / expectativas)
--- BLOQUE DE NARRATIVA LIBRE (decidís vos según el patrón sugerido) ---
[si hay leverage points] → leverage_points
section_divider (Ejes de trabajo / Propuestas)
action_plan_gantt
[si hasPhase2] → bullet_list_rounded (Iniciativas Fase 2)
next_steps
closing

REGLAS DE ASIGNACIÓN DE TIPO DE SLIDE:
- Cadena de pasos con problemas en cada etapa → value_chain
- Situaciones + propuestas claramente diferenciadas → situation_improvement
- Citas textuales de entrevistados → quotes_grid
- Definición de un concepto con valor para la audiencia → concept_definition
- Fortalezas detectadas / puntos positivos → leverage_points
- Lista de 4-7 problemas sin estructura causa-efecto → bullet_list_rounded
- Dos perspectivas contrapuestas → two_column_analysis
- Hallazgo central muy fuerte → highlight_statement
- Mapa de procesos por área/nivel → process_map

LÍMITES DUROS:
- Máximo 120 palabras por slide de contenido
- Si hay más de 6 bullets, dividir en dos slides del mismo tipo
- No usar el mismo tipo de slide más de 3 veces seguidas

NOTAS DEL CONSULTOR A RESPETAR (prioridad máxima):
${consultantNotes || '(sin notas)'}

Respondé ÚNICAMENTE con un array JSON válido (sin markdown, sin texto adicional).
Cada elemento del array debe tener esta forma exacta:
{
  "type": "SlideType",
  "sectionLabel": "string o null",
  "title": "string o null",
  "content": { ... campos específicos del tipo ... },
  "designNotes": "string breve"
}

Para cada tipo de slide, los campos de "content" son:
- cover: { "clientName": string, "period": string }
- section_divider: { "label": string, "sublabel": string|null }  // Usar sublabel cuando el título tiene dos partes (ej label:"Diagnóstico:" sublabel:"Situaciones detectadas"). Para separadores simples de una línea (ej "Introducción"), sublabel=null.
- rules: { "rules": [{ "icon": string, "text": string }] }
- intro_columns: { "columns": [{ "title": string, "items": [string] }], "duration": string }
- method_card: { "icon": string, "title": string, "description": string }
- bullet_list_rounded: { "title": string, "items": [string] }
- quotes_grid: { "title": string, "quotes": [string] }
- concept_definition: { "concept": string, "what": string, "valuePoints": [string] }
- situation_improvement: { "title": string, "rows": [{ "situation": string, "improvement": string }] }
- value_chain: { "title": string, "steps": [{ "number": number, "name": string, "area": string, "criticalFailure": string, "evidence": string }] }
- process_map: { "title": string, "levels": [{ "name": string, "processes": [string] }] }
- leverage_points: { "title": string, "points": [string] }
- action_plan_gantt: { "initiatives": [{ "name": string, "startMonth": number, "durationMonths": number, "owner": string, "subItems": [string] }], "totalMonths": number, "milestones": [string] }
- two_column_analysis: { "title": string, "leftLabel": string, "rightLabel": string, "rows": [{ "left": string, "right": string }] }
- highlight_statement: { "statement": string, "supporting": string|null }
- next_steps: { "steps": [string, string, string] }
- closing: { "contactEmail": string, "contactPhone": string, "website": string }`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8096,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `ANÁLISIS DEL DIAGNÓSTICO:\n${JSON.stringify(analysis, null, 2)}`
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned) as SlidePlan[]
}
