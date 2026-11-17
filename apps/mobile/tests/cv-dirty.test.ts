import { describe, expect, it } from 'bun:test';
import { isCvDirty } from '../src/main/cv-dirty';

describe('CV dirty state', () => {
  it('treats an unchanged CV as clean', () => {
    const cv = { firstName: 'Miora', branches: [{ name: 'Mpanazava' }] };
    expect(isCvDirty(cv, cv)).toBe(false);
  });

  it('detects field and nested row changes', () => {
    const saved = { firstName: 'Miora', branches: [{ name: 'Mpanazava' }] };
    expect(isCvDirty({ ...saved, firstName: 'Soa' }, saved)).toBe(true);
    expect(isCvDirty({ ...saved, branches: [{ name: 'Mpiandalana' }] }, saved)).toBe(true);
  });

  it('does not treat distinct object references with equal values as changed', () => {
    expect(isCvDirty({ firstName: 'Miora', branches: [] }, { firstName: 'Miora', branches: [] })).toBe(false);
  });
});
