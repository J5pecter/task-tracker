import { useState } from 'react';
import type { CustomField } from '@/types';

interface CustomFieldInputProps {
  field: CustomField;
  value: unknown;
  onChange: (value: unknown) => void;
}

/** Renders the correct input for a custom field type and reports changes. */
export function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  const [local, setLocal] = useState<unknown>(value ?? '');

  function commit(v: unknown) {
    setLocal(v);
    onChange(v);
  }

  switch (field.type) {
    case 'text':
      return (
        <input
          className="input"
          value={(local as string) ?? ''}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => onChange(local)}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          className="input"
          value={(local as number) ?? ''}
          onChange={(e) => setLocal(e.target.value === '' ? null : Number(e.target.value))}
          onBlur={() => onChange(local)}
        />
      );
    case 'date':
      return (
        <input
          type="date"
          className="input"
          value={(local as string) ?? ''}
          onChange={(e) => commit(e.target.value)}
        />
      );
    case 'checkbox':
      return (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
          checked={!!local}
          onChange={(e) => commit(e.target.checked)}
        />
      );
    case 'dropdown':
      return (
        <select className="input" value={(local as string) ?? ''} onChange={(e) => commit(e.target.value)}>
          <option value="">—</option>
          {(field.config.options ?? []).map((o) => (
            <option key={o.label} value={o.label}>
              {o.label}
            </option>
          ))}
        </select>
      );
    default:
      return null;
  }
}
