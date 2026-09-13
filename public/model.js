export const names = { S: 'Socialdemokraterna', M: 'Moderaterna', SD: 'Sverigedemokraterna', C: 'Centerpartiet', V: 'Vänsterpartiet', MP: 'Miljöpartiet', L: 'Liberalerna', KD: 'Kristdemokraterna', ÖVR: 'Övriga partier' };
export const colors = { S: '#df4c53', M: '#478bc5', SD: '#daa83b', C: '#4b9669', V: '#b93a4d', MP: '#86a752', L: '#62b6ce', KD: '#5d65a0', ÖVR: '#92958c' };
export const partyKey = party => party.partiforkortning || party.partibeteckning;
export const partyName = party => names[partyKey(party)] || party.partibeteckning;
export const numeric = value => typeof value === 'number' ? value : value == null ? null : Number(String(value).replace(/[\s%]/g, '').replace(',', '.'));
export function selectedArea(data, area) { return area ? data?.valkretsar?.find(region => region.namn === area) ?? null : data; }
export function partiesFor(data) { return data?.rosterPaverkaMandat?.partiroster || []; }
export function comparison(party, national, mode, comparable = true) {
  if (mode === 'none') return { share: null, delta: null };
  if (mode === 'national') {
    const baseline = partiesFor(national).find(item => partyKey(item) === partyKey(party))?.andelRoster;
    return { share: baseline ?? null, delta: baseline == null || party.andelRoster == null ? null : party.andelRoster - baseline };
  }
  return comparable ? { share: party.andelRosterForegaendeVal ?? null, delta: party.forandringAndelRoster ?? null } : { share: null, delta: null };
}
export function filterParties(parties, { selected = [], query = '', threshold = 'all' } = {}) {
  const text = query.trim().toLocaleLowerCase('sv-SE');
  return parties.filter(p => (!selected.length || selected.includes(partyKey(p))) &&
    `${partyName(p)} ${partyKey(p)}`.toLocaleLowerCase('sv-SE').includes(text) &&
    (threshold === 'all' || (p.andelRoster != null && (threshold === 'above' ? p.andelRoster >= 4 : p.andelRoster < 4))));
}
export function areaMetrics(area, isRegional) {
  if (!area) return { districts: null, total: null, votes: null, eligible: null, turnout: null };
  const valid = area.rosterPaverkaMandat?.antalRoster, invalid = area.rosterEjPaverkaMandat?.antalRoster;
  const total = area.antalValdistriktSomSkaRaknas > 0 ? area.antalValdistriktSomSkaRaknas : null;
  return { districts: total == null ? null : area.antalValdistriktRaknade, total,
    votes: isRegional ? (valid != null && invalid != null ? valid + invalid : null) : numeric(area.totaltAntalRoster),
    eligible: isRegional && !(numeric(area.antalRostberattigade) > 0) ? null : numeric(area.antalRostberattigade),
    turnout: area.valdeltagande == null ? null : numeric(area.valdeltagande) };
}
export function selectionTotal(parties, validVotes) {
  if (!parties.length || !(validVotes > 0)) return null;
  return parties.reduce((sum, party) => sum + (party.antalRoster || 0), 0) / validVotes * 100;
}
export function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
export const blocks = [ { key: 'left', label: 'Vänster', parties: ['S', 'V', 'MP', 'C'] }, { key: 'right', label: 'Höger', parties: ['M', 'KD', 'SD', 'L'] } ];
export function blockResults(data) {
  const parties = partiesFor(data), valid = data?.rosterPaverkaMandat?.antalRoster;
  const previousValid = data?.rosterPaverkaMandat?.antalRosterForegaendeVal;
  return blocks.map(block => {
    const members = block.parties.map(key => parties.find(p => partyKey(p) === key));
    const complete = members.every(p => p && Number.isFinite(p.antalRoster));
    const votes = complete ? members.reduce((sum, p) => sum + p.antalRoster, 0) : null;
    const share = complete && valid > 0 ? votes / valid * 100 : null;
    const previous = members.every(p => p && Number.isFinite(p.antalRosterForegaendeVal)) && previousValid > 0 ? members.reduce((sum, p) => sum + p.antalRosterForegaendeVal, 0) / previousValid * 100 : null;
    return { ...block, members, votes, share, previous, delta: share == null || previous == null ? null : share - previous };
  });
}
export function allocateSeats(data, seats = 349) {
  const parties = partiesFor(data).filter(p => Number.isFinite(p.antalRoster) && p.antalRoster > 0);
  if (!parties.length) return null;
  const valid = data?.rosterPaverkaMandat?.antalRoster;
  if (!(valid > 0)) return null;
  const qualified = parties.filter(p => (p.antalRoster / valid) >= 0.04);
  if (!qualified.length) return null;
  const allocation = Object.fromEntries(parties.map(p => [partyKey(p), 0]));
  for (let seat = 0; seat < seats; seat++) {
    let winner, score = -Infinity;
    for (const party of qualified) {
      const divisor = allocation[partyKey(party)] === 0 ? 1.4 : allocation[partyKey(party)] * 2 + 1;
      const quotient = party.antalRoster / divisor;
      if (quotient > score) { score = quotient; winner = party; }
    }
    allocation[partyKey(winner)]++;
  }
  return { seats, threshold: 4, totalVotes: valid, parties: qualified.map(p => ({ key: partyKey(p), name: partyName(p), votes: p.antalRoster, share: p.andelRoster, seats: allocation[partyKey(p)] })).sort((a, b) => b.seats - a.seats || b.votes - a.votes) };
}
export function mandateMargins(data, seats = 349) {
  const allocation = allocateSeats(data, seats);
  if (!allocation) return null;
  const next = allocation.parties.map(p => ({ ...p, quotient: p.votes / (p.seats * 2 + 1) })).sort((a, b) => b.quotient - a.quotient)[0];
  const last = allocation.parties.filter(p => p.seats > 0)
    .map(p => ({ ...p, quotient: p.votes / (p.seats * 2 - 1) }))
    .sort((a, b) => a.quotient - b.quotient)[0];
  return { gain: next, lose: last };
}
export function seatUncertainty(data, seats = 349) {
  const base = allocateSeats(data, seats); if (!base) return null;
  const total = data.antalValdistriktSomSkaRaknas || 0, counted = data.antalValdistriktRaknade || 0;
  const coverage = total > 0 ? counted / total : 0;
  const margin = Math.max(0.25, Math.min(3.5, (1 - coverage) * 4));
  const shares = base.parties.map(p => ({ ...p, weight: p.share }));
  const scenario = direction => {
    const adjusted = shares.map(p => ({ ...p, weight: Math.max(0.01, p.weight + direction * margin * (p.share < 8 ? 0.8 : 0.35)) }));
    const sum = adjusted.reduce((n,p) => n+p.weight,0);
    const synthetic = { rosterPaverkaMandat: { antalRoster: 100000, partiroster: adjusted.map(p => ({ partiforkortning:p.key, antalRoster:p.weight/sum*100000, andelRoster:p.weight })) } };
    return allocateSeats(synthetic, seats).parties.reduce((map,p) => (map[p.key]=p.seats,map),{});
  };
  const low = scenario(-1), high = scenario(1);
  return { ...base, coverage, margin, parties: base.parties.map(p => ({ ...p, low: Math.min(p.seats, low[p.key] ?? p.seats), high: Math.max(p.seats, high[p.key] ?? p.seats) })) };
}
