import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type AuthSession, getConfiguredApiBaseUrl } from '../access/auth-api';
import { BrandIcon } from '../access/BrandIcon';
import { colors } from '../theme/tokens';
import { type ArchiveSummary, archiveErrorKind, downloadArchive, listArchives } from './archive-api';
import { formatArchiveSize } from './archive-format';

type Props = { session: AuthSession; onSessionExpired: () => void };
type LoadState = 'loading' | 'success' | 'error';

export function ArchiveDirectoryScreen({ session, onSessionExpired }: Props) {
  const [archives, setArchives] = useState<ArchiveSummary[]>([]);
  const [status, setStatus] = useState<LoadState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const baseUrl = getConfiguredApiBaseUrl();

  const loadArchives = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setArchives(await listArchives(session.accessToken, baseUrl));
      setStatus('success');
    } catch (reason) {
      if (archiveErrorKind(reason) === 'session-expired') {
        onSessionExpired();
        return;
      }
      setError(reason instanceof Error ? reason.message : 'Tsy azo vakina ny arisiva.');
      setStatus('error');
    }
  }, [baseUrl, onSessionExpired, session.accessToken]);

  useEffect(() => {
    void loadArchives();
  }, [loadArchives]);

  const openArchive = async (archive: ArchiveSummary) => {
    setDownloadingId(archive.id);
    setDownloadError(null);
    try {
      const bytes = await downloadArchive(archive.id, session.accessToken, baseUrl, archive.size);
      const file = new File(Paths.document, `archive-${safeFileId(archive.id)}${extensionFor(archive)}`);
      await file.write(bytes);
      try {
        await file.preview({ title: archive.title, mimeType: archive.contentType });
      } catch {
        if (!(await Sharing.isAvailableAsync()))
          throw new Error('Tsy afaka sokafana amin’ity fitaovana ity ny rakitra.');
        await Sharing.shareAsync(file.uri, {
          dialogTitle: archive.title,
          mimeType: archive.contentType,
        });
      }
    } catch (reason) {
      if (archiveErrorKind(reason) === 'session-expired') {
        onSessionExpired();
        return;
      }
      setDownloadError(reason instanceof Error ? reason.message : 'Tsy azo sintonina ny rakitra. Andramo indray.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={status === 'loading' && archives.length > 0}
          onRefresh={() => void loadArchives()}
          tintColor={colors.primary}
        />
      }
    >
      <Text accessibilityRole="header" style={styles.heading}>
        Arisiva
      </Text>
      <Text style={styles.subtitle}>Antontan-taratasy ofisialy sy tahiry ho an’ny mpiandraikitra.</Text>

      {status === 'loading' && archives.length === 0 ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Mamaky ny arisiva" style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Mamaky ny arisiva…</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => void loadArchives()} style={styles.retryButton}>
            <Text style={styles.retryText}>Andramo indray</Text>
          </Pressable>
        </View>
      ) : null}

      {status === 'success' && archives.length === 0 ? (
        <View style={styles.emptyBox}>
          <BrandIcon name="archive" size={32} color={colors.secondary} />
          <Text style={styles.emptyText}>Tsy mbola misy antontan-taratasy navoaka.</Text>
        </View>
      ) : null}

      {archives.map((archive) => {
        const isDownloading = downloadingId === archive.id;
        return (
          <Pressable
            key={archive.id}
            accessibilityRole="button"
            accessibilityLabel={`Sokafy ${archive.title}`}
            accessibilityState={{ disabled: downloadingId !== null, busy: isDownloading }}
            disabled={downloadingId !== null}
            onPress={() => void openArchive(archive)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed, downloadingId !== null && styles.disabled]}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.iconLabel}>{fileTypeLabel(archive.contentType)}</Text>
            </View>
            <View style={styles.details}>
              <Text style={styles.title}>{archive.title}</Text>
              {archive.description ? <Text style={styles.description}>{archive.description}</Text> : null}
              <Text style={styles.meta}>
                {archive.category} · {archive.year} · {formatArchiveSize(archive.size)}
              </Text>
            </View>
            {isDownloading ? (
              <View style={styles.openButton}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
      {downloadError ? (
        <Text accessibilityRole="alert" style={styles.downloadError}>
          {downloadError}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function fileTypeLabel(contentType: string): string {
  return contentType === 'application/pdf' ? 'PDF' : 'DOCX';
}

function extensionFor(archive: ArchiveSummary): string {
  switch (archive.contentType) {
    case 'application/pdf':
      return '.pdf';
    case 'application/msword':
      return '.doc';
    default:
      return '.docx';
  }
}

function safeFileId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'document';
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 8,
    backgroundColor: colors.page,
  },
  heading: { color: colors.text, fontSize: 23, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: colors.secondary, fontSize: 14, lineHeight: 21, marginBottom: 12 },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  muted: { color: colors.secondary, fontSize: 14 },
  card: {
    minHeight: 84,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.muted,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.page,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: { color: colors.secondary, fontSize: 10, fontWeight: '700' },
  details: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  description: { color: colors.secondary, fontSize: 13, lineHeight: 18 },
  meta: { color: colors.secondary, fontSize: 12 },
  openButton: { minWidth: 44, minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.55 },
  errorBox: { backgroundColor: colors.warningSurface, borderRadius: 8, padding: 16, gap: 10 },
  errorText: { color: colors.warningText, fontSize: 14, lineHeight: 20 },
  retryButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8 },
  retryText: { color: colors.primary, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  emptyBox: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20 },
  emptyText: { color: colors.secondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  downloadError: { color: colors.warningText, fontSize: 14, lineHeight: 20, marginTop: 8 },
});
