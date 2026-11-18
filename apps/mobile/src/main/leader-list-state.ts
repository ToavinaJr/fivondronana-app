import type { LeaderSummary, PageMetadata } from './leader-api';

export type LeaderListState = {
  status: 'loading' | 'success' | 'error';
  data: LeaderSummary[];
  pagination: PageMetadata | null;
  refreshing: boolean;
  error: string | null;
};

export const initialLeaderListState: LeaderListState = {
  status: 'loading',
  data: [],
  pagination: null,
  refreshing: false,
  error: null,
};

export type LeaderListAction =
  | { type: 'REQUEST' }
  | { type: 'SUCCESS'; data: LeaderSummary[]; pagination: PageMetadata }
  | { type: 'FAILURE'; message: string };

export function leaderListReducer(state: LeaderListState, action: LeaderListAction): LeaderListState {
  if (action.type === 'REQUEST') {
    return { ...state, status: state.data.length > 0 ? 'success' : 'loading', refreshing: true, error: null };
  }
  if (action.type === 'FAILURE') {
    return { ...state, status: state.data.length > 0 ? 'success' : 'error', refreshing: false, error: action.message };
  }
  return { status: 'success', data: action.data, pagination: action.pagination, refreshing: false, error: null };
}
