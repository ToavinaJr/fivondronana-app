import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { AuthSession, PersonalCv } from '../access/auth-api';
import { getConfiguredApiBaseUrl } from '../access/auth-api';
import { colors } from '../theme/tokens';
import { BrandIcon } from '../access/BrandIcon';
import { createCvCollectionHtml } from './cv-pdf';
import { initialLeaderListState, leaderListReducer } from './leader-list-state';
import { getLeaderFacets, listLeaders, listResponsibleCvs, type LeaderFacets } from './leader-api';

type Props = { session: AuthSession; query: string; onOpenCv: (leaderId: string) => void };
type FilterOption = { id: string; name: string };
const groupLogos: Record<string, { source: number; label: string }> = {
  Tily: { source: require('../assets/tily-logo.jpeg'), label: 'Tily' },
  Mpanazava: { source: require('../assets/mpanaza-logo.jpeg'), label: 'Mpanazava' },
};

export function LeaderDirectoryScreen({ session, query, onOpenCv }: Props) {
  const [state, dispatch] = useReducer(leaderListReducer, initialLeaderListState);
  const [facets, setFacets] = useState<LeaderFacets | null>(null);
  const [facetError, setFacetError] = useState('');
  const [facetAttempt, setFacetAttempt] = useState(0);
  const [entityId, setEntityId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [responsibilityId, setResponsibilityId] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState('');
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
      setExportFeedback('');
      try {
        const result = await listLeaders(
          session.accessToken,
          {
            page,
            pageSize: 20,
            q: debouncedQuery,
            entityId: entityId || undefined,
            groupId: groupId || undefined,
            responsibilityId: responsibilityId || undefined,
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
    [baseUrl, debouncedQuery, entityId, groupId, responsibilityId, session.accessToken],
  );

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

  const exportAll = async () => {
    setExporting(true);
    setExportFeedback('');
    try {
      const firstPage = await listResponsibleCvs(session.accessToken, { page: 1, pageSize: 50 }, baseUrl);
      const cvs: PersonalCv[] = [...firstPage.data];
      for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
        const nextPage = await listResponsibleCvs(session.accessToken, { page, pageSize: 50 }, baseUrl);
        cvs.push(...nextPage.data);
      }
      if (cvs.length === 0) {
        setExportFeedback('Tsy mbola misy CV azo alaina.');
        return;
      }
      const file = await Print.printToFileAsync({ html: createCvCollectionHtml(cvs), base64: false });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'CV rehetra FIVONDRONANA' });
      else setExportFeedback('Vita ny PDF, fa tsy misy fizarana azo ampiasaina amin’ity fitaovana ity.');
    } catch (error) {
      setExportFeedback(error instanceof Error ? error.message : 'Tsy azo amboarina ny PDF. Andramo indray.');
    } finally {
      setExporting(false);
    }
  };

  const entityOptions: FilterOption[] = [{ id: '', name: 'Rehetra' }, ...(facets?.entities ?? [])];
  const groupOptions: FilterOption[] = [
    { id: '', name: 'Rehetra' },
    ...(facets?.groups.filter((item) => !entityId || item.entityId === entityId) ?? []),
  ];
  const responsibilityOptions: FilterOption[] = [{ id: '', name: 'Rehetra' }, ...(facets?.responsibilities ?? [])];

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
      <Text style={styles.heading}>Mpiandraikitra</Text>
      <Text style={styles.subtitle}>Tadiavo araka ny entité, vondrona na andraikitra.</Text>
      <FilterRow
        label="Entité"
        options={entityOptions}
        selected={entityId}
        onSelect={(value) => {
          setEntityId(value);
          setGroupId('');
        }}
      />
      <FilterRow label="Vondrona" options={groupOptions} selected={groupId} onSelect={setGroupId} />
      <FilterRow
        label="Andraikitra"
        options={responsibilityOptions}
        selected={responsibilityId}
        onSelect={setResponsibilityId}
      />
      {facetError ? <InlineRetry message={facetError} onRetry={() => setFacetAttempt((value) => value + 1)} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sintomy PDF ny CV rehetra"
        disabled={exporting || state.data.length === 0}
        onPress={() => {
          void exportAll();
        }}
        style={[styles.exportButton, (exporting || state.data.length === 0) && styles.disabled]}
      >
        {exporting ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <BrandIcon name="download" color={colors.accent} />
            <Text style={styles.exportText}>Sintomy CV rehetra (PDF)</Text>
          </>
        )}
      </Pressable>
      {exportFeedback ? (
        <Text accessibilityRole="alert" style={styles.feedback}>
          {exportFeedback}
        </Text>
      ) : null}
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
            <View style={styles.portrait}>
              {groupLogos[leader.group.name] ? (
                <Image
                  accessibilityLabel={`Emblème ${groupLogos[leader.group.name].label}`}
                  source={groupLogos[leader.group.name].source}
                  resizeMode="contain"
                  style={styles.groupLogo}
                />
              ) : (
                <Text style={styles.initial}>{leader.accountName.slice(0, 1).toLocaleUpperCase()}</Text>
              )}
            </View>
            <View style={styles.leaderCopy}>
              <Text numberOfLines={2} style={styles.name}>
                {leader.accountName}
              </Text>
              <Text numberOfLines={1} style={styles.meta}>
                {leader.entity.name} · {leader.group.name}
              </Text>
              <Text numberOfLines={2} style={styles.responsibility}>
                {leader.responsibilities.join(', ') || 'Tsy mbola misy andraikitra'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Hijery CV an’i ${leader.accountName}`}
              onPress={() => onOpenCv(leader.id)}
              style={({ pressed }) => [styles.cvButton, pressed && styles.pressed]}
            >
              <BrandIcon name="profile" size={16} />
              <Text style={styles.cvButtonText}>Hijery CV</Text>
            </Pressable>
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

function FilterRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {options.map((option) => (
          <Pressable
            key={option.id || 'all'}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === option.id }}
            onPress={() => onSelect(option.id)}
            style={[styles.chip, selected === option.id && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected === option.id && styles.chipTextSelected]}>{option.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24, gap: 10 },
  heading: { color: colors.text, fontSize: 21, fontWeight: '700' },
  subtitle: { color: colors.secondary, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  filterGroup: { gap: 4 },
  filterLabel: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  filterRow: { gap: 8, paddingVertical: 3 },
  chip: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.selected, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextSelected: { color: colors.primary, fontWeight: '600' },
  exportButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  exportText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.55 },
  feedback: { color: colors.secondary, fontSize: 14, lineHeight: 20 },
  leaderRow: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.muted,
    borderRadius: 7,
    padding: 10,
  },
  portrait: {
    width: 54,
    height: 64,
    borderRadius: 5,
    backgroundColor: colors.portrait,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLogo: { width: 52, height: 62 },
  initial: { color: colors.secondary, fontSize: 23, fontWeight: '600' },
  leaderCopy: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.secondary, fontSize: 13 },
  responsibility: { color: colors.text, fontSize: 13 },
  cvButton: {
    minWidth: 94,
    minHeight: 44,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
  },
  cvButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
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
