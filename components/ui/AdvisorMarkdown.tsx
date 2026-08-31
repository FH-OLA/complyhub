export type MdNode =
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; header: string[][]; body: string[][] }

function isTableRow(line: string): boolean {
  const t = line.trim()
  return t.length >= 3 && t.charCodeAt(0) === 0x7C && t.charCodeAt(t.length - 1) === 0x7C
}

function parseTableCells(line: string): string[] {
  const t = line.trim()
  return t.slice(1, -1).split('|').map(c => c.trim())
}

function isSeparatorCells(cells: string[]): boolean {
  return cells.length > 0 && cells.every(c => /^:?-+:?$/.test(c))
}

export function parseMarkdown(content: string): MdNode[] {
  const lines = content.split('\n')
  const nodes: MdNode[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []
  let paraLines: string[] = []
  let tableLines: string[] = []

  const flushPara = () => {
    const text = paraLines.join(' ').trim()
    if (text) nodes.push({ type: 'p', text })
    paraLines = []
  }

  const flushList = () => {
    if (!listItems.length) return
    nodes.push({ type: listType === 'ol' ? 'ol' : 'ul', items: [...listItems] })
    listItems = []
    listType = null
  }

  const flushTable = () => {
    if (!tableLines.length) return
    const rows = tableLines.map(parseTableCells)

    const headerCells = rows[0]
    const colCount = headerCells?.length ?? 0
    const valid =
      rows.length >= 2 &&
      colCount >= 1 &&
      headerCells.some(c => c.length > 0) &&
      isSeparatorCells(rows[1]) &&
      rows[1].length === colCount &&
      rows.slice(2).every(r => r.length === colCount)

    if (valid) {
      nodes.push({
        type: 'table',
        header: [headerCells],
        body: rows.slice(2),
      })
    } else {
      for (const line of tableLines) {
        nodes.push({ type: 'p', text: line.trim() })
      }
    }
    tableLines = []
  }

  for (const raw of lines) {
    const trimmed = raw.trim()

    if (isTableRow(trimmed)) {
      flushPara()
      flushList()
      tableLines.push(trimmed)
      continue
    }

    flushTable()

    if (trimmed.startsWith('## ')) {
      flushPara(); flushList()
      nodes.push({ type: 'h4', text: trimmed.slice(3) })
      continue
    }

    if (trimmed.startsWith('# ')) {
      flushPara(); flushList()
      nodes.push({ type: 'h3', text: trimmed.slice(2) })
      continue
    }

    if (/^[-*]\s/.test(trimmed)) {
      flushPara()
      if (listType !== 'ul') { flushList(); listType = 'ul' }
      listItems.push(trimmed.replace(/^[-*]\s/, ''))
      continue
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushPara()
      if (listType !== 'ol') { flushList(); listType = 'ol' }
      listItems.push(trimmed.replace(/^\d+\.\s+/, ''))
      continue
    }

    if (!trimmed) {
      flushPara(); flushList()
      continue
    }

    flushList()
    paraLines.push(trimmed)
  }

  flushPara()
  flushList()
  flushTable()

  return nodes
}

function renderInline(text: string): React.ReactNode {
  const segments = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {segments.map((seg, i) =>
        seg.startsWith('**') && seg.endsWith('**') ? (
          <strong key={i}>{seg.slice(2, -2)}</strong>
        ) : (
          seg
        ),
      )}
    </>
  )
}

export default function AdvisorMarkdown({ content }: { content: string }) {
  const parsed = parseMarkdown(content)

  return (
    <div className="space-y-2 text-sm text-text-2">
      {parsed.map((node, i) => {
        switch (node.type) {
          case 'h3':
            return (
              <h3 key={i} className="font-semibold text-text-1">
                {renderInline(node.text)}
              </h3>
            )
          case 'h4':
            return (
              <h4 key={i} className="font-semibold text-text-1">
                {renderInline(node.text)}
              </h4>
            )
          case 'p':
            return (
              <p key={i} className="leading-relaxed">
                {renderInline(node.text)}
              </p>
            )
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-0.5 pl-4">
                {node.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-0.5 pl-4">
                {node.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            )
          case 'table':
            return (
              <div key={i} className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    {node.header.map((row, ri) => (
                      <tr key={ri} className="border-b border-border">
                        {row.map((cell, ci) => (
                          <th
                            key={ci}
                            className="px-3 py-1.5 text-left text-xs font-medium text-text-1"
                          >
                            {renderInline(cell)}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  {node.body.length > 0 && (
                    <tbody>
                      {node.body.map((row, ri) => (
                        <tr
                          key={ri}
                          className={ri < node.body.length - 1 ? 'border-b border-border-light' : ''}
                        >
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-1.5 text-text-2">
                              {renderInline(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            )
        }
      })}
    </div>
  )
}
