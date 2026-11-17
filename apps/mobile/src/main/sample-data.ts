export type ArchiveItem = { id: string; title: string; category: string; format: 'PDF' | 'DOCX'; year?: string };
export type Leader = { id: string; name: string; entity: string; group: string; responsibility: string };
export type Contact = { id: string; name: string; responsibility: string; group: string; address: string; phone: string; email: string; description: string };
export type Notice = { id: string; category: 'Hafatra' | 'Andraikitra' | 'Fifandraisana'; title: string; time: string };

export const archives: ArchiveItem[] = [
  { id: 'history', title: 'Tantaran’ny fivondronana', category: 'Tantara', format: 'PDF' },
  { id: 'equipment', title: 'Fangatahana fitaovana', category: 'Modely', format: 'DOCX' },
  { id: 'technical', title: 'Fiche technique', category: 'Modely', format: 'DOCX' },
];

export const leaders: Leader[] = [
  { id: 'leader-1', name: 'Mpiandraikitra A', entity: 'Maitso', group: 'Tily', responsibility: 'Fampitaovana' },
  { id: 'leader-2', name: 'Mpiandraikitra B', entity: 'Mena', group: 'Mpanazava', responsibility: 'Haim-panahy' },
  { id: 'leader-3', name: 'Mpiandraikitra C', entity: 'Mavo', group: 'Tily', responsibility: 'Fampitaovana' },
  { id: 'leader-4', name: 'Mpiandraikitra D', entity: 'Menafify', group: 'Mpanazava', responsibility: 'Fandrindrana' },
];

export const contacts: Contact[] = [
  { id: 'contact-1', name: 'Tompon’andraikitra A', responsibility: 'Filohan’ny sampana', group: 'Tily foibe', address: 'Antananarivo', phone: '+261 34 00 000 01', email: 'contact1@example.org', description: 'Mifandraisa amin’ny tompon’andraikitra momba ny fandrindrana ny sampana.' },
  { id: 'contact-2', name: 'Tompon’andraikitra B', responsibility: 'Mpiara-miasa', group: 'Fiaraha-miasa', address: 'Toamasina', phone: '+261 34 00 000 02', email: 'contact2@example.org', description: 'Mifandraisa amin’ny ekipa momba ny fiaraha-miasa sy ny tetikasa.' },
];

export const notices: Notice[] = [
  { id: 'notice-1', category: 'Hafatra', title: 'Misy hafatra vaovao ao amin’ny resaka', time: '14:03' },
  { id: 'notice-2', category: 'Andraikitra', title: 'Nohavaozina ny andraikitrao', time: '10:30' },
  { id: 'notice-3', category: 'Fifandraisana', title: 'Nampiana tao amin’ny lisitra ny fifandraisana', time: 'Omaly' },
];

export function filterLeaders(items: Leader[], query: string, entity: string, group: string): Leader[] {
  const term = query.trim().toLocaleLowerCase();
  return items.filter((leader) => {
    const matchesQuery = !term || `${leader.name} ${leader.entity} ${leader.group} ${leader.responsibility}`.toLocaleLowerCase().includes(term);
    return matchesQuery && (entity === 'Rehetra' || leader.entity === entity) && (group === 'Rehetra' || leader.group === group);
  });
}
