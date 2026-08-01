import { useRef, useState } from 'react'
import { Download, Upload, FileSpreadsheet } from 'lucide-react'

interface SheetActionsProps {
  onDownload: () => void
  onTemplate: () => void
  onUploadText: (text: string) => Promise<void>
  busy?: boolean
  label?: string
}

export function SheetActions({
  onDownload,
  onTemplate,
  onUploadText,
  busy,
  label = 'sheet',
}: SheetActionsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function onFile(file: File | null) {
    if (!file) return
    setError('')
    setMessage('')
    setUploading(true)
    try {
      const text = await file.text()
      await onUploadText(text)
      setMessage(`Uploaded ${file.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const disabled = busy || uploading

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onTemplate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:border-sea disabled:opacity-60"
          title={`Download ${label} CSV template`}
        >
          <FileSpreadsheet size={16} />
          Template
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDownload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:border-sea disabled:opacity-60"
        >
          <Download size={16} />
          Download CSV
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-sm font-medium hover:border-sea disabled:opacity-60"
        >
          <Upload size={16} />
          {uploading ? 'Uploading…' : 'Upload CSV'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {message && <p className="text-xs text-won">{message}</p>}
      {error && <p className="text-xs text-lost">{error}</p>}
    </div>
  )
}
