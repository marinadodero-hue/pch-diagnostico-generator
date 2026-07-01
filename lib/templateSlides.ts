/**
 * Template-based Google Slides generation.
 *
 * Copies the PCH master template (already in Google Drive), duplicates
 * the right layout slide for each planned content block, replaces
 * placeholder text, then deletes the original template slides.
 *
 * Template ID: 1pPQWTrHWzD33BKTe3YGbuJ8uQIcphF915JGYhn3F5nc
 *
 * Template slide order (0-based):
 *  0  cover                      "Nombre de la empresa" / "Mes202x"
 *  1  rules                      "Evitar el ping-pong" / "Tomar nota"
 *  2  section_divider (light)    "Introducción"
 *  3  intro_columns              "Diagnóstico" / "Modalidad de trabajo"
 *  4  highlight_statement        "¿Dónde estamos ahora?"
 *  5  method_card                "Método utilizado"
 *  6  bullet_list (entrev.)      "Acerca de los entrevistados" / "xxxx" ×3
 *  7  quotes_grid                "Empresa dice:" / real quotes
 *  8  section_divider (dark)     "Diagnóstico: Situaciones detectadas"
 *  9  two_column_analysis        "Síntomas en el anteproyecto" / "xx" ×4
 * 10  bullet_list (índice)       "Índice"
 * 11  section_divider_dark2      "SITUACIONES GENERALES"
 * 12  situation_improvement      table with "xx" ×12
 * 13  bullet_list_rounded        "Situaciones encontradas" / "xx" ×5
 * 14  bullet_list_causes         "Posibles causas" / items
 * 15  two_col_dimensions         "Presentación de dimensiones" / "XX" grid
 * 16  titulo_grid6               "(Título)" / 6-item grid
 * 17  titulo_twocol              "(Título)" / two-col XX
 * 18  titulo_items               "(Título)" / items + subitems
 * 19  titulo_numbered            "(Título)" / numbered list
 * 20  process_map                "Mapa de procesos EQ"
 * 21  process_map (dup)
 * 22  organigrama
 * 23  section_divider_dark3      "Ejes de trabajo. Propuestas"
 * 24  next_steps                 "¿Cómo seguimos?"
 * 25  impact_matrix              "Alto/Bajo Impacto/Esfuerzo"
 * 26  situacion_matrix           "Matriz de situación"
 * 27  action_plan_gantt          "Plan de Acción" / "MES 1"..."MES 5"
 * 28  priority_matrix            "Matriz de Priorización"
 * 29  next_steps_list            "Próximos pasos" / "XX" ×6
 * 30  questions                  "¿Preguntas?"
 * 31  closing                    "¡Gracias!" / contact info
 */

import { google, slides_v1 } from 'googleapis'
import { SlidePlan } from './slideTypes'

export const PCH_TEMPLATE_ID = '1dE6_gF9hWuqSEfRdRhy6aLkzx0wyGmJoTya0IvDFneY'

// Map each SlidePlan type to the 0-based template slide index to duplicate
const TYPE_TO_TEMPLATE_INDEX: Record<string, number> = {
  cover: 0,
  rules: 1,
  section_divider: 2,        // default: light divider "Introducción" — overridden by getTemplateIndex
  intro_columns: 3,
  highlight_statement: 4,
  method_card: 5,
  quotes_grid: 7,
  two_column_analysis: 9,    // overridden by getTemplateIndex for two-col layout
  situation_improvement: 12,
  bullet_list_rounded: 13,
  value_chain: 14,
  concept_definition: 15,
  leverage_points: 16,
  process_map: 20,
  action_plan_gantt: 27,
  next_steps: 29,
  closing: 31,
}

interface Replacement {
  find: string
  replace: string
}

/**
 * Build the list of text replacements for a given slide plan entry.
 * Each replacement is a { find, replace } pair used with replaceAllText
 * scoped to the duplicated slide.
 */
function buildReplacements(plan: SlidePlan, clientName: string, period: string): Replacement[] {
  const r: Replacement[] = []

  switch (plan.type) {
    case 'cover': {
      const c = plan.content as { clientName?: string; period?: string }
      r.push({ find: 'Nombre de la empresa', replace: c.clientName || clientName })
      r.push({ find: 'Mes202x  -  Realizado por: xxx', replace: `${c.period || period}  -  Realizado por: PCH Consultora` })
      r.push({ find: 'Mes202x', replace: c.period || period })
      r.push({ find: 'xxx', replace: 'PCH Consultora' })
      break
    }

    case 'rules': {
      const c = plan.content as { rules?: { icon?: string; text: string }[] }
      const rules = c.rules || []
      // Template has 4 rule text areas; replace each with actual rules or clear
      const ruleTexts = [
        'Evitar el ping-pong',
        '"La mejor defensa para las distracciones" (foco)',
        'Tomar nota',
        'Preguntas al final',
      ]
      const descTexts = [
        'Poder compartir con los y las empleados/as la visión de la empresa para que nuestros PROCESOS estén alineados',
        '',
        '',
        '',
      ]
      ruleTexts.forEach((old, i) => {
        const newText = rules[i]?.text || ''
        if (newText) r.push({ find: old, replace: newText })
      })
      descTexts.forEach((old) => {
        if (old) r.push({ find: old, replace: '' })
      })
      break
    }

    case 'section_divider': {
      const c = plan.content as { label?: string; sublabel?: string }
      // For the intro divider (index 2), template text is just "Introducción"
      r.push({ find: 'Introducción', replace: c.label || plan.sectionLabel || '' })
      // For the dark diagnostic divider (index 8)
      r.push({ find: 'Diagnóstico:   \nSituaciones detectadas', replace: c.label || plan.sectionLabel || '' })
      // For SITUACIONES GENERALES (index 11)
      r.push({ find: 'SITUACIONES GENERALES', replace: c.label || plan.sectionLabel || '' })
      r.push({ find: '—  \nESTRUCTURA ORGANIZACIONAL', replace: c.sublabel ? `—  \n${c.sublabel}` : '' })
      r.push({ find: 'Comunicación', replace: '' })
      r.push({ find: 'Procesos', replace: '' })
      r.push({ find: 'Roles y funciónes', replace: '' })
      r.push({ find: 'Estrategia', replace: '' })
      // For Ejes de trabajo (index 23)
      r.push({ find: 'Ejes de trabajo. Propuestas: "qué, cuándo y cómo".', replace: c.label || plan.sectionLabel || '' })
      break
    }

    case 'intro_columns': {
      const c = plan.content as { columns?: { title: string; items: string[] }[]; duration?: string }
      const cols = c.columns || []
      // Template column 1: "Modalidad de trabajo" / description about "xxx"
      r.push({ find: 'Modalidad de trabajo', replace: cols[0]?.title || '' })
      r.push({
        find: 'Entrevistamos al equipo de trabajo para entender la dinámica diaria y los problemas recurrentes en "xxx". Es la etapa donde seleccionamos los procesos sobre los cuales haremos foco.',
        replace: cols[0]?.items?.join('\n') || '',
      })
      // Template column 2: "El objetivo es doble"
      r.push({ find: 'El objetivo es doble', replace: cols[1]?.title || '' })
      r.push({
        find: 'Conocerlos y presentarnos para explicarles en qué podemos ayudarlos y conseguir armar las bases del trabajo en equipo.',
        replace: cols[1]?.items?.join('\n') || '',
      })
      // Template column 3: "Entregables"
      r.push({ find: 'Entregables', replace: cols[2]?.title || '' })
      r.push({
        find: 'Presentaremos el diagnóstico con el mapa de procesos a la gerencia de "xxxx" con el orden de prioridad de los pasos a seguir y el cronograma propuesto.',
        replace: cols[2]?.items?.join('\n') || '',
      })
      r.push({ find: 'Duración: 4-6 semanas', replace: c.duration ? `Duración: ${c.duration}` : '' })
      r.push({ find: 'xxx', replace: clientName })
      r.push({ find: 'xxxx', replace: clientName })
      break
    }

    case 'highlight_statement': {
      const c = plan.content as { statement?: string; supporting?: string }
      r.push({ find: '¿Dónde estamos ahora?', replace: c.statement || plan.title || '' })
      r.push({ find: 'Diagnóstico', replace: '' })
      r.push({ find: 'Desarrollo de actividades', replace: c.supporting || '' })
      r.push({ find: 'Diseño de métricas', replace: '' })
      break
    }

    case 'method_card': {
      const c = plan.content as { title?: string; description?: string }
      r.push({ find: 'Método utilizado', replace: plan.title || 'Método utilizado' })
      r.push({ find: 'Encuestas y entrevistas', replace: c.title || '' })
      r.push({ find: 'Indagación de roles, procesos, y métricas', replace: c.description || '' })
      break
    }

    case 'bullet_list_rounded': {
      const c = plan.content as { title?: string; items?: string[] }
      const items = c.items || []
      r.push({ find: 'Acerca de los entrevistados', replace: c.title || plan.title || '' })
      r.push({ find: 'Situaciones encontradas', replace: c.title || plan.title || '' })
      r.push({ find: 'Índice', replace: c.title || plan.title || '' })
      // Replace the known template bullet items
      const templateItems = [
        'En general, apertura y buena predisposición',
        'Para varias personas fue un "desahogo" la entrevista',
        'Fallas en comunicación como factor común',
        'Roles y funciones: no estan definidos y/o comunicados.',
        'Procesos: basados en usos y costumbres. No estandarizados.',
        'KPIs: no están difundidos. Falta control.',
        'Formación de nuevo personal',
        'Comunicación',
      ]
      templateItems.forEach((old, i) => {
        r.push({ find: old, replace: items[i] || '' })
      })
      // Any remaining "xx" or "xxxx" placeholders
      r.push({ find: 'xxxx', replace: items[3] || '' })
      r.push({ find: 'xx', replace: '' })
      break
    }

    case 'quotes_grid': {
      const c = plan.content as { title?: string; quotes?: string[] }
      const quotes = c.quotes || []
      r.push({ find: 'Empresa dice:', replace: c.title || 'La empresa dice:' })
      // Replace the 6 template quotes
      const templateQuotes = [
        '"No hay diferencia entre clientes grandes y chicos".',
        '"El ambiente es agradable, hay buen clima"',
        '"Tenemos que mejorar la comunicación entre un área y otra"',
        '"Siempre tratamos de llegar a una solución"',
        '"Tendríamos que respetar más los tiempos de entrega"',
        '"Se trabaja con mucha libertad y nos ayudamos entre todos"',
      ]
      templateQuotes.forEach((old, i) => {
        r.push({ find: old, replace: quotes[i] ? `"${quotes[i]}"` : '' })
      })
      break
    }

    case 'situation_improvement': {
      const c = plan.content as { title?: string; rows?: { situation: string; improvement: string }[] }
      const rows = c.rows || []
      r.push({ find: 'Síntomas en el anteproyecto', replace: c.title || plan.title || '' })
      r.push({ find: 'Crisis de crecimiento', replace: rows[0]?.situation || '' })
      r.push({ find: 'El crecimiento sostenido necesita organización.', replace: rows[0]?.improvement || '' })
      // The table version (slide 12) has "Proceso/Situacion encontrada/Impacto/Propuesta de mejora" headers
      // and "xx" cells. We can replace the "xx" values but since they're all "xx" we can only do one pass.
      // Best effort: put all content in a summary approach
      if (rows.length > 0) {
        r.push({ find: 'Situacion encontrada', replace: 'Situación encontrada' })
        r.push({ find: 'Propuesta de mejora', replace: 'Propuesta de mejora' })
        // For "xx" cells: we can only set them all to the same thing with replaceAllText
        // Use the first pair
        r.push({ find: 'xx', replace: rows[0]?.situation || '' })
      }
      break
    }

    case 'value_chain': {
      const c = plan.content as { title?: string; steps?: { number?: number; name: string; criticalFailure?: string }[] }
      const steps = c.steps || []
      r.push({ find: 'Posibles causas', replace: c.title || plan.title || '' })
      r.push({ find: 'Organigrama desconocido por las personas', replace: steps[0]?.name || '' })
      r.push({ find: '"Duplicidad" de tareas…', replace: steps[1]?.name || '' })
      r.push({ find: 'Identificación de responsabilidades sin claridad', replace: steps[2]?.name || '' })
      r.push({ find: 'xx', replace: '' })
      break
    }

    case 'two_column_analysis': {
      const c = plan.content as { title?: string; leftLabel?: string; rightLabel?: string; rows?: { left: string; right: string }[] }
      const rows = c.rows || []
      r.push({ find: '(Título)', replace: c.title || plan.title || '' })
      r.push({ find: 'Objetivos', replace: c.leftLabel || 'Situación actual' })
      r.push({ find: 'Productos', replace: c.rightLabel || 'Propuesta' })
      r.push({ find: 'XX', replace: rows[0]?.left || '' })
      r.push({ find: 'xx', replace: rows[0]?.right || '' })
      break
    }

    case 'leverage_points':
    case 'concept_definition': {
      const c = plan.content as { title?: string; points?: string[]; valuePoints?: string[]; concept?: string; what?: string }
      const items = c.points || c.valuePoints || []
      r.push({ find: '(Título)', replace: c.title || c.concept || plan.title || '' })
      r.push({ find: 'XX', replace: items[0] || '' })
      r.push({ find: 'xx', replace: '' })
      break
    }

    case 'next_steps': {
      const c = plan.content as { steps?: string[] }
      const steps = c.steps || []
      r.push({ find: '¿Cómo seguimos?', replace: plan.title || '¿Cómo seguimos?' })
      r.push({ find: 'Próximos pasos', replace: plan.title || 'Próximos pasos' })
      r.push({ find: 'Herramientas de gestión', replace: steps[0] || '' })
      r.push({ find: 'Mejora de Procesos', replace: steps[1] || '' })
      r.push({ find: 'Herramientas de Administración', replace: steps[2] || '' })
      r.push({ find: 'Estructura', replace: steps[3] || '' })
      r.push({ find: 'XX', replace: steps[0] || '' })
      r.push({ find: 'xx', replace: '' })
      break
    }

    case 'action_plan_gantt': {
      const c = plan.content as { initiatives?: { name: string }[] }
      const initiatives = (c.initiatives || []).slice(0, 8)
      r.push({ find: 'Plan de Acción', replace: plan.title || 'Plan de Acción' })
      // The Gantt template has "XX" ×8 for initiative names
      initiatives.forEach((init, i) => {
        if (i === 0) r.push({ find: 'XX', replace: init.name })
      })
      break
    }

    case 'closing': {
      const c = plan.content as { contactEmail?: string; contactPhone?: string; website?: string }
      r.push({ find: '¡Gracias!', replace: '¡Gracias!' })
      r.push({
        find: '11 5125 9300 | paula@pchconsultora.com | www.pchconsultora.com',
        replace: [c.contactPhone, c.contactEmail, c.website].filter(Boolean).join(' | '),
      })
      break
    }
  }

  return r
}

/**
 * Get the 0-based template slide index for a given slide plan type.
 */
function getTemplateIndex(plan: SlidePlan): number {
  // Special-case section dividers by their sectionLabel content
  if (plan.type === 'section_divider') {
    const label = (plan.content as { label?: string }).label || plan.sectionLabel || ''
    const lower = label.toLowerCase()
    if (lower.includes('situaciones detectadas') || lower.includes('situaciones encontradas')) return 8
    if (lower.includes('ejes') || lower.includes('propuestas')) return 23
    if (lower.includes('general') || lower.includes('particular') || lower.includes('estructura')) return 11
    return 2
  }
  if (plan.type === 'next_steps') return 29
  if (plan.type === 'two_column_analysis') {
    // Use the simpler two-col layout (index 17) for most
    return 17
  }
  return TYPE_TO_TEMPLATE_INDEX[plan.type] ?? 13 // default to bullet_list
}

export async function createPresentationFromTemplate(
  slidePlan: SlidePlan[],
  accessToken: string,
  clientName: string
): Promise<string> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const driveApi = google.drive({ version: 'v3', auth })
  const slidesApi = google.slides({ version: 'v1', auth })

  // 1. Copy the PCH template
  const copy = await driveApi.files.copy({
    fileId: PCH_TEMPLATE_ID,
    requestBody: { name: `${clientName} — Diagnóstico PCH` },
    fields: 'id,webViewLink',
  })
  const presentationId = copy.data.id!

  // 2. Read the template slide IDs
  const pres = await slidesApi.presentations.get({
    presentationId,
    fields: 'slides.objectId',
  })
  const templateSlideIds = (pres.data.slides || []).map(s => s.objectId!)

  // 3. Duplicate the needed slides
  const requests: slides_v1.Schema$Request[] = []
  const newSlideIds: string[] = []

  for (let i = 0; i < slidePlan.length; i++) {
    const plan = slidePlan[i]
    const templateIdx = getTemplateIndex(plan)
    const sourceId = templateSlideIds[templateIdx] || templateSlideIds[0]
    const newId = `gen_slide_${i}_${Date.now()}`
    newSlideIds.push(newId)
    requests.push({
      duplicateObject: {
        objectId: sourceId,
        objectIds: { [sourceId]: newId },
      },
    })
  }

  // 4. Delete all original template slides
  for (const id of templateSlideIds) {
    requests.push({ deleteObject: { objectId: id } })
  }

  await slidesApi.presentations.batchUpdate({
    presentationId,
    requestBody: { requests },
  })

  // 5. Replace text on each new slide
  const period = (slidePlan.find(s => s.type === 'cover')?.content as { period?: string })?.period || ''

  for (let i = 0; i < newSlideIds.length; i++) {
    const slideId = newSlideIds[i]
    const plan = slidePlan[i]
    const replacements = buildReplacements(plan, clientName, period)

    const repRequests: slides_v1.Schema$Request[] = replacements
      .filter(r => r.find && r.find !== r.replace)
      .map(r => ({
        replaceAllText: {
          containsText: { text: r.find, matchCase: true },
          replaceText: r.replace,
          pageObjectIds: [slideId],
        },
      }))

    if (repRequests.length > 0) {
      try {
        await slidesApi.presentations.batchUpdate({
          presentationId,
          requestBody: { requests: repRequests },
        })
      } catch (e) {
        console.warn(`Text replace warning on slide ${i} (${plan.type}):`, e)
      }
    }
  }

  const file = await driveApi.files.get({ fileId: presentationId, fields: 'webViewLink' })
  return file.data.webViewLink || `https://docs.google.com/presentation/d/${presentationId}/edit`
}
