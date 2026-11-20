import { describe, expect, test } from 'bun:test';
import { initialLeaderListState, type LeaderListState, leaderListReducer } from '../src/main/leader-list-state';

const leader = {
  id: 'l1',
  accountName: 'Tiana',
  entity: { id: 'e1', name: 'Mavo' },
  group: { id: 'g1', name: 'Tily' },
  responsibilities: [],
};

describe('leader directory loading state', () => {
  test('models initial loading, data, empty, and retryable error states', () => {
    expect(initialLeaderListState.status).toBe('loading');
    const loaded = leaderListReducer(initialLeaderListState, {
      type: 'SUCCESS',
      data: [leader],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    expect(loaded.status).toBe('success');
    expect(loaded.data).toEqual([leader]);
    const empty = leaderListReducer(initialLeaderListState, {
      type: 'SUCCESS',
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    expect(empty.status).toBe('success');
    const failed = leaderListReducer(initialLeaderListState, { type: 'FAILURE', message: 'offline' });
    expect(failed.status).toBe('error');
    expect(failed.error).toBe('offline');
  });

  test('retains loaded data while refreshing and after a refresh failure', () => {
    const loaded = leaderListReducer(initialLeaderListState, {
      type: 'SUCCESS',
      data: [leader],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    const refreshing = leaderListReducer(loaded, { type: 'REQUEST' });
    expect(refreshing.data).toEqual([leader]);
    expect(refreshing.refreshing).toBe(true);
    const failed = leaderListReducer(refreshing, { type: 'FAILURE', message: 'offline' });
    expect(failed.status).toBe('success');
    expect(failed.data).toEqual([leader]);
    expect(failed.error).toBe('offline');
    expect(failed.refreshing).toBe(false);
  });
});
