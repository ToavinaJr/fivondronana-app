import type { ContactSummary, PageMetadata } from './contact-api';

export type ContactListState = {
  status: 'loading' | 'success' | 'error';
  data: ContactSummary[];
  pagination: PageMetadata | null;
  refreshing: boolean;
  error: string | null;
};

export const initialContactListState: ContactListState = {
  status: 'loading',
  data: [],
  pagination: null,
  refreshing: false,
  error: null,
};

export type ContactListAction =
  | { type: 'REQUEST' }
  | { type: 'SUCCESS'; data: ContactSummary[]; pagination: PageMetadata }
  | { type: 'FAILURE'; message: string };

export function contactListReducer(state: ContactListState, action: ContactListAction): ContactListState {
  if (action.type === 'REQUEST') {
    return { ...state, status: state.data.length > 0 ? 'success' : 'loading', refreshing: true, error: null };
  }
  if (action.type === 'FAILURE') {
    return { ...state, status: state.data.length > 0 ? 'success' : 'error', refreshing: false, error: action.message };
  }
  return { status: 'success', data: action.data, pagination: action.pagination, refreshing: false, error: null };
}
