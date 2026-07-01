/**
 * PCH Diagnóstico — PPTX generator using pptxgenjs.
 *
 * Generates a .pptx file in memory with the exact PCH design system,
 * then uploads it to Google Drive as a Google Slides file.
 *
 * Design tokens:
 *   navyDeep  #011533   dark bg, circles
 *   navyLight #cfdef5   light content bg
 *   lime      #e0fcad   title boxes, highlights
 *   orange    #fe572a   accents, dots, lines
 *   slate     #6b7a8d   cards, supporting text
 *   white     #ffffff
 */

import PptxGenJS from 'pptxgenjs'
import { Readable } from 'stream'
import { existsSync } from 'fs'
import path from 'path'
import { SlidePlan } from './slideTypes'

function slidePng(name: string): string | null {
  const p = path.join(process.cwd(), 'public', 'slides', name)
  return existsSync(p) ? p : null
}

// ─── Color palette ───────────────────────────────────────────────────────────
const C = {
  navy:    '011533',
  light:   'cfdef5',
  lime:    'e0fcad',
  orange:  'fe572a',
  slate:   '6b7a8d',
  white:   'FFFFFF',
  black:   '000000',
  darkLine:'1a2a47',
}

// ─── Slide dimensions (10" × 5.625") ─────────────────────────────────────────
const W = 10
const H = 5.625

// ─── Font ────────────────────────────────────────────────────────────────────
const FONT = 'Montserrat'

function font(size: number, bold = false, color = C.black): PptxGenJS.TextPropsOptions {
  return { fontFace: FONT, fontSize: size, bold, color }
}

// ─── Shared design helpers ────────────────────────────────────────────────────

/** Dark navy background + subtle diagonal decorative rectangles */
function darkBg(slide: PptxGenJS.Slide) {
  slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: C.navy }, line: { color: C.navy } })
  // Diagonal strips (rotated slightly)
  const strips = [
    { x: 6.8, y: -0.5, w: 0.18, h: H + 1 },
    { x: 7.6, y: -0.3, w: 0.14, h: H + 0.8 },
    { x: 8.2, y: 0.1,  w: 0.09, h: H + 0.3 },
  ]
  strips.forEach(s => {
    slide.addShape('rect', {
      x: s.x, y: s.y, w: s.w, h: s.h,
      rotate: 8,
      fill: { color: C.darkLine },
      line: { color: C.darkLine },
    })
  })
}

/** Light background (white or navyLight) */
function lightBg(slide: PptxGenJS.Slide, color = C.white) {
  slide.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color }, line: { color } })
}

/**
 * Standard light-slide header:
 *   lime box → title text → orange dot + line + dot
 */
function lightHeader(slide: PptxGenJS.Slide, title: string, y = 0.32) {
  // Lime background pill behind title
  slide.addShape('rect', {
    x: 0.38, y, w: Math.min(title.length * 0.13 + 0.4, 7.5), h: 0.46,
    fill: { color: C.lime }, line: { color: C.lime }, rectRadius: 0.04,
  })
  // Title text
  slide.addText(title, {
    x: 0.5, y: y + 0.02, w: 8.5, h: 0.44,
    ...font(17, true), align: 'left', valign: 'middle',
  })
  // Orange accent line with dots
  const lineY = y + 0.65
  slide.addShape('ellipse', { x: 0.38, y: lineY - 0.05, w: 0.10, h: 0.10, fill: { color: C.orange }, line: { color: C.orange } })
  slide.addShape('rect',   { x: 0.48, y: lineY, w: 9.12, h: 0.02, fill: { color: C.orange }, line: { color: C.orange } })
  slide.addShape('ellipse', { x: 9.52, y: lineY - 0.05, w: 0.10, h: 0.10, fill: { color: C.orange }, line: { color: C.orange } })
}

/** Rounded slate-gray card */
function card(slide: PptxGenJS.Slide, x: number, y: number, w: number, h: number, text: string, textSize = 11) {
  slide.addShape('rect', { x, y, w, h, fill: { color: C.slate }, line: { color: C.slate }, rectRadius: 0.12 })
  slide.addText(text, { x: x + 0.12, y, w: w - 0.24, h, ...font(textSize, false, C.white), align: 'left', valign: 'middle', wrap: true })
}

/** Navy filled circle with white number/text */
function circle(slide: PptxGenJS.Slide, x: number, y: number, d: number, label: string) {
  slide.addShape('ellipse', { x, y, w: d, h: d, fill: { color: C.navy }, line: { color: C.navy } })
  slide.addText(label, { x, y, w: d, h: d, ...font(d > 0.4 ? 14 : 11, true, C.white), align: 'center', valign: 'middle' })
}

/** Orange label rectangle (used in dark slides) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function orangeLabel(slide: PptxGenJS.Slide, x: number, y: number, w: number, h: number, text: string) {
  slide.addShape('rect', { x, y, w, h, fill: { color: C.orange }, line: { color: C.orange }, rectRadius: 0.06 })
  slide.addText(text, { x, y, w, h, ...font(13, true, C.white), align: 'center', valign: 'middle' })
}

// ─── Slide renderers ──────────────────────────────────────────────────────────

function renderCover(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  const c = plan.content as { clientName?: string; period?: string }

  // Dark navy background with diagonal decorative strips (matching template)
  darkBg(slide)

  // PCH logo area (top-left)
  slide.addText('▷ PCH', {
    x: 0.42, y: 0.32, w: 3.5, h: 0.65,
    ...font(26, true, C.white), align: 'left', valign: 'middle',
  })

  // Client name box — lime background like template
  const name = c.clientName || ''
  slide.addShape('rect', {
    x: 0.42, y: 2.9, w: 5.8, h: 0.72,
    fill: { color: C.lime }, line: { color: C.lime }, rectRadius: 0.06,
  })
  slide.addText(name, {
    x: 0.55, y: 2.92, w: 5.6, h: 0.68,
    ...font(22, true, C.navy), align: 'left', valign: 'middle',
  })

  // Period + realizador
  slide.addText(`${c.period || ''}  ·  Realizado por: PCH Consultora`, {
    x: 0.42, y: 3.74, w: 8.5, h: 0.38,
    ...font(12, false, C.light), align: 'left', valign: 'middle',
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function renderRules(prs: PptxGenJS, _plan?: SlidePlan) {
  const slide = prs.addSlide()
  const bg = slidePng('rules.png')
  if (bg) {
    // Fixed slide: full PNG, no overlay needed
    slide.addImage({ path: bg, x: 0, y: 0, w: W, h: H })
  } else {
    lightBg(slide)
    lightHeader(slide, 'Reglas de la reunión')
    const rules = ['Evitar el ping-pong', 'Tomar nota', 'Preguntas al final']
    rules.forEach((text, i) => {
      const x = 4.8
      const y = 1.2 + i * 1.2
      circle(slide, x - 0.6, y + 0.05, 0.48, '✱')
      slide.addShape('rect', { x, y, w: 4.8, h: 0.6, fill: { color: C.slate }, line: { color: C.slate }, rectRadius: 0.35 })
      slide.addText(text, { x: x + 0.2, y, w: 4.4, h: 0.6, ...font(13, true, C.white), align: 'left', valign: 'middle' })
    })
  }
}

function renderSectionDivider(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  const c = plan.content as { label?: string; sublabel?: string }
  const label = c.label || plan.sectionLabel || ''
  const sublabel = c.sublabel || ''
  const bg = slidePng('divider.png')

  if (bg) {
    slide.addImage({ path: bg, x: 0, y: 0, w: W, h: H })
  } else {
    darkBg(slide)
  }

  // Two stacked orange boxes when sublabel present, one box otherwise
  if (sublabel) {
    const box1W = Math.min(label.length * 0.19 + 0.8, 8.5)
    const box2W = Math.min(sublabel.length * 0.19 + 0.8, 8.5)
    slide.addShape('rect', { x: 0.5, y: 2.0, w: box1W, h: 0.72, fill: { color: C.orange }, line: { color: C.orange }, rectRadius: 0.06 })
    slide.addText(label, { x: 0.5, y: 2.0, w: box1W, h: 0.72, ...font(18, true, C.white), align: 'center', valign: 'middle' })
    slide.addShape('rect', { x: 0.5, y: 2.82, w: box2W, h: 0.72, fill: { color: C.orange }, line: { color: C.orange }, rectRadius: 0.06 })
    slide.addText(sublabel, { x: 0.5, y: 2.82, w: box2W, h: 0.72, ...font(18, true, C.white), align: 'center', valign: 'middle' })
  } else {
    const labelW = Math.min(label.length * 0.19 + 0.8, 8.5)
    slide.addShape('rect', { x: 0.5, y: 2.3, w: labelW, h: 0.82, fill: { color: C.orange }, line: { color: C.orange }, rectRadius: 0.06 })
    slide.addText(label, { x: 0.5, y: 2.3, w: labelW, h: 0.82, ...font(20, true, C.white), align: 'center', valign: 'middle' })
  }
}

function renderIntroColumns(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { columns?: { title: string; subtitle?: string; items: string[] }[]; duration?: string }
  const cols = c.columns || []

  // Vertical orange divider at center
  slide.addShape('rect', { x: 4.93, y: 0.28, w: 0.03, h: 5.1, fill: { color: C.orange }, line: { color: C.orange } })

  cols.forEach((col, i) => {
    const x = i === 0 ? 0.32 : 5.1
    const w = 4.45

    // Column title — lime box
    const titleW = Math.min(col.title.length * 0.125 + 0.3, w)
    slide.addShape('rect', { x, y: 0.28, w: titleW, h: 0.44, fill: { color: C.lime }, line: { color: C.lime }, rectRadius: 0.04 })
    slide.addText(col.title, { x: x + 0.06, y: 0.3, w: titleW - 0.08, h: 0.42, ...font(16, true), align: 'left', valign: 'middle' })

    // Orange underline with dot
    const lineY = 0.86
    slide.addShape('ellipse', { x, y: lineY - 0.045, w: 0.09, h: 0.09, fill: { color: C.orange }, line: { color: C.orange } })
    slide.addShape('rect', { x: x + 0.09, y: lineY, w: w - 0.09, h: 0.018, fill: { color: C.orange }, line: { color: C.orange } })

    // Gray card
    slide.addShape('rect', { x, y: 1.06, w, h: 4.22, fill: { color: C.slate }, line: { color: C.slate }, rectRadius: 0.14 })

    // Icon circle (navy with + symbol, matching template)
    slide.addShape('ellipse', { x: x + 0.18, y: 1.16, w: 0.52, h: 0.52, fill: { color: C.navy }, line: { color: C.navy } })
    slide.addText('+', { x: x + 0.18, y: 1.16, w: 0.52, h: 0.52, ...font(18, true, C.white), align: 'center', valign: 'middle' })

    // Subtitle in orange next to icon (if present)
    const subtitle = col.subtitle || ''
    if (subtitle) {
      slide.addText(subtitle, {
        x: x + 0.78, y: 1.16, w: w - 0.9, h: 0.52,
        ...font(13, true, C.orange), align: 'left', valign: 'middle', wrap: true,
      })
    }

    // Bullet items
    const bullets = col.items.map(it => `• ${it}`).join('\n')
    slide.addText(bullets, {
      x: x + 0.14, y: 1.82, w: w - 0.28, h: 3.34,
      ...font(11, false, C.white), align: 'left', valign: 'top', wrap: true, lineSpacingMultiple: 1.3,
    })
  })
}

function renderHighlightStatement(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  darkBg(slide)
  const c = plan.content as { statement?: string; supporting?: string }
  const statement = c.statement || plan.title || ''
  const supporting = c.supporting || ''

  // Big statement in lime box
  slide.addShape('rect', { x: 0.5, y: 1.4, w: 9.0, h: 1.6, fill: { color: C.lime }, line: { color: C.lime }, rectRadius: 0.1 })
  slide.addText(statement, {
    x: 0.7, y: 1.44, w: 8.6, h: 1.52,
    ...font(22, true), align: 'left', valign: 'middle', wrap: true,
  })

  if (supporting) {
    slide.addText(supporting, {
      x: 0.5, y: 3.2, w: 9.0, h: 1.5,
      ...font(13, false, C.light), align: 'left', valign: 'top', wrap: true,
    })
  }
}

function renderMethodCard(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { title?: string; description?: string }

  lightHeader(slide, plan.title || 'Método utilizado')

  // Single big card
  slide.addShape('rect', { x: 0.4, y: 1.3, w: 9.2, h: 3.5, fill: { color: C.slate }, line: { color: C.slate }, rectRadius: 0.15 })
  circle(slide, 0.7, 1.55, 0.6, '?')
  slide.addText(c.title || '', { x: 1.5, y: 1.6, w: 7.8, h: 0.5, ...font(16, true, C.white), align: 'left', valign: 'middle' })
  // Orange separator
  slide.addShape('rect', { x: 0.6, y: 2.22, w: 8.8, h: 0.02, fill: { color: C.orange }, line: { color: C.orange } })
  slide.addText(c.description || '', {
    x: 0.6, y: 2.32, w: 8.8, h: 2.3,
    ...font(12, false, C.white), align: 'left', valign: 'top', wrap: true,
  })
}

function renderBulletList(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide, C.light)
  const c = plan.content as { title?: string; items?: string[] }
  const items = c.items || []
  const title = c.title || plan.title || ''

  // Title section on the left (lime box + orange underline, like template slide 5)
  const titleW = Math.min(title.length * 0.145 + 0.3, 4.2)
  slide.addShape('rect', { x: 0.38, y: 2.55, w: titleW, h: 0.52, fill: { color: C.lime }, line: { color: C.lime }, rectRadius: 0.04 })
  slide.addText(title, { x: 0.46, y: 2.57, w: titleW - 0.08, h: 0.48, ...font(16, true), align: 'left', valign: 'middle', wrap: true })
  const lineY = 3.22
  slide.addShape('ellipse', { x: 0.38, y: lineY - 0.045, w: 0.09, h: 0.09, fill: { color: C.orange }, line: { color: C.orange } })
  slide.addShape('rect', { x: 0.47, y: lineY, w: 4.2, h: 0.018, fill: { color: C.orange }, line: { color: C.orange } })

  // Vertical orange divider
  slide.addShape('rect', { x: 4.93, y: 0.28, w: 0.03, h: 5.1, fill: { color: C.orange }, line: { color: C.orange } })

  // Bullets on the right
  const maxItems = Math.min(items.length, 6)
  const spacing = Math.min(0.85, (5.1) / (maxItems || 1))
  items.slice(0, maxItems).forEach((item, i) => {
    const y = 0.5 + i * spacing
    slide.addShape('ellipse', { x: 5.18, y: y + 0.16, w: 0.16, h: 0.16, fill: { color: C.navy }, line: { color: C.navy } })
    slide.addText(item, { x: 5.46, y, w: 4.2, h: spacing * 0.95, ...font(12, false, C.navy), align: 'left', valign: 'middle', wrap: true })
  })
}

function renderQuotesGrid(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { title?: string; quotes?: string[] }
  const quotes = (c.quotes || []).slice(0, 6)
  const title = c.title || plan.title || 'La empresa dice:'

  // Title on the left (same style as bullet_list slide)
  const titleW = Math.min(title.length * 0.145 + 0.3, 3.8)
  slide.addShape('rect', { x: 0.38, y: 2.45, w: titleW, h: 0.52, fill: { color: C.lime }, line: { color: C.lime }, rectRadius: 0.04 })
  slide.addText(title, { x: 0.46, y: 2.47, w: titleW - 0.08, h: 0.48, ...font(16, true), align: 'left', valign: 'middle', wrap: true })
  const lineY = 3.12
  slide.addShape('ellipse', { x: 0.38, y: lineY - 0.045, w: 0.09, h: 0.09, fill: { color: C.orange }, line: { color: C.orange } })
  slide.addShape('rect', { x: 0.47, y: lineY, w: 3.6, h: 0.018, fill: { color: C.orange }, line: { color: C.orange } })

  // 2-column quote grid on the right
  const gridX = 4.25
  const gridW = 2.7
  const numRows = Math.ceil(quotes.length / 2)
  const cardH = Math.min((5.35) / numRows - 0.1, 1.75)

  quotes.forEach((q, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = gridX + col * (gridW + 0.1)
    const y = 0.1 + row * (cardH + 0.1)
    slide.addShape('rect', { x, y, w: gridW, h: cardH, fill: { color: C.slate }, line: { color: C.slate }, rectRadius: 0.1 })
    slide.addText(`"${q}"`, { x: x + 0.14, y: y + 0.08, w: gridW - 0.28, h: cardH - 0.16, ...font(11, false, C.white), align: 'left', valign: 'middle', wrap: true, italic: true })
  })
}

function renderSituationImprovement(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { title?: string; rows?: { situation: string; improvement: string }[] }
  const rows = (c.rows || []).slice(0, 4)

  lightHeader(slide, c.title || plan.title || '')

  // Table headers
  const headers = ['Situación encontrada', 'Propuesta de mejora']
  headers.forEach((h, i) => {
    const x = i === 0 ? 0.4 : 5.2
    slide.addShape('rect', { x, y: 1.18, w: 4.5, h: 0.38, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.04 })
    slide.addText(h, { x, y: 1.18, w: 4.5, h: 0.38, ...font(11, true, C.white), align: 'center', valign: 'middle' })
  })

  const rowH = Math.min((3.9) / rows.length - 0.08, 1.0)
  rows.forEach((row, i) => {
    const y = 1.64 + i * (rowH + 0.08)
    card(slide, 0.4, y, 4.5, rowH, row.situation, 10)
    // Arrow
    slide.addText('→', { x: 4.94, y, w: 0.22, h: rowH, ...font(14, false, C.orange), align: 'center', valign: 'middle' })
    card(slide, 5.2, y, 4.5, rowH, row.improvement, 10)
  })
}

function renderTwoColumn(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { title?: string; leftLabel?: string; rightLabel?: string; rows?: { left: string; right: string }[] }
  const rows = (c.rows || []).slice(0, 5)

  lightHeader(slide, c.title || plan.title || '')

  // Column headers in lime
  const headers = [c.leftLabel || 'Situación actual', c.rightLabel || 'Propuesta']
  headers.forEach((h, i) => {
    const x = i === 0 ? 0.4 : 5.2
    slide.addShape('rect', { x, y: 1.18, w: 4.5, h: 0.38, fill: { color: C.lime }, line: { color: C.lime }, rectRadius: 0.04 })
    slide.addText(h, { x, y: 1.18, w: 4.5, h: 0.38, ...font(11, true), align: 'center', valign: 'middle' })
  })

  const rowH = Math.min((3.85) / rows.length - 0.08, 0.9)
  rows.forEach((row, i) => {
    const y = 1.64 + i * (rowH + 0.08)
    slide.addShape('rect', { x: 0.4, y, w: 4.5, h: rowH, fill: { color: C.light }, line: { color: C.light }, rectRadius: 0.06 })
    slide.addText(row.left, { x: 0.52, y, w: 4.26, h: rowH, ...font(10), align: 'left', valign: 'middle', wrap: true })
    slide.addShape('rect', { x: 5.2, y, w: 4.5, h: rowH, fill: { color: C.light }, line: { color: C.light }, rectRadius: 0.06 })
    slide.addText(row.right, { x: 5.32, y, w: 4.26, h: rowH, ...font(10), align: 'left', valign: 'middle', wrap: true })
  })
}

function renderValueChain(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { title?: string; steps?: { number?: number; name: string; area?: string; criticalFailure?: string }[] }
  const steps = (c.steps || []).slice(0, 5)

  lightHeader(slide, c.title || plan.title || '')

  const stepW = steps.length > 0 ? Math.min((W - 0.8) / steps.length - 0.1, 2.1) : 2
  steps.forEach((step, i) => {
    const x = 0.4 + i * (stepW + 0.1)
    const y = 1.3
    // Step number header
    slide.addShape('rect', { x, y, w: stepW, h: 0.45, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.06 })
    slide.addText(step.name, { x, y, w: stepW, h: 0.45, ...font(10, true, C.white), align: 'center', valign: 'middle', wrap: true })
    // Arrow between steps
    if (i < steps.length - 1) {
      slide.addText('▶', { x: x + stepW + 0.01, y: y + 0.1, w: 0.08, h: 0.25, ...font(9, false, C.orange), align: 'center' })
    }
    // Failure box below
    if (step.criticalFailure) {
      card(slide, x, y + 0.55, stepW, 1.8, step.criticalFailure, 9)
    }
    // Area tag at bottom
    if (step.area) {
      slide.addShape('rect', { x, y: y + 2.45, w: stepW, h: 0.32, fill: { color: C.orange }, line: { color: C.orange }, rectRadius: 0.04 })
      slide.addText(step.area, { x, y: y + 2.45, w: stepW, h: 0.32, ...font(9, true, C.white), align: 'center', valign: 'middle' })
    }
  })
}

function renderLeveragePoints(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide, C.light)
  const c = plan.content as { title?: string; points?: string[] }
  const points = (c.points || []).slice(0, 6)

  lightHeader(slide, c.title || plan.title || '')

  const cols = 2
  const rows = Math.ceil(points.length / cols)
  const cardW = 4.4
  const cardH = Math.min((4.0) / rows - 0.12, 1.4)

  points.forEach((p, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = col === 0 ? 0.4 : 5.2
    const y = 1.15 + row * (cardH + 0.12)
    // Lime card
    slide.addShape('rect', { x, y, w: cardW, h: cardH, fill: { color: C.lime }, line: { color: C.lime }, rectRadius: 0.1 })
    slide.addText(p, { x: x + 0.14, y, w: cardW - 0.28, h: cardH, ...font(11), align: 'left', valign: 'middle', wrap: true })
  })
}

function renderNextSteps(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { steps?: string[] }
  const steps = (c.steps || []).slice(0, 3)

  lightHeader(slide, plan.title || '¿Cómo seguimos?')

  steps.forEach((step, i) => {
    const y = 1.3 + i * 1.35
    // Navy step band
    slide.addShape('rect', { x: 0.4, y, w: 9.2, h: 0.42, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.06 })
    circle(slide, 0.42, y - 0.02, 0.46, String(i + 1))
    slide.addText(step, { x: 1.0, y, w: 8.4, h: 0.42, ...font(12, true, C.white), align: 'left', valign: 'middle', wrap: true })
    // Light band below
    slide.addShape('rect', { x: 0.4, y: y + 0.42, w: 9.2, h: 0.78, fill: { color: C.light }, line: { color: C.light }, rectRadius: 0 })
  })
}

function renderGantt(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { initiatives?: { name: string; startMonth: number; durationMonths: number }[]; totalMonths?: number }
  const initiatives = (c.initiatives || []).slice(0, 8)
  const totalMonths = c.totalMonths || 5

  const title = plan.title || `Plan de acción — Horizonte ${totalMonths} meses`
  lightHeader(slide, title)

  const labelW = 3.1
  const barStartX = labelW + 0.4
  const gridW = W - barStartX - 0.25
  const monthW = gridW / totalMonths
  const headerY = 1.12
  const rowH = Math.min(0.56, (H - headerY - 0.56) / (initiatives.length || 1) - 0.05)

  // Month column headers
  for (let m = 0; m < totalMonths; m++) {
    const x = barStartX + m * monthW
    slide.addShape('rect', { x, y: headerY, w: monthW - 0.04, h: 0.4, fill: { color: C.navy }, line: { color: C.navy } })
    slide.addText(`MES ${m + 1}`, { x, y: headerY, w: monthW - 0.04, h: 0.4, ...font(9, true, C.white), align: 'center', valign: 'middle' })
  }

  initiatives.forEach((init, i) => {
    const y = headerY + 0.46 + i * (rowH + 0.05)
    // Row label in orange box
    slide.addShape('rect', { x: 0.25, y, w: labelW, h: rowH, fill: { color: C.orange }, line: { color: C.orange } })
    slide.addText(init.name, { x: 0.32, y, w: labelW - 0.14, h: rowH, ...font(9, true, C.white), align: 'left', valign: 'middle', wrap: true })
    // Gantt bar in lime
    const barX = barStartX + (Math.max(1, init.startMonth) - 1) * monthW
    const barW = Math.max(0.1, init.durationMonths * monthW - 0.08)
    slide.addShape('rect', { x: barX, y: y + rowH * 0.15, w: barW, h: rowH * 0.7, fill: { color: C.lime }, line: { color: C.lime }, rectRadius: 0.04 })
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function renderClosing(prs: PptxGenJS, _plan?: SlidePlan) {
  const slide = prs.addSlide()
  const bg = slidePng('closing.png')
  if (bg) {
    // Fixed slide: full PNG, no overlay needed
    slide.addImage({ path: bg, x: 0, y: 0, w: W, h: H })
  } else {
    darkBg(slide)
    slide.addText('¡Gracias!', {
      x: 0.5, y: 1.6, w: 9.0, h: 1.8,
      ...font(64, true, C.white), align: 'right', valign: 'middle',
    })
    slide.addText('PCH Consultora', {
      x: 0.5, y: 4.9, w: 9.0, h: 0.4,
      ...font(10, false, C.slate), align: 'left',
    })
  }
}

function renderConceptDefinition(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { concept?: string; what?: string; valuePoints?: string[] }

  lightHeader(slide, c.concept || plan.title || '')

  if (c.what) {
    slide.addText(c.what, { x: 0.4, y: 1.2, w: 9.2, h: 0.7, ...font(13), align: 'left', valign: 'middle', wrap: true })
  }

  const points = (c.valuePoints || []).slice(0, 4)
  points.forEach((p, i) => {
    const x = i % 2 === 0 ? 0.4 : 5.2
    const y = 2.0 + Math.floor(i / 2) * 1.4
    card(slide, x, y, 4.4, 1.2, p, 11)
  })
}

function renderProcessMap(prs: PptxGenJS, plan: SlidePlan) {
  const slide = prs.addSlide()
  lightBg(slide)
  const c = plan.content as { title?: string; levels?: { name: string; processes: string[] }[] }
  const levels = (c.levels || []).slice(0, 3)

  lightHeader(slide, c.title || plan.title || 'Mapa de procesos')

  const colW = (W - 0.8) / Math.max(levels.length, 1)
  levels.forEach((level, i) => {
    const x = 0.4 + i * colW
    slide.addShape('rect', { x, y: 1.2, w: colW - 0.1, h: 0.38, fill: { color: C.navy }, line: { color: C.navy }, rectRadius: 0.04 })
    slide.addText(level.name, { x, y: 1.2, w: colW - 0.1, h: 0.38, ...font(10, true, C.white), align: 'center', valign: 'middle' })

    level.processes.slice(0, 6).forEach((proc, j) => {
      card(slide, x + 0.04, 1.66 + j * 0.62, colW - 0.18, 0.52, proc, 9)
    })
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────

const RENDERERS: Record<string, (prs: PptxGenJS, plan: SlidePlan) => void> = {
  cover:                renderCover,
  rules:                renderRules,
  section_divider:      renderSectionDivider,
  intro_columns:        renderIntroColumns,
  highlight_statement:  renderHighlightStatement,
  method_card:          renderMethodCard,
  bullet_list_rounded:  renderBulletList,
  quotes_grid:          renderQuotesGrid,
  situation_improvement:renderSituationImprovement,
  two_column_analysis:  renderTwoColumn,
  value_chain:          renderValueChain,
  leverage_points:      renderLeveragePoints,
  concept_definition:   renderConceptDefinition,
  next_steps:           renderNextSteps,
  action_plan_gantt:    renderGantt,
  process_map:          renderProcessMap,
  closing:              renderClosing,
}

/**
 * Generate a .pptx Buffer with full PCH design, then upload it to
 * Google Drive as a Google Slides file. Returns the presentation URL.
 */
export async function generateAndUploadPptx(
  slidePlan: SlidePlan[],
  accessToken: string,
  clientName: string
): Promise<string> {
  // 1. Build the PPTX in memory
  const prs = new PptxGenJS()
  prs.layout = 'LAYOUT_WIDE'
  prs.defineLayout({ name: 'WIDE', width: W, height: H })
  prs.layout = 'WIDE'

  for (const plan of slidePlan) {
    const renderer = RENDERERS[plan.type]
    if (renderer) {
      renderer(prs, plan)
    } else {
      // Fallback: render as bullet list
      renderBulletList(prs, {
        ...plan,
        type: 'bullet_list_rounded',
        content: {
          title: plan.title || plan.type,
          items: Object.values(plan.content || {}).filter(v => typeof v === 'string') as string[],
        },
      })
    }
  }

  // 2. Export to Buffer
  const pptxBuffer = await prs.write({ outputType: 'nodebuffer' }) as Buffer

  // 3. Upload to Google Drive and convert to Google Slides
  const { google } = await import('googleapis')
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const drive = google.drive({ version: 'v3', auth })

  const stream = Readable.from(pptxBuffer)

  const uploaded = await drive.files.create({
    requestBody: {
      name: `${clientName} — Diagnóstico PCH`,
      mimeType: 'application/vnd.google-apps.presentation',
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      body: stream,
    },
    fields: 'id,webViewLink',
  })

  return uploaded.data.webViewLink ||
    `https://docs.google.com/presentation/d/${uploaded.data.id}/edit`
}
