export const radarDomains = [
  {
    key: 'nwp',
    label: 'Numerical Weather Prediction',
    short: 'NWP',
    competencyId: 'mcomp-nwp',
    keyword: 'nwp',
  },
  {
    key: 'sat',
    label: 'Satellite Meteorology',
    short: 'Satellite',
    competencyId: 'mcomp-sat',
    keyword: 'satellite',
  },
  {
    key: 'radar',
    label: 'Radar Interpretation',
    short: 'Radar',
    competencyId: 'mcomp-radar',
    keyword: 'radar',
  },
  {
    key: 'cyclone',
    label: 'Cyclone Tracking',
    short: 'Cyclone',
    competencyId: 'mcomp-cyclone',
    keyword: 'cyclone',
  },
  {
    key: 'agro',
    label: 'Agro-Meteorology',
    short: 'Agro-Met',
    competencyId: 'mcomp-agro',
    keyword: 'agro',
  },
];

export function resolveRadarCompetency(competencies, domain) {
  if (!Array.isArray(competencies)) return null;
  const byId = competencies.find(c => c.id === domain.competencyId);
  if (byId) return byId;
  const byName = competencies.find(c =>
    String(c.competency_name || '').toLowerCase().includes(domain.keyword)
  );
  return byName || null;
}

export function radarDomainForCompetency(competencies, competencyId) {
  const comp = (competencies || []).find(c => c.id === competencyId);
  if (!comp) return null;
  return radarDomains.find(d => {
    const resolved = resolveRadarCompetency(competencies, d);
    return resolved && (resolved.id === competencyId || String(comp.competency_name || '').toLowerCase().includes(d.keyword));
  }) || null;
}