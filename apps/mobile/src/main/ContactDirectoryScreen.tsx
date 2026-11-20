import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { AuthSession } from '../access/auth-api';
import { getConfiguredApiBaseUrl } from '../access/auth-api';
import { BrandIcon, type BrandIconName } from '../access/BrandIcon';
import { colors } from '../theme/tokens';
import { type ContactSummary, listContacts } from './contact-api';
import { buildMailUri, buildTelUri } from './contact-links';
import { contactListReducer, initialContactListState } from './contact-list-state';

type Props = { session: AuthSession; query: string };

export function ContactDirectoryScreen({ session, query }: Props) {
  const [state, dispatch] = useReducer(contactListReducer, initialContactListState);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  const [loadingMore, setLoadingMore] = useState(false);
  const currentData = useRef(state.data);
  currentData.current = state.data;
  const baseUrl = getConfiguredApiBaseUrl();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const loadPage = useCallback(
    async (page: number, append: boolean) => {
      if (page === 1) dispatch({ type: 'REQUEST' });
      else setLoadingMore(true);
      try {
        const result = await listContacts(session.accessToken, { page, pageSize: 20, q: debouncedQuery }, baseUrl);
        const data = append ? [...currentData.current, ...result.data] : result.data;
        dispatch({ type: 'SUCCESS', data, pagination: result.pagination });
      } catch (error) {
        dispatch({ type: 'FAILURE', message: error instanceof Error ? error.message : 'Tsy azo vakina ny lisitra.' });
      } finally {
        setLoadingMore(false);
      }
    },
    [baseUrl, debouncedQuery, session.accessToken],
  );

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

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
        Fifandraisana
      </Text>
      <Text style={styles.subtitle}>Ireo tompon’andraikitra sy mpiara-miasa.</Text>
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
        state.data.map((contact) => (
          <ContactRow
            key={contact.id}
            contact={contact}
            expanded={expandedId === contact.id}
            onToggle={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
          />
        ))}
      {state.status === 'success' && state.data.length === 0 ? (
        <Text style={styles.empty}>Tsy misy fifandraisana mifanaraka amin’ny fikarohana.</Text>
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

function ContactRow({
  contact,
  expanded,
  onToggle,
}: {
  contact: ContactSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.contactCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Afenina' : 'Hijery'} ny mombamomba an’i ${contact.name}`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.contactHead}
      >
        <View style={styles.contactMark}>
          <BrandIcon name="contacts" />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{contact.name}</Text>
          <Text style={styles.contactRole}>{contact.responsibility}</Text>
          <Text style={styles.rowMeta}>{contact.groupLabel}</Text>
        </View>
        <Text style={styles.expandLabel}>{expanded ? 'Afenina' : 'Hijery bebe kokoa'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.contactDetails}>
          <View style={styles.contactDetailRow}>
            <BrandIcon name="location" size={18} />
            <Text style={styles.detailLine}>{contact.address}</Text>
          </View>
          <DetailLink icon="phone" label={contact.phone} uri={buildTelUri(contact.phone)} />
          <DetailLink icon="email" label={contact.email} uri={buildMailUri(contact.email)} />
          <Text style={styles.contactDescription}>{contact.description}</Text>
        </View>
      )}
    </View>
  );
}

function DetailLink({ icon, label, uri }: { icon: BrandIconName; label: string; uri: string | null }) {
  if (!uri) {
    return (
      <View style={styles.contactDetailRow}>
        <BrandIcon name={icon} size={18} />
        <Text style={styles.detailLine}>{label}</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => {
        void Linking.openURL(uri);
      }}
      style={({ pressed }) => [styles.contactDetailRow, pressed && styles.pressed]}
    >
      <BrandIcon name={icon} size={18} color={colors.primary} />
      <Text style={[styles.detailLine, styles.detailLink]}>{label}</Text>
    </Pressable>
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
      <Text style={styles.loadingLabel}>Mamaky ny lisitry ny fifandraisana…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28, gap: 8, backgroundColor: colors.page },
  heading: { color: colors.text, fontSize: 23, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.secondary, fontSize: 14, lineHeight: 21, marginBottom: 12 },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowMeta: { color: colors.secondary, fontSize: 13, lineHeight: 18 },
  contactCard: { marginBottom: 8, paddingHorizontal: 12, backgroundColor: colors.muted, borderRadius: 8 },
  contactHead: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRole: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  expandLabel: {
    maxWidth: 88,
    color: colors.primary,
    fontSize: 12,
    textAlign: 'right',
    textDecorationLine: 'underline',
    textDecorationColor: colors.primary,
  },
  contactDetails: { paddingLeft: 52, paddingBottom: 16, gap: 8 },
  detailLine: { flex: 1, color: colors.text, fontSize: 13 },
  detailLink: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  contactDetailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  contactDescription: { marginTop: 5, color: colors.secondary, fontSize: 14, lineHeight: 20 },
  empty: { color: colors.secondary, textAlign: 'center', paddingVertical: 28, fontSize: 15 },
  errorBox: { padding: 12, borderRadius: 7, backgroundColor: colors.errorSurface, gap: 8, marginBottom: 8 },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 20 },
  retryButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8 },
  retryText: { color: colors.primary, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  loadingLabel: { color: colors.secondary, textAlign: 'center', fontSize: 14, paddingVertical: 14 },
  moreButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: colors.primary, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  pressed: { opacity: 0.65 },
});
