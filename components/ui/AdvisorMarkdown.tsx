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
  const lines    = content.split('\n')
  const nodes:   React.ReactNode[] = []
  let listType:  'ul' | 'ol' | null = null
  let listItems: string[] = []
  let paraLines: string[] = []

  const flushPara = (key: string) => {
    const text = paraLines.join(' ').trim()
    if (text) {
      nodes.push(
        <p key={key} className="leading-relaxed">
          {renderInline(text)}
        </p>,
      )
    }
    paraLines = []
  }

  const flushList = (key: string) => {
    if (!listItems.length) return
    if (listType === 'ul') {
      nodes.push(
        <ul key={key} className="list-disc space-y-0.5 pl-4">
          {listItems.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </ul>,
      )
    } else {
      nodes.push(
        <ol key={key} className="list-decimal space-y-0.5 pl-4">
          {listItems.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </ol>,
      )
    }
    listItems = []
    listType  = null
  }

  lines.forEach((raw, idx) => {
    const trimmed = raw.trim()
    const k       = String(idx)

    if (trimmed.startsWith('## ')) {
      flushPara(`p${k}`); flushList(`l${k}`)
      nodes.push(
        <h4 key={k} className="font-semibold text-text-1">
          {renderInline(trimmed.slice(3))}
        </h4>,
      )
      return
    }

    if (trimmed.startsWith('# ')) {
      flushPara(`p${k}`); flushList(`l${k}`)
      nodes.push(
        <h3 key={k} className="font-semibold text-text-1">
          {renderInline(trimmed.slice(2))}
        </h3>,
      )
      return
    }

    if (/^[-*]\s/.test(trimmed)) {
      flushPara(`p${k}`)
      if (listType !== 'ul') { flushList(`l${k}`); listType = 'ul' }
      listItems.push(trimmed.replace(/^[-*]\s/, ''))
      return
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushPara(`p${k}`)
      if (listType !== 'ol') { flushList(`l${k}`); listType = 'ol' }
      listItems.push(trimmed.replace(/^\d+\.\s+/, ''))
      return
    }

    if (!trimmed) {
      flushPara(`p${k}`); flushList(`l${k}`)
      return
    }

    flushList(`l${k}`)
    paraLines.push(trimmed)
  })

  flushPara('p-end')
  flushList('l-end')

  return (
    <div className="space-y-2 text-sm text-text-2">
      {nodes}
    </div>
  )
}
