import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import civicApi from '../services/api/civic';
import type { CivicActorContext, CivicJurisdiction, CivicTenant, CivicTenantRole } from '../types/civic';

interface CivicTenantContextValue {
  tenant: CivicTenant;
  jurisdictions: CivicJurisdiction[];
  actor: CivicActorContext;
  hasRole: (...roles: CivicTenantRole[]) => boolean;
  refreshJurisdictions: () => Promise<void>;
  refreshActor: () => Promise<void>;
}

const CivicTenantContext = createContext<CivicTenantContextValue | null>(null);

export const CivicTenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<CivicTenant | null>(null);
  const [jurisdictions, setJurisdictions] = useState<CivicJurisdiction[]>([]);
  const [actor, setActor] = useState<CivicActorContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshJurisdictions = useCallback(async () => {
    const result = await civicApi.jurisdictions();
    setJurisdictions(result.jurisdictions || []);
  }, []);

  const refreshActor = useCallback(async () => {
    setActor(await civicApi.actor());
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([civicApi.tenant(), civicApi.jurisdictions(), civicApi.actor()])
      .then(([tenantResult, jurisdictionResult, actorResult]) => {
        if (!active) return;
        setTenant(tenantResult.tenant);
        setJurisdictions(jurisdictionResult.jurisdictions || []);
        setActor(actorResult);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load civic tenant configuration.');
      });
    return () => { active = false; };
  }, []);

  const value = useMemo(() => tenant && actor ? {
    tenant,
    jurisdictions,
    actor,
    hasRole: (...roles: CivicTenantRole[]) => roles.some((role) => actor.roles.includes(role)),
    refreshJurisdictions,
    refreshActor,
  } : null, [actor, jurisdictions, refreshActor, refreshJurisdictions, tenant]);
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!value) return <LoadingSpinner message="Loading civic workspace..." />;

  const style = {
    '--civic-primary': tenant!.branding.primaryColor,
    '--civic-accent': tenant!.branding.accentColor,
    '--civic-surface': tenant!.branding.surfaceColor,
    ...(tenant!.branding.fontFamily ? { '--civic-font': tenant!.branding.fontFamily } : {}),
  } as React.CSSProperties & Record<string, string>;

  return <CivicTenantContext.Provider value={value}><div className="wt-civic-tenant" style={style}>{children}</div></CivicTenantContext.Provider>;
};

export function useCivicTenant(): CivicTenantContextValue {
  const value = useContext(CivicTenantContext);
  if (!value) throw new Error('useCivicTenant must be used within CivicTenantProvider');
  return value;
}
