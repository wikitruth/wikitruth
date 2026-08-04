import React, { useMemo, useState } from 'react';
import type {
  AdminPermission,
  DirectPermissionState,
  PermissionCatalogRow,
} from '../../../services/api/admin';

type GroupPermissionRow = Omit<PermissionCatalogRow, 'direct' | 'inheritedFrom' | 'effective'> & { granted: boolean };

type Props = {
  rows: PermissionCatalogRow[] | GroupPermissionRow[];
  states: Record<string, DirectPermissionState>;
  onChange: (permission: AdminPermission, state: DirectPermissionState) => void;
  groupMode?: boolean;
  disabled?: boolean;
};

function isAdministratorRow(row: PermissionCatalogRow | GroupPermissionRow): row is PermissionCatalogRow {
  return 'direct' in row;
}

const PermissionMatrix: React.FC<Props> = ({ rows, states, onChange, groupMode = false, disabled = false }) => {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const families = useMemo(() => {
    const matching = rows.filter((row) => !normalizedQuery || [row.name, row.label, row.description, row.familyLabel]
      .some((value) => value.toLowerCase().includes(normalizedQuery)));
    return matching.reduce<Array<{ id: string; label: string; rows: typeof rows }>>((result, row) => {
      const existing = result.find((family) => family.id === row.family);
      if (existing) existing.rows.push(row);
      else result.push({ id: row.family, label: row.familyLabel, rows: [row] as typeof rows });
      return result;
    }, []);
  }, [normalizedQuery, rows]);

  return (
    <section className="wt-admin-permission-workspace" aria-labelledby="permission-matrix-title">
      <div className="wt-admin-permission-toolbar">
        <div>
          <h2 id="permission-matrix-title">Permission matrix</h2>
          <p>{groupMode ? 'Groups grant access to every assigned administrator.' : 'Direct choices override inherited group access.'}</p>
        </div>
        <label>
          <span className="sr-only">Find a permission</span>
          <input
            className="form-control"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a permission"
          />
        </label>
      </div>

      {families.length === 0 ? <p className="wt-admin-empty">No permissions match this search.</p> : null}
      {families.map((family) => (
        <section className="wt-admin-permission-family" key={family.id}>
          <h3>{family.label}</h3>
          <div className="wt-admin-permission-list">
            {family.rows.map((row) => {
              const state = states[row.name] || 'inherit';
              const inherited = isAdministratorRow(row) ? row.inheritedFrom : [];
              const effective = isAdministratorRow(row) ? row.effective : state === 'allow';
              return (
                <div className="wt-admin-permission-row" key={row.name}>
                  <div className="wt-admin-permission-copy">
                    <div className="wt-admin-permission-title">
                      <strong>{row.label}</strong>
                      <span className={`wt-admin-risk ${row.risk}`}>{row.risk}</span>
                      <span className={`wt-admin-effective ${effective ? 'on' : 'off'}`}>
                        {effective ? 'Effective' : 'Not effective'}
                      </span>
                    </div>
                    <p>{row.description}</p>
                    <code>{row.name}</code>
                    {inherited.length ? <small>Inherited from {inherited.join(', ')}</small> : null}
                  </div>
                  <div className="wt-admin-permission-control" role="group" aria-label={`${row.label} access`}>
                    {!groupMode ? (
                      <button
                        type="button"
                        className={state === 'inherit' ? 'active' : ''}
                        aria-pressed={state === 'inherit'}
                        disabled={disabled}
                        onClick={() => onChange(row.name, 'inherit')}
                      >Inherit</button>
                    ) : null}
                    <button
                      type="button"
                      className={state === 'allow' ? 'active allow' : ''}
                      aria-pressed={state === 'allow'}
                      disabled={disabled}
                      onClick={() => onChange(row.name, 'allow')}
                    >Allow</button>
                    {!groupMode ? (
                      <button
                        type="button"
                        className={state === 'deny' ? 'active deny' : ''}
                        aria-pressed={state === 'deny'}
                        disabled={disabled}
                        onClick={() => onChange(row.name, 'deny')}
                      >Deny</button>
                    ) : (
                      <button
                        type="button"
                        className={state === 'inherit' ? 'active' : ''}
                        aria-pressed={state === 'inherit'}
                        disabled={disabled}
                        onClick={() => onChange(row.name, 'inherit')}
                      >Not granted</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
};

export default PermissionMatrix;
