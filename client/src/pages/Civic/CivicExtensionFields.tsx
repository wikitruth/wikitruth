import React from 'react';

import type {
  CivicExtensionField,
  CivicExtensionValue,
  CivicRecordKind,
  CivicTenant,
} from '../../types/civic';

export function extensionFieldsForKind(tenant: CivicTenant, kind: CivicRecordKind): CivicExtensionField[] {
  const fields = new Map<string, CivicExtensionField>();
  tenant.extensionSchemas?.['*']?.fields?.forEach((field) => fields.set(field.key, field));
  tenant.extensionSchemas?.[kind]?.fields?.forEach((field) => fields.set(field.key, field));
  return [...fields.values()];
}

interface CivicExtensionFormFieldsProps {
  tenant: CivicTenant;
  kind: CivicRecordKind;
  values: Record<string, CivicExtensionValue | undefined>;
  onChange: (key: string, value: CivicExtensionValue | undefined) => void;
}

export const CivicExtensionFormFields: React.FC<CivicExtensionFormFieldsProps> = ({ tenant, kind, values, onChange }) => {
  const fields = extensionFieldsForKind(tenant, kind);
  if (!fields.length) return null;

  return <fieldset className="wt-civic-extension-fields">
    <legend>{tenant.extensionSchemas[kind]?.title || tenant.extensionSchemas['*']?.title || 'Country-specific details'}</legend>
    {(tenant.extensionSchemas[kind]?.description || tenant.extensionSchemas['*']?.description) && (
      <p className="help-block">{tenant.extensionSchemas[kind]?.description || tenant.extensionSchemas['*']?.description}</p>
    )}
    <div className="row">
      {fields.map((field) => {
        const id = `civic-extension-${field.key}`;
        const value = values[field.key];
        const common = {
          id,
          required: field.required,
          className: 'form-control',
          'aria-describedby': field.description ? `${id}-help` : undefined,
        };
        return <div className={field.type === 'textarea' ? 'col-sm-12 form-group' : 'col-sm-6 form-group'} key={field.key}>
          {field.type === 'boolean' ? (
            <div className="checkbox"><label><input type="checkbox" checked={value === true} onChange={(event) => onChange(field.key, event.target.checked)} /> {field.label}{field.required ? ' *' : ''}</label></div>
          ) : <>
            <label htmlFor={id}>{field.label}</label>
            {field.type === 'textarea' && <textarea {...common} rows={4} minLength={field.minLength} maxLength={field.maxLength || 5000} placeholder={field.placeholder} value={String(value ?? '')} onChange={(event) => onChange(field.key, event.target.value)} />}
            {field.type === 'select' && <select {...common} value={String(value ?? '')} onChange={(event) => onChange(field.key, event.target.value)}><option value="">Select...</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
            {!['textarea', 'select'].includes(field.type) && <input {...common} type={field.type} min={field.min} max={field.max} minLength={field.minLength} maxLength={field.maxLength} placeholder={field.placeholder} value={value == null ? '' : String(value)} onChange={(event) => onChange(field.key, field.type === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)} />}
          </>}
          {field.description && <small className="help-block" id={`${id}-help`}>{field.description}</small>}
        </div>;
      })}
    </div>
  </fieldset>;
};

interface CivicExtensionDetailsProps {
  tenant: CivicTenant;
  kind: CivicRecordKind;
  values?: Record<string, CivicExtensionValue>;
}

export const CivicExtensionDetails: React.FC<CivicExtensionDetailsProps> = ({ tenant, kind, values = {} }) => {
  const fields = extensionFieldsForKind(tenant, kind).filter((field) => values[field.key] !== undefined && values[field.key] !== '');
  if (!fields.length) return null;
  const displayValue = (field: CivicExtensionField): React.ReactNode => {
    const value = values[field.key];
    if (field.type === 'boolean') return value ? 'Yes' : 'No';
    if (field.type === 'select') return field.options?.find((option) => option.value === value)?.label || String(value);
    if (field.type === 'date') return new Intl.DateTimeFormat(tenant.localization.defaultLocale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
    if (field.type === 'url') return <a href={String(value)} rel="noopener noreferrer" target="_blank">{String(value)}</a>;
    if (field.type === 'number') return new Intl.NumberFormat(tenant.localization.defaultLocale).format(Number(value));
    return String(value);
  };
  return <section className="wt-civic-detail-panel">
    <h2>{tenant.extensionSchemas[kind]?.title || tenant.extensionSchemas['*']?.title || 'Country-specific details'}</h2>
    <dl className="wt-civic-facts">{fields.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{displayValue(field)}</dd></div>)}</dl>
  </section>;
};
