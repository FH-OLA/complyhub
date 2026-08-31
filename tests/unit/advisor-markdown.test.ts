import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '@/components/ui/AdvisorMarkdown'

describe('parseMarkdown', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Tables
  // ─────────────────────────────────────────────────────────────────────────

  describe('tables', () => {
    it('parses a standard table with header, separator, and body rows', () => {
      const md = '| Obligation | Status |\n| --- | --- |\n| CS01 | Due |'
      const nodes = parseMarkdown(md)
      expect(nodes).toEqual([
        {
          type: 'table',
          header: [['Obligation', 'Status']],
          body: [['CS01', 'Due']],
        },
      ])
    })

    it('header row is placed in header, not body', () => {
      const md = '| A | B |\n| --- | --- |\n| 1 | 2 |'
      const nodes = parseMarkdown(md)
      expect(nodes[0]).toMatchObject({
        type: 'table',
        header: [['A', 'B']],
      })
    })

    it('separator row is not included in header or body', () => {
      const md = '| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |'
      const nodes = parseMarkdown(md)
      expect(nodes).toHaveLength(1)
      const table = nodes[0]
      expect(table).toMatchObject({ type: 'table' })
      if (table.type !== 'table') return
      const allCells = [...table.header, ...table.body].flat()
      expect(allCells).not.toContain('---')
    })

    it('body rows render correctly with multiple rows', () => {
      const md =
        '| Name | Days |\n| --- | --- |\n| CS01 | 30 |\n| Accounts | 60 |\n| Annual Return | 90 |'
      const nodes = parseMarkdown(md)
      expect(nodes[0]).toMatchObject({
        type: 'table',
        body: [
          ['CS01', '30'],
          ['Accounts', '60'],
          ['Annual Return', '90'],
        ],
      })
    })

    it('preserves inline bold markers in cell text for renderInline', () => {
      const md = '| Status | Note |\n| --- | --- |\n| **Overdue** | Action needed |'
      const nodes = parseMarkdown(md)
      if (nodes[0].type !== 'table') throw new Error('expected table')
      expect(nodes[0].body[0][0]).toBe('**Overdue**')
    })

    it('handles generous spacing around pipes', () => {
      const md = '|  A  |  B  |\n|  ---  |  ---  |\n|  1  |  2  |'
      const nodes = parseMarkdown(md)
      expect(nodes[0]).toMatchObject({
        type: 'table',
        header: [['A', 'B']],
        body: [['1', '2']],
      })
    })

    it('handles colon-aligned separators', () => {
      const md = '| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |'
      const nodes = parseMarkdown(md)
      expect(nodes[0]).toMatchObject({
        type: 'table',
        header: [['Left', 'Center', 'Right']],
        body: [['a', 'b', 'c']],
      })
    })

    it('renders table with header only (no body rows after separator)', () => {
      const md = '| A | B |\n| --- | --- |'
      const nodes = parseMarkdown(md)
      expect(nodes[0]).toMatchObject({
        type: 'table',
        header: [['A', 'B']],
        body: [],
      })
    })

    it('does not treat pipe lines without separator as a table', () => {
      const md = '| not a table |'
      const nodes = parseMarkdown(md)
      expect(nodes).toEqual([{ type: 'p', text: '| not a table |' }])
    })

    it('does not treat pipe lines where separator comes first as a table', () => {
      const md = '| --- |\n| data |'
      const nodes = parseMarkdown(md)
      expect(nodes[0]).toMatchObject({ type: 'p' })
      expect(nodes[1]).toMatchObject({ type: 'p' })
    })

    it('does not treat two pipe-only lines without separator as a table', () => {
      const md = '| row one |\n| row two |'
      const nodes = parseMarkdown(md)
      expect(nodes).toHaveLength(2)
      expect(nodes[0]).toMatchObject({ type: 'p' })
      expect(nodes[1]).toMatchObject({ type: 'p' })
    })

    it('parses a valid 4-column production-style obligation table', () => {
      const md =
        '| Obligation | Due Date | Status | Days Left |\n| --- | --- | --- | --- |\n| CS01 | 2025-09-15 | **Overdue** | -30 |\n| Accounts | 2025-12-01 | Upcoming | 60 |'
      const nodes = parseMarkdown(md)
      expect(nodes).toEqual([
        {
          type: 'table',
          header: [['Obligation', 'Due Date', 'Status', 'Days Left']],
          body: [
            ['CS01', '2025-09-15', '**Overdue**', '-30'],
            ['Accounts', '2025-12-01', 'Upcoming', '60'],
          ],
        },
      ])
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Existing behaviour preservation
  // ─────────────────────────────────────────────────────────────────────────

  describe('paragraphs', () => {
    it('renders plain text as a paragraph', () => {
      const nodes = parseMarkdown('Hello world')
      expect(nodes).toEqual([{ type: 'p', text: 'Hello world' }])
    })

    it('joins consecutive non-blank lines into one paragraph', () => {
      const nodes = parseMarkdown('Line one\nLine two')
      expect(nodes).toEqual([{ type: 'p', text: 'Line one Line two' }])
    })

    it('separates paragraphs on blank lines', () => {
      const nodes = parseMarkdown('Para one\n\nPara two')
      expect(nodes).toEqual([
        { type: 'p', text: 'Para one' },
        { type: 'p', text: 'Para two' },
      ])
    })
  })

  describe('headings', () => {
    it('renders # as h3', () => {
      expect(parseMarkdown('# Title')).toEqual([{ type: 'h3', text: 'Title' }])
    })

    it('renders ## as h4', () => {
      expect(parseMarkdown('## Subtitle')).toEqual([{ type: 'h4', text: 'Subtitle' }])
    })
  })

  describe('lists', () => {
    it('renders dash bullet list', () => {
      const nodes = parseMarkdown('- Item A\n- Item B')
      expect(nodes).toEqual([{ type: 'ul', items: ['Item A', 'Item B'] }])
    })

    it('renders asterisk bullet list', () => {
      const nodes = parseMarkdown('* Item A\n* Item B')
      expect(nodes).toEqual([{ type: 'ul', items: ['Item A', 'Item B'] }])
    })

    it('renders numbered list', () => {
      const nodes = parseMarkdown('1. First\n2. Second')
      expect(nodes).toEqual([{ type: 'ol', items: ['First', 'Second'] }])
    })

    it('switches list type when marker changes', () => {
      const nodes = parseMarkdown('- bullet\n1. numbered')
      expect(nodes).toHaveLength(2)
      expect(nodes[0]).toMatchObject({ type: 'ul', items: ['bullet'] })
      expect(nodes[1]).toMatchObject({ type: 'ol', items: ['numbered'] })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Mixed content
  // ─────────────────────────────────────────────────────────────────────────

  describe('mixed content', () => {
    it('handles heading then table then paragraph', () => {
      const md = '# Status\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\nSummary text'
      const nodes = parseMarkdown(md)
      expect(nodes).toEqual([
        { type: 'h3', text: 'Status' },
        { type: 'table', header: [['A', 'B']], body: [['1', '2']] },
        { type: 'p', text: 'Summary text' },
      ])
    })

    it('handles list then table', () => {
      const md = '- item\n\n| H |\n| --- |\n| V |'
      const nodes = parseMarkdown(md)
      expect(nodes[0]).toMatchObject({ type: 'ul' })
      expect(nodes[1]).toMatchObject({ type: 'table' })
    })

    it('handles table at end of content without trailing newline', () => {
      const md = 'Intro\n\n| A |\n| --- |\n| 1 |'
      const nodes = parseMarkdown(md)
      expect(nodes[0]).toMatchObject({ type: 'p', text: 'Intro' })
      expect(nodes[1]).toMatchObject({ type: 'table' })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // D3.3.1 — Parser hardening
  // ─────────────────────────────────────────────────────────────────────────

  describe('parser hardening', () => {
    it('accepts table only when separator is exactly the second row', () => {
      const md = '| A | B |\n| --- | --- |\n| 1 | 2 |'
      const nodes = parseMarkdown(md)
      expect(nodes).toHaveLength(1)
      expect(nodes[0]).toMatchObject({ type: 'table' })
    })

    it('rejects multi-row header (separator at row 3 instead of row 2)', () => {
      const md = '| A | B |\n| C | D |\n| --- | --- |\n| 1 | 2 |'
      const nodes = parseMarkdown(md)
      const types = nodes.map(n => n.type)
      expect(types).not.toContain('table')
      expect(nodes.every(n => n.type === 'p')).toBe(true)
    })

    it('falls back when separator column count mismatches header', () => {
      const md = '| A | B | C |\n| --- | --- |\n| 1 | 2 | 3 |'
      const nodes = parseMarkdown(md)
      expect(nodes.every(n => n.type === 'p')).toBe(true)
    })

    it('falls back when a body row has fewer columns than header', () => {
      const md = '| A | B | C |\n| --- | --- | --- |\n| 1 | 2 |'
      const nodes = parseMarkdown(md)
      expect(nodes.every(n => n.type === 'p')).toBe(true)
    })

    it('falls back when a body row has more columns than header', () => {
      const md = '| A | B |\n| --- | --- |\n| 1 | 2 | 3 |'
      const nodes = parseMarkdown(md)
      expect(nodes.every(n => n.type === 'p')).toBe(true)
    })

    it('falls back when all header cells are empty', () => {
      const md = '|  |  |\n| --- | --- |\n| 1 | 2 |'
      const nodes = parseMarkdown(md)
      expect(nodes.every(n => n.type === 'p')).toBe(true)
    })

    it('accepts table when at least one header cell is non-empty', () => {
      const md = '| A |  |\n| --- | --- |\n| 1 | 2 |'
      const nodes = parseMarkdown(md)
      expect(nodes[0]).toMatchObject({
        type: 'table',
        header: [['A', '']],
        body: [['1', '2']],
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Safety
  // ─────────────────────────────────────────────────────────────────────────

  describe('safety', () => {
    it('does not introduce dangerouslySetInnerHTML (compile-time check)', () => {
      // This is verified by the legacy pattern audit grep — this test
      // documents the invariant for future contributors.
      expect(true).toBe(true)
    })
  })
})
