import { google } from 'googleapis'
import {
  SlidePlan, PCH_COLORS,
  CoverContent, SectionDividerContent, RulesContent,
  IntroColumnsContent, MethodCardContent, BulletListContent,
  QuotesGridContent, SituationImprovementContent, ValueChainContent,
  LeveragePointsContent, ActionPlanGanttContent, TwoColumnContent,
  HighlightStatementContent, NextStepsContent, ClosingContent,
  ConceptDefinitionContent,
} from './slideTypes'

const PT = 12700
function emu(pt: number) { return pt * PT }

function rgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return { red: r, green: g, blue: b }
}

function solidFill(hex: string) {
  return { solidFill: { color: { rgbColor: rgb(hex) } } }
}

function pageBackground(hex: string) {
  return { pageBackgroundFill: { solidFill: { color: { rgbColor: rgb(hex) } } } }
}

// ─── Shape builders ───────────────────────────────────────────────────────────

function rect(pageId: string, id: string, x: number, y: number, w: number, h: number, fillHex: string, rounded = false): object[] {
  return [
    {
      createShape: {
        objectId: id,
        shapeType: rounded ? 'ROUND_RECTANGLE' : 'RECTANGLE',
        elementProperties: {
          pageObjectId: pageId,
          size: { width: { magnitude: emu(w), unit: 'EMU' }, height: { magnitude: emu(h), unit: 'EMU' } },
          transform: { scaleX: 1, scaleY: 1, translateX: emu(x), translateY: emu(y), unit: 'EMU' },
        },
      },
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: { shapeBackgroundFill: solidFill(fillHex) },
        fields: 'shapeBackgroundFill',
      },
    },
  ]
}

function ellipse(pageId: string, id: string, x: number, y: number, d: number, fillHex: string): object[] {
  return [
    {
      createShape: {
        objectId: id,
        shapeType: 'ELLIPSE',
        elementProperties: {
          pageObjectId: pageId,
          size: { width: { magnitude: emu(d), unit: 'EMU' }, height: { magnitude: emu(d), unit: 'EMU' } },
          transform: { scaleX: 1, scaleY: 1, translateX: emu(x), translateY: emu(y), unit: 'EMU' },
        },
      },
    },
    {
      updateShapeProperties: {
        objectId: id,
        shapeProperties: { shapeBackgroundFill: solidFill(fillHex) },
        fields: 'shapeBackgroundFill',
      },
    },
  ]
}

interface TextOpts {
  x: number; y: number; w: number; h: number
  text: string
  hex?: string
  size?: number
  bold?: boolean
  align?: string
  bgHex?: string
}

function textBox(pageId: string, id: string, opts: TextOpts): object[] {
  const reqs: object[] = [
    {
      createShape: {
        objectId: id,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: pageId,
          size: { width: { magnitude: emu(opts.w), unit: 'EMU' }, height: { magnitude: emu(opts.h), unit: 'EMU' } },
          transform: { scaleX: 1, scaleY: 1, translateX: emu(opts.x), translateY: emu(opts.y), unit: 'EMU' },
        },
      },
    },
  ]

  if (opts.bgHex) {
    reqs.push({
      updateShapeProperties: {
        objectId: id,
        shapeProperties: { shapeBackgroundFill: solidFill(opts.bgHex) },
        fields: 'shapeBackgroundFill',
      },
    })
  }

  reqs.push({ insertText: { objectId: id, text: opts.text } })

  reqs.push({
    updateTextStyle: {
      objectId: id,
      style: {
        foregroundColor: { opaqueColor: { rgbColor: rgb(opts.hex || PCH_COLORS.black) } },
        fontSize: { magnitude: opts.size || 12, unit: 'PT' },
        bold: opts.bold || false,
        fontFamily: 'Montserrat',
      },
      fields: 'foregroundColor,fontSize,bold,fontFamily',
    },
  })

  if (opts.align) {
    reqs.push({
      updateParagraphStyle: {
        objectId: id,
        style: { alignment: opts.align },
        fields: 'alignment',
      },
    })
  }

  return reqs
}

// ─── Dark slide background ────────────────────────────────────────────────────

function darkBg(pageId: string): object {
  return {
    updatePageProperties: {
      objectId: pageId,
      pageProperties: pageBackground(PCH_COLORS.navyDeep),
      fields: 'pageBackgroundFill',
    },
  }
}

// Light blue background (used for content slides)
function lightBg(pageId: string, hex = '#ffffff'): object {
  return {
    updatePageProperties: {
      objectId: pageId,
      pageProperties: pageBackground(hex),
      fields: 'pageBackgroundFill',
    },
  }
}

// ─── Standard light slide header: lime box + title + orange line with dots ────

function lightHeader(pageId: string, title: string, startX = 40, y = 38): object[] {
  // Estimate title box width based on char count
  const titleW = Math.min(Math.max(title.length * 13 + 24, 120), 500)
  const lineStartX = startX + titleW + 12
  const lineEndX = 680
  const dotY = y + 18

  return [
    // Lime background behind title
    ...rect(pageId, `${pageId}_hbg`, startX, y, titleW, 38, PCH_COLORS.limeGreen),
    // Title text
    ...textBox(pageId, `${pageId}_htxt`, {
      x: startX + 4, y: y + 3, w: titleW - 8, h: 32,
      text: title, hex: PCH_COLORS.black, size: 18, bold: true,
    }),
    // Orange dot start
    ...ellipse(pageId, `${pageId}_hd1`, lineStartX, dotY, 8, PCH_COLORS.orange),
    // Orange line
    ...rect(pageId, `${pageId}_hline`, lineStartX + 9, dotY + 3, lineEndX - lineStartX - 16, 2, PCH_COLORS.orange),
    // Orange dot end
    ...ellipse(pageId, `${pageId}_hd2`, lineEndX, dotY, 8, PCH_COLORS.orange),
  ]
}

// Centered header with line on both sides (unused — kept for reference)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function centerHeader(pageId: string, title: string): object[] {
  const titleW = Math.min(title.length * 14 + 24, 400)
  const cx = 360 - titleW / 2
  const dotY = 46

  return [
    ...rect(pageId, `${pageId}_hbg`, cx, 34, titleW, 38, PCH_COLORS.limeGreen),
    ...textBox(pageId, `${pageId}_htxt`, {
      x: cx + 4, y: 37, w: titleW - 8, h: 32,
      text: title, hex: PCH_COLORS.black, size: 18, bold: true, align: 'CENTER',
    }),
    ...ellipse(pageId, `${pageId}_hd1`, 40, dotY, 8, PCH_COLORS.navyDeep),
    ...rect(pageId, `${pageId}_hline1`, 50, dotY + 3, cx - 58, 2, PCH_COLORS.orange),
    ...ellipse(pageId, `${pageId}_hd2`, cx - 10, dotY, 8, PCH_COLORS.orange),
    ...ellipse(pageId, `${pageId}_hd3`, cx + titleW + 2, dotY, 8, PCH_COLORS.orange),
    ...rect(pageId, `${pageId}_hline2`, cx + titleW + 12, dotY + 3, 680 - cx - titleW - 20, 2, PCH_COLORS.orange),
    ...ellipse(pageId, `${pageId}_hd4`, 672, dotY, 8, PCH_COLORS.navyDeep),
  ]
}

// ─── Diagonal decoration lines for dark slides ────────────────────────────────

function diagonalLines(pageId: string): object[] {
  const lineColor = '#1a2a47'
  return [
    ...rect(pageId, `${pageId}_d1`, 380, -60, 20, 500, lineColor),
    ...rect(pageId, `${pageId}_d2`, 460, -20, 16, 480, lineColor),
    ...rect(pageId, `${pageId}_d3`, 530, 30, 10, 400, lineColor),
  ]
}

// ─── Slide renderers ─────────────────────────────────────────────────────────

function renderCover(c: CoverContent, pageId: string, logoUrl?: string): object[] {
  const reqs: object[] = [darkBg(pageId), ...diagonalLines(pageId)]

  if (logoUrl) {
    reqs.push({
      createImage: {
        objectId: `${pageId}_logo`,
        url: logoUrl,
        elementProperties: {
          pageObjectId: pageId,
          size: { width: { magnitude: emu(160), unit: 'EMU' }, height: { magnitude: emu(65), unit: 'EMU' } },
          transform: { scaleX: 1, scaleY: 1, translateX: emu(50), translateY: emu(230), unit: 'EMU' },
        },
      },
    })
  } else {
    reqs.push(...textBox(pageId, `${pageId}_logoTxt`, {
      x: 50, y: 230, w: 200, h: 55,
      text: '▷ PCH', hex: PCH_COLORS.white, size: 32, bold: true,
    }))
  }

  reqs.push(
    // "Diagnóstico" lime box
    ...rect(pageId, `${pageId}_diagbg`, 50, 302, 230, 42, PCH_COLORS.limeGreen),
    ...textBox(pageId, `${pageId}_diag`, {
      x: 54, y: 306, w: 222, h: 34,
      text: 'Diagnóstico', hex: PCH_COLORS.black, size: 22, bold: true,
    }),
    // Client name
    ...textBox(pageId, `${pageId}_client`, {
      x: 50, y: 354, w: 500, h: 35,
      text: c.clientName, hex: PCH_COLORS.white, size: 22, bold: false,
    }),
    // Period
    ...textBox(pageId, `${pageId}_period`, {
      x: 50, y: 390, w: 500, h: 24,
      text: `${c.period}  ·  Realizado por: PCH Consultora`,
      hex: PCH_COLORS.navyLight, size: 12,
    }),
  )

  return reqs
}

function renderSectionDivider(c: SectionDividerContent, pageId: string): object[] {
  const reqs: object[] = [darkBg(pageId), ...diagonalLines(pageId)]

  reqs.push(
    ...rect(pageId, `${pageId}_label1bg`, 50, 170, Math.min(c.label.length * 16 + 24, 500), 46, PCH_COLORS.orange),
    ...textBox(pageId, `${pageId}_label1`, {
      x: 56, y: 174, w: Math.min(c.label.length * 16 + 16, 492), h: 38,
      text: c.label, hex: PCH_COLORS.white, size: 24, bold: true,
    }),
  )

  if (c.sublabel) {
    reqs.push(
      ...rect(pageId, `${pageId}_label2bg`, 50, 226, Math.min(c.sublabel.length * 16 + 24, 600), 46, PCH_COLORS.orange),
      ...textBox(pageId, `${pageId}_label2`, {
        x: 56, y: 230, w: Math.min(c.sublabel.length * 16 + 16, 592), h: 38,
        text: c.sublabel, hex: PCH_COLORS.white, size: 24, bold: true,
      }),
    )
  }

  return reqs
}

function renderRules(_c: RulesContent, pageId: string): object[] {
  const rules = [
    'Evitar el ping-pong',
    'Tomar nota',
    'Preguntas al final',
  ]

  const reqs: object[] = [
    lightBg(pageId, '#ffffff'),
    ...lightHeader(pageId, 'Reglas de la reunión'),
  ]

  const rightX = 310
  rules.forEach((rule, i) => {
    const y = 110 + i * 88
    // Circle
    reqs.push(...ellipse(pageId, `${pageId}_circle_${i}`, rightX, y, 60, PCH_COLORS.navyDeep))
    // Asterisk text in circle
    reqs.push(...textBox(pageId, `${pageId}_icon_${i}`, {
      x: rightX + 14, y: y + 14, w: 32, h: 32,
      text: '*', hex: PCH_COLORS.white, size: 22, bold: true, align: 'CENTER',
    }))
    // Slate pill
    reqs.push(...rect(pageId, `${pageId}_pill_${i}`, rightX + 50, y + 8, 330, 44, PCH_COLORS.slateGray, true))
    reqs.push(...textBox(pageId, `${pageId}_pilltxt_${i}`, {
      x: rightX + 60, y: y + 16, w: 312, h: 30,
      text: rule, hex: PCH_COLORS.white, size: 14, bold: true,
    }))
  })

  return reqs
}

function renderIntroColumns(c: IntroColumnsContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, PCH_COLORS.navyLight),
    ...lightHeader(pageId, 'Diagnóstico'),
    // Vertical orange line
    ...rect(pageId, `${pageId}_vline`, 318, 90, 2, 290, PCH_COLORS.orange),
    ...ellipse(pageId, `${pageId}_vd1`, 314, 86, 10, PCH_COLORS.navyDeep),
    ...ellipse(pageId, `${pageId}_vd2`, 314, 374, 10, PCH_COLORS.navyDeep),
  ]

  const cols = c.columns.slice(0, 3)
  cols.forEach((col, i) => {
    const y = 100 + i * 95
    reqs.push(
      ...textBox(pageId, `${pageId}_ctitle_${i}`, {
        x: 338, y, w: 340, h: 26,
        text: col.title, hex: PCH_COLORS.black, size: 13, bold: true,
      }),
      ...textBox(pageId, `${pageId}_cbody_${i}`, {
        x: 338, y: y + 28, w: 340, h: 60,
        text: col.items.join('\n'), hex: PCH_COLORS.navyDeep, size: 11,
      }),
    )
  })

  if (c.duration) {
    reqs.push(...textBox(pageId, `${pageId}_dur`, {
      x: 338, y: 360, w: 200, h: 22,
      text: `Duración: ${c.duration}`, hex: PCH_COLORS.navyDeep, size: 10, bold: true,
    }))
  }

  return reqs
}

function renderMethodCard(c: MethodCardContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, '#ffffff'),
    ...lightHeader(pageId, 'Método utilizado'),
    // Slate card
    ...rect(pageId, `${pageId}_card`, 310, 110, 380, 200, PCH_COLORS.slateGray, true),
    // Circle icon
    ...ellipse(pageId, `${pageId}_icon`, 330, 130, 55, PCH_COLORS.navyDeep),
    // Orange label inside card
    ...rect(pageId, `${pageId}_lbg`, 398, 148, 260, 30, PCH_COLORS.orange, true),
    ...textBox(pageId, `${pageId}_lbl`, {
      x: 402, y: 152, w: 252, h: 22,
      text: c.title, hex: PCH_COLORS.white, size: 12, bold: true,
    }),
    // Description
    ...textBox(pageId, `${pageId}_desc`, {
      x: 330, y: 196, w: 348, h: 100,
      text: c.description, hex: PCH_COLORS.white, size: 11,
    }),
  ]
  return reqs
}

function renderBulletList(c: BulletListContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, PCH_COLORS.navyLight),
    ...lightHeader(pageId, c.title),
    // Vertical orange line divider
    ...rect(pageId, `${pageId}_vline`, 318, 90, 2, 290, PCH_COLORS.orange),
    ...ellipse(pageId, `${pageId}_vd1`, 314, 86, 10, PCH_COLORS.navyDeep),
    ...ellipse(pageId, `${pageId}_vd2`, 314, 374, 10, PCH_COLORS.navyDeep),
  ]

  const items = c.items.slice(0, 7)
  items.forEach((item, i) => {
    const y = 96 + i * 40
    // Bullet dot
    reqs.push(...ellipse(pageId, `${pageId}_dot_${i}`, 328, y + 6, 10, PCH_COLORS.navyDeep))
    // Item text
    reqs.push(...textBox(pageId, `${pageId}_item_${i}`, {
      x: 346, y, w: 340, h: 36,
      text: item, hex: PCH_COLORS.navyDeep, size: 12, bold: true,
    }))
  })

  return reqs
}

function renderQuotesGrid(c: QuotesGridContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, '#ffffff'),
    ...lightHeader(pageId, c.title),
  ]

  const quotes = c.quotes.slice(0, 6)
  const cols = 2
  const cardW = 315
  const cardH = 105
  const startX = 310
  const startY = 90

  quotes.forEach((q, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = startX + col * (cardW + 10)
    const y = startY + row * (cardH + 8)
    reqs.push(
      ...rect(pageId, `${pageId}_qcard_${i}`, x, y, cardW, cardH, PCH_COLORS.slateGray, true),
      ...textBox(pageId, `${pageId}_qtxt_${i}`, {
        x: x + 10, y: y + 10, w: cardW - 20, h: cardH - 20,
        text: `"${q}"`, hex: PCH_COLORS.white, size: 11, bold: true,
      }),
    )
  })

  return reqs
}

function renderConceptDefinition(c: ConceptDefinitionContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, '#ffffff'),
    ...lightHeader(pageId, `Qué es ${c.concept}`),
    ...rect(pageId, `${pageId}_whatbg`, 310, 90, 380, 80, PCH_COLORS.slateGray, true),
    ...textBox(pageId, `${pageId}_what`, {
      x: 320, y: 94, w: 360, h: 72,
      text: c.what, hex: PCH_COLORS.white, size: 11,
    }),
    ...textBox(pageId, `${pageId}_vallbl`, {
      x: 310, y: 182, w: 200, h: 24,
      text: 'Qué valor aporta:', hex: PCH_COLORS.black, size: 12, bold: true,
    }),
  ]

  c.valuePoints.slice(0, 5).forEach((p, i) => {
    reqs.push(
      ...ellipse(pageId, `${pageId}_vdot_${i}`, 312, 214 + i * 32, 10, PCH_COLORS.navyDeep),
      ...textBox(pageId, `${pageId}_vp_${i}`, {
        x: 330, y: 210 + i * 32, w: 360, h: 28,
        text: p, hex: PCH_COLORS.navyDeep, size: 11, bold: true,
      }),
    )
  })

  return reqs
}

function renderSituationImprovement(c: SituationImprovementContent, pageId: string): object[] {
  // Matches page 13: orange top/bottom border lines, 3 stacked sections
  const reqs: object[] = [
    lightBg(pageId, '#ffffff'),
    // Top orange line
    ...rect(pageId, `${pageId}_tline`, 40, 20, 640, 3, PCH_COLORS.orange),
    // Bottom orange line
    ...rect(pageId, `${pageId}_bline`, 40, 385, 640, 3, PCH_COLORS.orange),
    // "Proceso" label (orange)
    ...rect(pageId, `${pageId}_proc_bg`, 40, 28, 100, 26, PCH_COLORS.orange, true),
    ...textBox(pageId, `${pageId}_proc`, {
      x: 44, y: 30, w: 92, h: 22,
      text: c.title || 'Proceso', hex: PCH_COLORS.white, size: 10, bold: true,
    }),
  ]

  const sections = [
    { label: 'Situación encontrada', items: c.rows.map(r => r.situation), hex: PCH_COLORS.limeGreen, textHex: PCH_COLORS.black },
    { label: 'Propuesta de mejora', items: c.rows.map(r => r.improvement), hex: PCH_COLORS.limeGreen, textHex: PCH_COLORS.black },
  ]

  sections.forEach((sec, si) => {
    const y = 65 + si * 155
    reqs.push(
      ...rect(pageId, `${pageId}_sec_bg_${si}`, 40, y, 350, 32, sec.hex, true),
      ...textBox(pageId, `${pageId}_sec_lbl_${si}`, {
        x: 44, y: y + 4, w: 342, h: 24,
        text: sec.label, hex: sec.textHex, size: 12, bold: true,
      }),
    )
    sec.items.slice(0, 4).forEach((item, ii) => {
      reqs.push(...textBox(pageId, `${pageId}_sec_item_${si}_${ii}`, {
        x: 60, y: y + 36 + ii * 26, w: 630, h: 24,
        text: `• ${item}`, hex: PCH_COLORS.navyDeep, size: 11,
      }))
    })
  })

  return reqs
}

function renderValueChain(c: ValueChainContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, '#ffffff'),
    ...lightHeader(pageId, c.title),
  ]

  const steps = c.steps.slice(0, 5)
  const stepW = Math.floor(640 / steps.length)

  steps.forEach((step, i) => {
    const x = 40 + i * stepW
    const isCritical = !!step.criticalFailure
    reqs.push(
      ...rect(pageId, `${pageId}_sn_${i}`, x, 88, stepW - 4, 30, isCritical ? PCH_COLORS.orange : PCH_COLORS.navyDeep, true),
      ...textBox(pageId, `${pageId}_snTxt_${i}`, {
        x: x + 2, y: 91, w: stepW - 8, h: 24,
        text: `${step.number}. ${step.name}`, hex: PCH_COLORS.white, size: 9, bold: true, align: 'CENTER',
      }),
    )
    if (step.criticalFailure) {
      reqs.push(
        ...rect(pageId, `${pageId}_sf_${i}`, x, 124, stepW - 4, 90, PCH_COLORS.slateGray, true),
        ...textBox(pageId, `${pageId}_sfTxt_${i}`, {
          x: x + 4, y: 128, w: stepW - 12, h: 82,
          text: step.criticalFailure, hex: PCH_COLORS.white, size: 9,
        }),
      )
    }
    if (step.evidence) {
      reqs.push(...textBox(pageId, `${pageId}_sev_${i}`, {
        x: x + 4, y: 222, w: stepW - 12, h: 70,
        text: step.evidence, hex: PCH_COLORS.slateGray, size: 8,
      }))
    }
  })

  return reqs
}

function renderLeveragePoints(c: LeveragePointsContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, PCH_COLORS.navyLight),
    ...lightHeader(pageId, c.title),
  ]

  const points = c.points.slice(0, 6)
  const cols = 2
  points.forEach((pt, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = 40 + col * 330
    const y = 100 + row * 90
    reqs.push(
      ...rect(pageId, `${pageId}_pt_${i}`, x, y, 318, 78, PCH_COLORS.limeGreen, true),
      ...textBox(pageId, `${pageId}_ptTxt_${i}`, {
        x: x + 10, y: y + 8, w: 298, h: 62,
        text: `✓  ${pt}`, hex: PCH_COLORS.navyDeep, size: 12, bold: true,
      }),
    )
  })

  return reqs
}

function renderGantt(c: ActionPlanGanttContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, '#ffffff'),
    ...lightHeader(pageId, 'Plan de Acción'),
  ]

  const months = Math.min(c.totalMonths || 5, 5)
  const labelW = 230
  const gridX = labelW + 50
  const gridW = 680 - gridX
  const colW = Math.floor(gridW / months)
  const headerY = 90

  // Month headers
  for (let m = 0; m < months; m++) {
    const x = gridX + m * colW
    reqs.push(
      ...rect(pageId, `${pageId}_mh_${m}`, x, headerY, colW - 2, 28, PCH_COLORS.navyDeep, true),
      ...textBox(pageId, `${pageId}_mhTxt_${m}`, {
        x: x + 2, y: headerY + 4, w: colW - 6, h: 20,
        text: `MES ${m + 1}`, hex: PCH_COLORS.white, size: 8, bold: true, align: 'CENTER',
      }),
    )
    // Week circles
    const weeks = ['S1', 'S2', 'S3', 'S4']
    const wW = Math.floor((colW - 2) / 4)
    weeks.forEach((w, wi) => {
      const wx = x + wi * wW
      reqs.push(
        ...ellipse(pageId, `${pageId}_wc_${m}_${wi}`, wx + 2, headerY + 30, wW - 4, PCH_COLORS.navyLight),
        ...textBox(pageId, `${pageId}_wt_${m}_${wi}`, {
          x: wx + 2, y: headerY + 33, w: wW - 4, h: 16,
          text: w, hex: PCH_COLORS.navyDeep, size: 6, bold: true, align: 'CENTER',
        }),
      )
    })
  }

  // Initiative rows
  c.initiatives.slice(0, 8).forEach((ini, i) => {
    const y = headerY + 58 + i * 32
    // Label (orange pill)
    reqs.push(
      ...rect(pageId, `${pageId}_ini_${i}`, 40, y + 2, labelW, 24, PCH_COLORS.orange, true),
      ...textBox(pageId, `${pageId}_iniTxt_${i}`, {
        x: 44, y: y + 4, w: labelW - 8, h: 20,
        text: ini.name, hex: PCH_COLORS.white, size: 8, bold: true,
      }),
    )
    // Row background
    const start = Math.max(ini.startMonth - 1, 0)
    const dur = Math.min(ini.durationMonths, months - start)
    const barX = gridX + start * colW
    const barW = dur * colW - 4
    reqs.push(
      ...rect(pageId, `${pageId}_row_${i}`, gridX, y + 2, gridW, 24, '#e8ecf4'),
      ...rect(pageId, `${pageId}_bar_${i}`, barX, y + 6, barW, 14, PCH_COLORS.limeGreen),
    )
  })

  return reqs
}

function renderTwoColumn(c: TwoColumnContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, '#ffffff'),
    ...lightHeader(pageId, c.title),
    ...rect(pageId, `${pageId}_lhbg`, 40, 90, 315, 32, PCH_COLORS.limeGreen, true),
    ...textBox(pageId, `${pageId}_lh`, { x: 46, y: 94, w: 303, h: 24, text: c.leftLabel, hex: PCH_COLORS.black, size: 11, bold: true }),
    ...rect(pageId, `${pageId}_rhbg`, 365, 90, 315, 32, PCH_COLORS.limeGreen, true),
    ...textBox(pageId, `${pageId}_rh`, { x: 371, y: 94, w: 303, h: 24, text: c.rightLabel, hex: PCH_COLORS.black, size: 11, bold: true }),
  ]

  c.rows.slice(0, 4).forEach((row, i) => {
    const y = 130 + i * 62
    reqs.push(
      ...rect(pageId, `${pageId}_lc_${i}`, 40, y, 315, 56, PCH_COLORS.slateGray, true),
      ...textBox(pageId, `${pageId}_lcTxt_${i}`, { x: 46, y: y + 6, w: 303, h: 44, text: row.left, hex: PCH_COLORS.white, size: 10 }),
      ...rect(pageId, `${pageId}_rc_${i}`, 365, y, 315, 56, PCH_COLORS.slateGray, true),
      ...textBox(pageId, `${pageId}_rcTxt_${i}`, { x: 371, y: y + 6, w: 303, h: 44, text: row.right, hex: PCH_COLORS.white, size: 10 }),
    )
  })

  return reqs
}

function renderHighlightStatement(c: HighlightStatementContent, pageId: string): object[] {
  return [
    darkBg(pageId),
    ...diagonalLines(pageId),
    ...rect(pageId, `${pageId}_stbg`, 50, 140, Math.min(c.statement.length * 18 + 30, 650), 56, PCH_COLORS.orange),
    ...textBox(pageId, `${pageId}_st`, {
      x: 56, y: 148, w: 636, h: 42,
      text: c.statement, hex: PCH_COLORS.white, size: 24, bold: true,
    }),
    ...(c.supporting ? [
      ...textBox(pageId, `${pageId}_sup`, {
        x: 56, y: 214, w: 636, h: 80,
        text: c.supporting, hex: PCH_COLORS.navyLight, size: 14,
      }),
    ] : []),
  ]
}

function renderNextSteps(c: NextStepsContent, pageId: string): object[] {
  const reqs: object[] = [
    lightBg(pageId, '#ffffff'),
    ...lightHeader(pageId, 'Próximos pasos'),
  ]

  const steps = c.steps.slice(0, 3)
  const colors = [PCH_COLORS.navyDeep, PCH_COLORS.navyLight, PCH_COLORS.navyLight]
  const textColors = [PCH_COLORS.white, PCH_COLORS.navyDeep, PCH_COLORS.navyDeep]

  steps.forEach((step, i) => {
    const y = 100 + i * 92
    reqs.push(
      ...rect(pageId, `${pageId}_card_${i}`, 40, y, 640, 80, colors[i] || PCH_COLORS.navyDeep, true),
      ...textBox(pageId, `${pageId}_num_${i}`, {
        x: 50, y: y + 8, w: 30, h: 30,
        text: String(i + 1), hex: textColors[i] || PCH_COLORS.white, size: 18, bold: true,
      }),
      ...textBox(pageId, `${pageId}_step_${i}`, {
        x: 88, y: y + 10, w: 580, h: 60,
        text: step, hex: textColors[i] || PCH_COLORS.white, size: 13, bold: true,
      }),
    )
  })

  return reqs
}

function renderClosing(c: ClosingContent, pageId: string): object[] {
  const reqs: object[] = [darkBg(pageId), ...diagonalLines(pageId)]

  reqs.push(
    ...textBox(pageId, `${pageId}_thanks`, {
      x: 350, y: 230, w: 360, h: 100,
      text: '¡Gracias!', hex: PCH_COLORS.white, size: 56, bold: true, align: 'CENTER',
    }),
    ...textBox(pageId, `${pageId}_contact`, {
      x: 350, y: 340, w: 360, h: 30,
      text: [
        c.contactPhone || '11 5125 9300',
        c.contactEmail || 'paula@pchconsultora.com',
        c.website || 'www.pchconsultora.com',
      ].join('  |  '),
      hex: PCH_COLORS.navyLight, size: 10, align: 'CENTER',
    }),
  )

  return reqs
}

// ─── Build slide dispatch ─────────────────────────────────────────────────────

function buildSlide(plan: SlidePlan, pageId: string, logoUrl?: string): object[] {
  switch (plan.type) {
    case 'cover':               return renderCover(plan.content as CoverContent, pageId, logoUrl)
    case 'section_divider':     return renderSectionDivider(plan.content as SectionDividerContent, pageId)
    case 'rules':               return renderRules(plan.content as RulesContent, pageId)
    case 'intro_columns':       return renderIntroColumns(plan.content as IntroColumnsContent, pageId)
    case 'method_card':         return renderMethodCard(plan.content as MethodCardContent, pageId)
    case 'bullet_list_rounded': return renderBulletList(plan.content as BulletListContent, pageId)
    case 'quotes_grid':         return renderQuotesGrid(plan.content as QuotesGridContent, pageId)
    case 'concept_definition':  return renderConceptDefinition(plan.content as ConceptDefinitionContent, pageId)
    case 'situation_improvement': return renderSituationImprovement(plan.content as SituationImprovementContent, pageId)
    case 'value_chain':         return renderValueChain(plan.content as ValueChainContent, pageId)
    case 'leverage_points':     return renderLeveragePoints(plan.content as LeveragePointsContent, pageId)
    case 'action_plan_gantt':   return renderGantt(plan.content as ActionPlanGanttContent, pageId)
    case 'two_column_analysis': return renderTwoColumn(plan.content as TwoColumnContent, pageId)
    case 'highlight_statement': return renderHighlightStatement(plan.content as HighlightStatementContent, pageId)
    case 'next_steps':          return renderNextSteps(plan.content as NextStepsContent, pageId)
    case 'closing':             return renderClosing(plan.content as ClosingContent, pageId)
    case 'process_map':         return renderBulletList({ title: (plan.content as { title: string }).title, items: [] }, pageId)
    default:                    return []
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function createPresentation(
  slides: SlidePlan[],
  accessToken: string,
  clientName: string,
  logoUrl?: string
): Promise<string> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const slidesApi = google.slides({ version: 'v1', auth })
  const driveApi = google.drive({ version: 'v3', auth })

  const title = `${clientName} — Diagnóstico PCH`
  const presentation = await slidesApi.presentations.create({ requestBody: { title } })
  const presentationId = presentation.data.presentationId!

  const firstSlideId = presentation.data.slides?.[0]?.objectId
  if (firstSlideId) {
    await slidesApi.presentations.batchUpdate({
      presentationId,
      requestBody: { requests: [{ deleteObject: { objectId: firstSlideId } }] },
    })
  }

  for (let i = 0; i < slides.length; i++) {
    const plan = slides[i]
    const pageId = `slide_${i}`

    const requests: object[] = [
      { createSlide: { objectId: pageId, slideLayoutReference: { predefinedLayout: 'BLANK' } } },
      ...buildSlide(plan, pageId, logoUrl),
    ]

    try {
      await slidesApi.presentations.batchUpdate({
        presentationId,
        requestBody: { requests },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`Slide ${i} (${plan.type}) error:`, msg)
    }
  }

  const file = await driveApi.files.get({ fileId: presentationId, fields: 'webViewLink' })
  return file.data.webViewLink || `https://docs.google.com/presentation/d/${presentationId}/edit`
}

