import { describe, expect, test } from 'bun:test';
import { initialMainFlow, mainFlowReducer } from '../src/main/main-flow';
import { filterLeaders, leaders } from '../src/main/sample-data';

describe('main app navigation', () => {
  test('starts on archives and switches among all five tabs', () => {
    const state = initialMainFlow;
    const next = mainFlowReducer(state, { type: 'SELECT_TAB', tab: 'leaders' });
    expect(state.tab).toBe('archives');
    expect(next.tab).toBe('leaders');
    expect(mainFlowReducer(next, { type: 'SELECT_TAB', tab: 'contacts' }).tab).toBe('contacts');
  });

  test('opens a CV detail and back returns to the same tab', () => {
    const leaders = mainFlowReducer(initialMainFlow, { type: 'SELECT_TAB', tab: 'leaders' });
    const detail = mainFlowReducer(leaders, { type: 'OPEN_CV', leaderId: 'leader-1' });
    const back = mainFlowReducer(detail, { type: 'BACK' });
    expect(detail.detail).toEqual({ type: 'cv', leaderId: 'leader-1' });
    expect(back.tab).toBe('leaders');
    expect(back.detail).toBeUndefined();
  });

  test('opens notifications and returns to the underlying tab', () => {
    const contacts = mainFlowReducer(initialMainFlow, { type: 'SELECT_TAB', tab: 'contacts' });
    const notification = mainFlowReducer(contacts, { type: 'OPEN_NOTIFICATIONS' });
    const back = mainFlowReducer(notification, { type: 'BACK' });
    expect(notification.detail).toEqual({ type: 'notifications' });
    expect(back.tab).toBe('contacts');
  });

  test('filters leaders by text, entity, and group together', () => {
    expect(filterLeaders(leaders, 'mpiandraikitra b', 'Mena', 'Mpanazava').map((leader) => leader.id)).toEqual(['leader-2']);
    expect(filterLeaders(leaders, 'tsy misy', 'Rehetra', 'Rehetra')).toEqual([]);
  });
});
