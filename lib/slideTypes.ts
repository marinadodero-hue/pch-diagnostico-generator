export type SlideType =
  | 'cover'
  | 'section_divider'
  | 'rules'
  | 'intro_columns'
  | 'method_card'
  | 'bullet_list_rounded'
  | 'quotes_grid'
  | 'concept_definition'
  | 'situation_improvement'
  | 'value_chain'
  | 'process_map'
  | 'leverage_points'
  | 'action_plan_gantt'
  | 'two_column_analysis'
  | 'highlight_statement'
  | 'next_steps'
  | 'closing'

export type NarrativePattern = 'A' | 'B' | 'C' | 'D' | 'E'

export interface ChainStep {
  number: number
  name: string
  area: string
  criticalFailure: string
  evidence: string
}

export interface ThematicAxis {
  name: string
  weight: 'primary' | 'secondary'
  hasConceptDefinition: boolean
  conceptDefinition: { what: string; valuePoints: string[] } | null
  situationsFound: string[]
  improvementProposals: string[]
  hasCriticalChain: boolean
  chainSteps: ChainStep[] | null
  hasProcessMap: boolean
}

export interface ActionPlanInitiative {
  name: string
  startMonth: number
  durationMonths: number
  owner: string
  subItems: string[]
}

export interface DiagnosticAnalysis {
  clientName: string
  period: string
  consultantNotesInterpretation: string
  methodology: string
  clientContext: string
  interviewObservations: string[]
  quotes: string[]
  initialSymptoms: {
    title: string
    items: string[]
  }
  suggestedNarrativePattern: NarrativePattern
  narrativePatternJustification: string
  thematicAxes: ThematicAxis[]
  crosscuttingSituations: string[]
  leveragePoints: string[]
  actionPlan: {
    initiatives: ActionPlanInitiative[]
    totalMonths: number
    hasPhase2: boolean
    phase2Items: string[]
    milestones: string[]
  }
  nextSteps: string[]
}

// Content shapes per slide type
export interface CoverContent {
  clientName: string
  period: string
}

export interface SectionDividerContent {
  label: string
  sublabel?: string
}

export interface RulesContent {
  rules: { icon: string; text: string }[]
}

export interface IntroColumnsContent {
  columns: { title: string; items: string[] }[]
  duration?: string
}

export interface MethodCardContent {
  icon: string
  title: string
  description: string
}

export interface BulletListContent {
  title: string
  items: string[]
}

export interface QuotesGridContent {
  title: string
  quotes: string[]
}

export interface ConceptDefinitionContent {
  concept: string
  what: string
  valuePoints: string[]
}

export interface SituationImprovementContent {
  title: string
  rows: { situation: string; improvement: string }[]
}

export interface ValueChainContent {
  title: string
  steps: ChainStep[]
}

export interface ProcessMapContent {
  title: string
  levels: { name: string; processes: string[] }[]
}

export interface LeveragePointsContent {
  title: string
  points: string[]
}

export interface ActionPlanGanttContent {
  initiatives: ActionPlanInitiative[]
  totalMonths: number
  milestones: string[]
}

export interface TwoColumnContent {
  title: string
  leftLabel: string
  rightLabel: string
  rows: { left: string; right: string }[]
}

export interface HighlightStatementContent {
  statement: string
  supporting?: string
}

export interface NextStepsContent {
  steps: string[]
}

export interface ClosingContent {
  contactEmail?: string
  contactPhone?: string
  website?: string
}

export type SlideContent =
  | CoverContent
  | SectionDividerContent
  | RulesContent
  | IntroColumnsContent
  | MethodCardContent
  | BulletListContent
  | QuotesGridContent
  | ConceptDefinitionContent
  | SituationImprovementContent
  | ValueChainContent
  | ProcessMapContent
  | LeveragePointsContent
  | ActionPlanGanttContent
  | TwoColumnContent
  | HighlightStatementContent
  | NextStepsContent
  | ClosingContent

export interface SlidePlan {
  type: SlideType
  sectionLabel?: string | null
  title?: string | null
  content: SlideContent
  designNotes?: string
}

export const PCH_COLORS = {
  navyDeep:  '#011533',
  navyMid:   '#2c3850',
  navyLight: '#cfdef5',
  white:     '#ffffff',
  black:     '#000000',
  limeGreen: '#e0fcad',
  orange:    '#fe572a',
  lightBlue: '#bce4fe',
  slateGray: '#6b7a8d',
}
