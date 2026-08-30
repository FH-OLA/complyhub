import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, id, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-2">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-[var(--input-radius)] border border-border bg-surface px-3 py-2 text-sm text-text-1 placeholder-text-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:opacity-50 ${error ? 'border-semantic-red' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-semantic-red">{error}</p>}
    </div>
  )
}
