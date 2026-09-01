import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import type { ReportData } from '@/lib/report'

// ---------------------------------------------------------------------------
// Colour palette — Counsel+ aligned, print-safe
// ---------------------------------------------------------------------------
const C = {
  accent:       '#4B6A8A',
  healthy:      '#059669',
  healthyBg:    '#f0fdf4',
  attention:    '#d97706',
  attentionBg:  '#fffbeb',
  action:       '#dc2626',
  actionBg:     '#fef2f2',
  dissolved:    '#6b7280',
  dissolvedBg:  '#f9fafb',
  text:         '#111827',
  textSub:      '#6b7280',
  textMuted:    '#9ca3af',
  border:       '#e5e7eb',
  borderLight:  '#f3f4f6',
  bg:           '#f9fafb',
  white:        '#ffffff',
}

type StatusKey = 'ok' | 'due_soon' | 'overdue' | 'not_applicable'
type TierKey   = 'healthy' | 'attention' | 'action' | 'dissolved'

const STATUS_COLOR: Record<StatusKey, string> = { ok: C.healthy, due_soon: C.attention, overdue: C.action, not_applicable: C.dissolved }
const STATUS_BG:    Record<StatusKey, string> = { ok: C.healthyBg, due_soon: C.attentionBg, overdue: C.actionBg, not_applicable: C.dissolvedBg }
const STATUS_LABEL: Record<StatusKey, string> = { ok: 'On track', due_soon: 'Due soon', overdue: 'Overdue', not_applicable: 'N/A' }
const TIER_COLOR:   Record<TierKey, string>   = { healthy: C.healthy, attention: C.attention, action: C.action, dissolved: C.dissolved }
const TIER_BG:      Record<TierKey, string>   = { healthy: C.healthyBg, attention: C.attentionBg, action: C.actionBg, dissolved: C.dissolvedBg }
const TIER_LABEL:   Record<TierKey, string>   = {
  healthy:   'Healthy',
  attention: 'Attention needed',
  action:    'Action required',
  dissolved: 'Dissolved',
}
const TIER_DESC: Record<TierKey, string> = {
  healthy:   'All compliance obligations are currently on track.',
  attention: 'One or more obligations are approaching their deadline.',
  action:    'Immediate action is required for one or more obligations.',
  dissolved: 'This company is dissolved. No compliance obligations remain.',
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  page: {
    fontFamily:      'Helvetica',
    backgroundColor: C.white,
    fontSize:        10,
    color:           C.text,
    paddingBottom:   60,
  },

  // Company-first header
  header: {
    paddingTop:        40,
    paddingHorizontal: 40,
    paddingBottom:     20,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
    borderBottomStyle: 'solid',
  },
  companyName: {
    fontSize:      18,
    fontFamily:    'Helvetica-Bold',
    color:         C.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  4,
  },
  reportTitle: {
    fontSize:     12,
    color:        C.accent,
    marginBottom: 10,
  },
  headerMeta: {
    flexDirection: 'row',
    gap:           20,
  },
  headerMetaText: {
    fontSize: 9,
    color:    C.textSub,
  },

  // Body wrapper
  body: {
    paddingHorizontal: 40,
    paddingTop:        24,
  },

  // Generic section
  section: {
    marginBottom: 22,
  },
  sectionLabel: {
    fontSize:           7,
    fontFamily:         'Helvetica-Bold',
    color:              C.textSub,
    letterSpacing:      0.8,
    textTransform:      'uppercase',
    marginBottom:       8,
    paddingBottom:      6,
    borderBottomWidth:  1,
    borderBottomColor:  C.border,
    borderBottomStyle:  'solid',
  },

  // Company details
  companyMetaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    marginBottom:  6,
  },
  statusPill: {
    fontSize:          9,
    fontFamily:        'Helvetica-Bold',
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      99,
    textTransform:     'capitalize',
    marginRight:       8,
  },
  companyDetail: {
    fontSize:    9,
    color:       C.textSub,
    marginBottom: 3,
  },

  // Health score
  healthRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  healthScoreNumber: {
    fontSize:    44,
    fontFamily:  'Helvetica-Bold',
    marginRight: 20,
    lineHeight:  1,
  },
  healthRight: {
    flex: 1,
  },
  healthTierBadge: {
    fontSize:          10,
    fontFamily:        'Helvetica-Bold',
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      99,
    alignSelf:         'flex-start',
    marginBottom:      6,
  },
  healthDesc: {
    fontSize:   9,
    color:      C.textSub,
    lineHeight: 1.5,
  },

  // Compliance table
  tableHeaderRow: {
    flexDirection:     'row',
    backgroundColor:   C.bg,
    paddingVertical:   7,
    paddingHorizontal: 12,
    borderRadius:      4,
    marginBottom:      2,
  },
  tableDataRow: {
    flexDirection:      'row',
    paddingVertical:    10,
    paddingHorizontal:  12,
    borderBottomWidth:  1,
    borderBottomColor:  C.border,
    borderBottomStyle:  'solid',
  },
  colObligation: { flex: 2.4 },
  colStatus:     { flex: 2.2 },
  colDue:        { flex: 1.8 },
  colLast:       { flex: 1.8 },
  tableHeaderCell: {
    fontSize:      7,
    fontFamily:    'Helvetica-Bold',
    color:         C.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: {
    fontSize: 9,
    color:    C.text,
  },
  tableCellSub: {
    fontSize:  8,
    color:     C.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    fontSize:          8,
    fontFamily:        'Helvetica-Bold',
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      99,
    alignSelf:         'flex-start',
  },

  // Action summary
  allClearBox: {
    backgroundColor:   C.healthyBg,
    borderRadius:      6,
    paddingVertical:   10,
    paddingHorizontal: 12,
  },
  allClearText: {
    fontSize:   10,
    fontFamily: 'Helvetica-Bold',
    color:      C.healthy,
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom:  6,
    alignItems:    'flex-start',
  },
  actionBullet: {
    fontSize:    9,
    color:       C.action,
    marginRight: 6,
    marginTop:   1,
  },
  actionText: {
    fontSize:   9,
    color:      C.text,
    flex:       1,
    lineHeight: 1.5,
  },

  // Freshness notice
  freshnessBox: {
    backgroundColor:   C.bg,
    borderRadius:      4,
    paddingVertical:   10,
    paddingHorizontal: 12,
    marginBottom:      20,
  },
  freshnessText: {
    fontSize:   8,
    color:      C.textSub,
    lineHeight: 1.6,
  },

  // Brand signature
  brandSignature: {
    marginTop:          16,
    paddingTop:         16,
    borderTopWidth:     1,
    borderTopColor:     C.border,
    borderTopStyle:     'solid',
    alignItems:         'center',
    marginBottom:       16,
  },
  brandPrepared: {
    fontSize: 8,
    color:    C.textMuted,
  },
  brandName: {
    fontSize:   11,
    fontFamily: 'Helvetica-Bold',
    color:      C.accent,
    marginTop:  2,
  },
  brandTagline: {
    fontSize:  8,
    color:     C.textMuted,
    marginTop: 1,
  },

  // Disclaimer
  disclaimer: {
    fontSize:   7.5,
    color:      C.textMuted,
    lineHeight: 1.6,
  },

  // Fixed page footer
  pageFooter: {
    position:          'absolute',
    bottom:            20,
    left:              40,
    right:             40,
    flexDirection:     'row',
    justifyContent:    'space-between',
    borderTopWidth:    1,
    borderTopColor:    C.borderLight,
    borderTopStyle:    'solid',
    paddingTop:        6,
  },
  footerText: {
    fontSize: 7,
    color:    C.textMuted,
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(iso: string): string {
  if (!iso || iso === 'N/A') return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateLong(iso: string): string {
  if (!iso || iso === 'N/A') return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtStatusLabel(status: StatusKey, days: number): string {
  if (status === 'not_applicable') return 'N/A'
  if (status === 'ok')      return `Due in ${days} day${days !== 1 ? 's' : ''}`
  if (status === 'overdue') return `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`
  return `Due in ${days} day${days !== 1 ? 's' : ''}`
}

// ---------------------------------------------------------------------------
// PDF sub-components
// ---------------------------------------------------------------------------
function ReportHeader({ data }: { data: ReportData }) {
  return (
    <View style={s.header} fixed>
      <Text style={s.companyName}>{data.company.name}</Text>
      <Text style={s.reportTitle}>Company Compliance Report</Text>
      <View style={s.headerMeta}>
        <Text style={s.headerMetaText}>
          Company number: {data.company.number}
        </Text>
        <Text style={s.headerMetaText}>
          Report date: {fmtDateLong(data.generatedAt)}
        </Text>
        <Text style={s.headerMetaText}>
          {data.reportId}
        </Text>
      </View>
    </View>
  )
}

function CompanyDetails({ data }: { data: ReportData }) {
  const { company } = data
  const isActive = company.status === 'active'
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>Company Details</Text>
      <View style={s.companyMetaRow}>
        <Text style={[
          s.statusPill,
          {
            backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
            color:           isActive ? '#166534' : '#991b1b',
          },
        ]}>
          {company.status}
        </Text>
        {company.type ? (
          <Text style={[s.statusPill, { backgroundColor: C.borderLight, color: C.textSub }]}>
            {company.type}
          </Text>
        ) : null}
      </View>
      {company.incorporationDate ? (
        <Text style={s.companyDetail}>
          Incorporated: {fmtDate(company.incorporationDate)}
        </Text>
      ) : null}
      {company.registeredAddress ? (
        <Text style={s.companyDetail}>
          Registered address: {company.registeredAddress}
        </Text>
      ) : null}
      {company.sicCodes.length > 0 ? (
        <Text style={s.companyDetail}>
          SIC codes: {company.sicCodes.join(', ')}
        </Text>
      ) : null}
    </View>
  )
}

function HealthScoreSection({ data }: { data: ReportData }) {
  const { compliance } = data
  const tier      = compliance.healthTier as TierKey
  const tierColor = TIER_COLOR[tier]
  const tierBg    = TIER_BG[tier]
  const isDissolved = tier === 'dissolved'

  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>Compliance Health</Text>
      <View style={s.healthRow}>
        <Text style={[s.healthScoreNumber, { color: tierColor }]}>
          {isDissolved ? '—' : String(compliance.healthScore)}
        </Text>
        <View style={s.healthRight}>
          <Text style={[s.healthTierBadge, { backgroundColor: tierBg, color: tierColor }]}>
            {TIER_LABEL[tier]}
          </Text>
          <Text style={s.healthDesc}>{TIER_DESC[tier]}</Text>
        </View>
      </View>
    </View>
  )
}

function ComplianceTable({ data }: { data: ReportData }) {
  if (data.company.status === 'dissolved') return null

  const { compliance } = data
  const cs  = compliance.confirmationStatement
  const acc = compliance.accounts

  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>Compliance Obligations</Text>

      <View style={s.tableHeaderRow}>
        <View style={s.colObligation}>
          <Text style={s.tableHeaderCell}>Obligation</Text>
        </View>
        <View style={s.colStatus}>
          <Text style={s.tableHeaderCell}>Status</Text>
        </View>
        <View style={s.colDue}>
          <Text style={s.tableHeaderCell}>Due Date</Text>
        </View>
        <View style={s.colLast}>
          <Text style={s.tableHeaderCell}>Last Filed</Text>
        </View>
      </View>

      <View style={s.tableDataRow}>
        <View style={s.colObligation}>
          <Text style={s.tableCell}>Confirmation Statement</Text>
        </View>
        <View style={s.colStatus}>
          <Text style={[s.statusBadge, {
            backgroundColor: STATUS_BG[cs.status],
            color:           STATUS_COLOR[cs.status],
          }]}>
            {fmtStatusLabel(cs.status, cs.daysRemaining)}
          </Text>
          <Text style={{ fontSize: 7, color: C.textMuted, marginTop: 2 }}>
            {STATUS_LABEL[cs.status]}
          </Text>
        </View>
        <View style={s.colDue}>
          <Text style={s.tableCell}>{fmtDate(cs.dueDate)}</Text>
        </View>
        <View style={s.colLast}>
          <Text style={s.tableCell}>{cs.lastFiled ? fmtDate(cs.lastFiled) : '—'}</Text>
        </View>
      </View>

      <View style={s.tableDataRow}>
        <View style={s.colObligation}>
          <Text style={s.tableCell}>Annual Accounts</Text>
          {acc.lastAccountsType ? (
            <Text style={s.tableCellSub}>{acc.lastAccountsType}</Text>
          ) : null}
        </View>
        <View style={s.colStatus}>
          <Text style={[s.statusBadge, {
            backgroundColor: STATUS_BG[acc.status],
            color:           STATUS_COLOR[acc.status],
          }]}>
            {fmtStatusLabel(acc.status, acc.daysRemaining)}
          </Text>
          <Text style={{ fontSize: 7, color: C.textMuted, marginTop: 2 }}>
            {STATUS_LABEL[acc.status]}
          </Text>
        </View>
        <View style={s.colDue}>
          <Text style={s.tableCell}>{fmtDate(acc.dueDate)}</Text>
        </View>
        <View style={s.colLast}>
          <Text style={s.tableCell}>{acc.lastFiled ? fmtDate(acc.lastFiled) : '—'}</Text>
        </View>
      </View>
    </View>
  )
}

function ActionSummary({ data }: { data: ReportData }) {
  const { actionsRequired } = data
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>Action Summary</Text>
      {actionsRequired.length === 0 ? (
        <View style={s.allClearBox}>
          <Text style={s.allClearText}>All compliance obligations are on track.</Text>
        </View>
      ) : (
        <View>
          {actionsRequired.map((action, i) => (
            <View key={i} style={s.actionRow}>
              <Text style={s.actionBullet}>•</Text>
              <Text style={s.actionText}>{action}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function DataFreshnessNotice({ data }: { data: ReportData }) {
  return (
    <View style={s.freshnessBox}>
      <Text style={s.freshnessText}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>Data freshness: </Text>
        This report uses Companies House information available at the time of generation ({fmtDate(data.generatedAt)}).
        Recent filings may not yet be reflected if they have not been processed by Companies House.
      </Text>
    </View>
  )
}

function BrandSignature() {
  return (
    <View style={s.brandSignature}>
      <Text style={s.brandPrepared}>Prepared with</Text>
      <Text style={s.brandName}>ComplyHub</Text>
      <Text style={s.brandTagline}>Compliance intelligence for UK businesses</Text>
    </View>
  )
}

function DisclaimerSection({ data }: { data: ReportData }) {
  return (
    <Text style={s.disclaimer}>
      This report was generated by ComplyHub on {fmtDate(data.generatedAt)} (report ID: {data.reportId}) using publicly
      available data from Companies House. It is provided for informational and compliance monitoring purposes only and
      does not constitute legal, accounting, or professional advice. ComplyHub accepts no liability for decisions made
      on the basis of this report. You should consult a qualified professional before taking any action.
    </Text>
  )
}

function PageFooter({ companyName, companyNumber }: { companyName: string; companyNumber: string }) {
  return (
    <View style={s.pageFooter} fixed render={({ pageNumber }: { pageNumber: number }) => (
      <>
        <Text style={s.footerText}>
          {companyName}  ·  Company No. {companyNumber}
        </Text>
        <Text style={s.footerText}>
          ComplyHub  ·  Page {pageNumber}
        </Text>
      </>
    )} />
  )
}

// ---------------------------------------------------------------------------
// Root document component
// ---------------------------------------------------------------------------
function ComplianceReport({ data }: { data: ReportData }) {
  return (
    <Document
      title={`${data.company.name} — Compliance Report`}
      author="ComplyHub"
      subject="Company Compliance Report"
      creator="ComplyHub"
    >
      <Page size="A4" style={s.page}>
        <ReportHeader data={data} />

        <View style={s.body}>
          <CompanyDetails data={data} />
          <HealthScoreSection data={data} />
          <ComplianceTable data={data} />
          <ActionSummary data={data} />
          <DataFreshnessNotice data={data} />
          <BrandSignature />
          <DisclaimerSection data={data} />
        </View>

        <PageFooter
          companyName={data.company.name}
          companyNumber={data.company.number}
        />
      </Page>
    </Document>
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function generateCompliancePDF(data: ReportData): Promise<ArrayBuffer> {
  const buf = await (renderToBuffer(<ComplianceReport data={data} />) as Promise<Buffer>)
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}
