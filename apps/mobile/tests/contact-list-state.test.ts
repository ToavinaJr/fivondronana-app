import { describe, expect, test } from 'bun:test';
import { contactListReducer, initialContactListState } from '../src/main/contact-list-state';

const contact = {
  id: 'c1',
  name: 'Filoha koto',
  responsibility: 'Mpitantam-bola foibe',
  groupLabel: 'Tily foibe',
  address: 'Antananarivo',
  phone: '+261 34 20 344 96',
  email: 'filoha.koto@example.org',
  description: 'Mifandraisa amin’ireo.',
  kind: 'INTERNAL' as const,
};

describe('contact directory loading state', () => {
  test('models initial loading, data, empty, and retryable error states', () => {
    expect(initialContactListState.status).toBe('loading');
    const loaded = contactListReducer(initialContactListState, {
      type: 'SUCCESS',
      data: [contact],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    expect(loaded.status).toBe('success');
    expect(loaded.data).toEqual([contact]);
    const empty = contactListReducer(initialContactListState, {
      type: 'SUCCESS',
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    expect(empty.status).toBe('success');
    const failed = contactListReducer(initialContactListState, { type: 'FAILURE', message: 'offline' });
    expect(failed.status).toBe('error');
    expect(failed.error).toBe('offline');
  });

  test('retains loaded data while refreshing and after a refresh failure', () => {
    const loaded = contactListReducer(initialContactListState, {
      type: 'SUCCESS',
      data: [contact],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    const refreshing = contactListReducer(loaded, { type: 'REQUEST' });
    expect(refreshing.data).toEqual([contact]);
    expect(refreshing.refreshing).toBe(true);
    const failed = contactListReducer(refreshing, { type: 'FAILURE', message: 'offline' });
    expect(failed.status).toBe('success');
    expect(failed.data).toEqual([contact]);
    expect(failed.error).toBe('offline');
    expect(failed.refreshing).toBe(false);
  });
});
