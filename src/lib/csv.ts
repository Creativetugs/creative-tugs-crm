/** Minimal CSV parse/stringify (Excel / Google Sheets friendly). */

export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => normalizeHeader(h))
  return rows.slice(1).filter((row) => row.some((c) => c.trim())).map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
      if (!header) return
      obj[header] = (row[i] ?? '').trim()
    })
    return obj
  })
}

export function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>) {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map((cell) => escapeCsv(cell ?? '')).join(',')),
  ]
  return `${lines.join('\n')}\n`
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function escapeCsv(value: string | number | boolean) {
  const str = String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function splitCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (ch === '\r') {
      // ignore
    } else {
      cell += ch
    }
  }

  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

export function pick(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalized = normalizeHeader(key)
    if (row[normalized] != null && row[normalized] !== '') return row[normalized]
  }
  return ''
}
