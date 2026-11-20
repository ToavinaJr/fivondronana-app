import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { AuthSession } from '../access/auth-api';
import { getConfiguredApiBaseUrl, leaderAvatarUrl } from '../access/auth-api';
import { BrandIcon, type BrandIconName } from '../access/BrandIcon';
import { colors } from '../theme/tokens';
import { getLeaderFacets, type LeaderFacets, listLeaders } from './leader-api';
import { initialLeaderListState, leaderListReducer } from './leader-list-state';

type Props = { session: AuthSession; query: string; onOpenCv: (leaderId: string) => void };
type FilterOption = { id: string; name: string };
const groupLogos: Record<string, { source: number; label: string }> = {
  Tily: { source: require('../assets/tily-logo.jpeg'), label: 'Tily' },
  Mpanazava: { source: require('../assets/mpanaza-logo.jpeg'), label: 'Mpanazava' },
};

export function LeaderDirectoryScreen({ session, query, onOpenCv }: Props) {
  const { width, fontScale } = useWindowDimensions();
  const stackedActions = width < 360 || fontScale > 1.2;
  const [state, dispatch] = useReducer(leaderListReducer, initialLeaderListState);
  const [facets, setFacets] = useState<LeaderFacets | null>(null);
  const [facetError, setFacetError] = useState('');
  const [facetAttempt, setFacetAttempt] = useState(0);
  const [entityId, setEntityId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  const [loadingMore, setLoadingMore] = useState(false);
  const currentData = useRef(state.data);
  currentData.current = state.data;
  const baseUrl = getConfiguredApiBaseUrl();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    getLeaderFacets(session.accessToken, baseUrl)
      .then((result) => {
        if (active) {
          setFacets(result);
          setFacetError('');
        }
      })
      .catch((error: Error) => {
        if (active) setFacetError(error.message);
      });
    return () => {
      active = false;
    };
  }, [facetAttempt, session.accessToken, baseUrl]);

  const loadPage = useCallback(
    async (page: number, append: boolean) => {
      if (page === 1) dispatch({ type: 'REQUEST' });
      else setLoadingMore(true);
      try {
        const result = await listLeaders(
          session.accessToken,
          {
            page,
            pageSize: 20,
            q: debouncedQuery,
            entityId: entityId || undefined,
            groupId: groupId || undefined,
          },
          baseUrl,
        );
        const data = append ? [...currentData.current, ...result.data] : result.data;
        dispatch({ type: 'SUCCESS', data, pagination: result.pagination });
      } catch (error) {
        dispatch({ type: 'FAILURE', message: error instanceof Error ? error.message : 'Tsy azo vakina ny lisitra.' });
      } finally {
        setLoadingMore(false);
      }
    },
    [baseUrl, debouncedQuery, entityId, groupId, session.accessToken],
  );

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

  const entityOptions: FilterOption[] = [{ id: '', name: 'Rehetra' }, ...(facets?.entities ?? [])];
  const groupOptions: FilterOption[] = [
    { id: '', name: 'Rehetra' },
    ...(facets?.groups.filter((item) => !entityId || item.entityId === entityId) ?? []),
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={state.refreshing && state.data.length > 0}
          onRefresh={() => void loadPage(1, false)}
          tintColor={colors.primary}
        />
      }
    >
      <Text accessibilityRole="header" style={styles.heading}>
        Mpiandraikitra
      </Text>
      <Text style={styles.subtitle}>Tadiavo araka ny entité na vondrona.</Text>
      <View style={styles.filterRowWrap}>
        <FilterPill
          label="Entité"
          icon="menu"
          options={entityOptions}
          selected={entityId}
          onSelect={(value) => {
            setEntityId(value);
            setGroupId('');
          }}
        />
        <FilterPill label="Vondrona" icon="filter" options={groupOptions} selected={groupId} onSelect={setGroupId} />
      </View>
      {facetError ? <InlineRetry message={facetError} onRetry={() => setFacetAttempt((value) => value + 1)} /> : null}
      {state.status === 'loading' ? <LoadingRows /> : null}
      {state.status === 'error' ? (
        <InlineRetry
          message={state.error ?? 'Tsy azo vakina ny lisitra.'}
          onRetry={() => {
            void loadPage(1, false);
          }}
        />
      ) : null}
      {state.status === 'success' &&
        state.data.map((leader) => (
          <View key={leader.id} style={styles.leaderRow}>
            <View
              style={styles.portrait}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {leader.hasAvatar ? (
                <Image
                  source={{
                    uri: leaderAvatarUrl(leader.id),
                    headers: { Authorization: `Bearer ${session.accessToken}` },
                  }}
                  style={styles.portraitImage}
                />
              ) : (
                <Text style={styles.initial}>{leader.accountName.trim().slice(0, 1).toLocaleUpperCase()}</Text>
              )}
            </View>
            <View style={[styles.leaderBody, stackedActions && styles.leaderBodyStacked]}>
              <View style={[styles.leaderCopy, stackedActions && styles.leaderCopyStacked]}>
                <Text style={styles.name}>{leader.accountName}</Text>
                <View style={styles.groupContext}>
                  {leader.group.name === 'Tily' || leader.group.name === 'Mpanazava' ? (
                    <Image
                      accessibilityLabel={`Emblème ${groupLogos[leader.group.name].label}`}
                      source={groupLogos[leader.group.name].source}
                      resizeMode="contain"
                      style={styles.groupLogo}
                    />
                  ) : null}
                  <Text style={styles.meta}>
                    {leader.entity.name} · {leader.group.name}
                  </Text>
                </View>
                <Text style={styles.responsibility}>
                  {leader.responsibilities.join(', ') || 'Tsy mbola misy andraikitra'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Hijery CV an’i ${leader.accountName}`}
                onPress={() => onOpenCv(leader.id)}
                style={({ pressed }) => [styles.cvButton, pressed && styles.pressed]}
              >
                <Text style={styles.cvButtonText}>CV</Text>
                <BrandIcon name="eye" size={16} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        ))}
      {state.status === 'success' && state.data.length === 0 ? (
        <Text style={styles.empty}>Tsy misy mpiandraikitra mifanaraka amin’ny fikarohana.</Text>
      ) : null}
      {state.pagination && state.pagination.page < state.pagination.totalPages ? (
        <Pressable
          accessibilityRole="button"
          disabled={loadingMore}
          onPress={() => {
            void loadPage(state.pagination!.page + 1, true);
          }}
          style={styles.moreButton}
        >
          {loadingMore ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.moreText}>Haneho bebe kokoa</Text>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function FilterPill({
  label,
  icon,
  options,
  selected,
  onSelect,
}: {
  label: string;
  icon: BrandIconName;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === selected) ?? options[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedOption?.name ?? ''}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        <Text style={styles.pillText} numberOfLines={1}>
          {selectedOption?.name}
        </Text>
        <BrandIcon name={icon} size={16} color={colors.secondary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.modalList}>
              {options.map((option) => (
                <Pressable
                  key={option.id || 'all'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selected === option.id }}
                  onPress={() => {
                    onSelect(option.id);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.modalOption, pressed && styles.pressed]}
                >
                  <Text style={[styles.modalOptionText, selected === option.id && styles.modalOptionTextSelected]}>
                    {option.name}
                  </Text>
                  {selected === option.id ? <BrandIcon name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function InlineRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorBox}>
      <Text accessibilityRole="alert" style={styles.errorText}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
      >
        <Text style={styles.retryText}>Andramo indray</Text>
      </Pressable>
    </View>
  );
}

function LoadingRows() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Mamaky ny lisitra">
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.loadingLabel}>Mamaky ny lisitry ny mpiandraikitra…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 12, backgroundColor: colors.page },
  heading: { color: colors.text, fontSize: 21, fontWeight: '700' },
  subtitle: { color: colors.secondary, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  filterRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillText: { color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: 140 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    maxHeight: '70%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.page,
  },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalList: { flexGrow: 0 },
  modalOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalOptionText: { color: colors.text, fontSize: 15 },
  modalOptionTextSelected: { color: colors.primary, fontWeight: '700' },
  leaderRow: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.muted,
    borderRadius: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    padding: 12,
  },
  portrait: {
    width: 54,
    minHeight: 64,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: colors.portrait,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  portraitImage: { width: 54, height: 64 },
  groupContext: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupLogo: { width: 20, height: 24 },
  initial: { color: colors.secondary, fontSize: 23, fontWeight: '600' },
  leaderBody: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  leaderBodyStacked: { flexDirection: 'column', alignItems: 'stretch' },
  leaderCopy: { flex: 1, minWidth: 0, gap: 3 },
  leaderCopyStacked: { flex: 0, width: '100%' },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.secondary, fontSize: 14, flex: 1 },
  responsibility: { color: colors.text, fontSize: 14 },
  cvButton: {
    minWidth: 56,
    maxWidth: '100%',
    minHeight: 48,
    flexShrink: 0,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
  },
  cvButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  empty: { color: colors.secondary, textAlign: 'center', paddingVertical: 28, fontSize: 15 },
  errorBox: { padding: 12, borderRadius: 7, backgroundColor: colors.errorSurface, gap: 8 },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 20 },
  retryButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8 },
  retryText: { color: colors.primary, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  loadingLabel: { color: colors.secondary, textAlign: 'center', fontSize: 14, paddingVertical: 14 },
  moreButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: colors.primary, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  pressed: { opacity: 0.65 },
});
