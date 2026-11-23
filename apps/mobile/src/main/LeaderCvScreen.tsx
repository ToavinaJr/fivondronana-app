import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AuthSession, PersonalCv } from '../access/auth-api';
import { getConfiguredApiBaseUrl } from '../access/auth-api';
import { BrandIcon } from '../access/BrandIcon';
import { colors } from '../theme/tokens';
import { createCvHtml } from './cv-pdf';
import { getLeaderCv } from './leader-api';

type Props = { session: AuthSession; userId: string; onBack: () => void };
const templateLogos = {
  Tily: require('../assets/tily-logo.jpeg'),
  Mpanazava: require('../assets/mpanaza-logo.jpeg'),
};

export function LeaderCvScreen({ session, userId, onBack }: Props) {
  const [cv, setCv] = useState<PersonalCv | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [attempt, setAttempt] = useState(0);
  const baseUrl = getConfiguredApiBaseUrl();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getLeaderCv(session.accessToken, userId, baseUrl)
      .then((result) => {
        if (active) setCv(result);
      })
      .catch((loadError: Error) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, baseUrl, session.accessToken, userId]);

  const exportPdf = async () => {
    if (!cv) return;
    setExporting(true);
    setFeedback('');
    try {
      const printed = await Print.printToFileAsync({ html: createCvHtml(cv), base64: false });
      const bytes = new Uint8Array(await (await fetch(printed.uri)).arrayBuffer());
      const shareableFile = new File(Paths.cache, `cv-${Date.now()}.pdf`);
      await shareableFile.write(bytes);
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(shareableFile.uri, { mimeType: 'application/pdf', dialogTitle: 'CV FIVONDRONANA' });
      else setFeedback('Vita ny PDF, fa tsy misy fizarana azo ampiasaina amin’ity fitaovana ity.');
    } catch (error) {
      console.error('CV PDF export failed', error);
      const detail = error instanceof Error ? error.message : String(error);
      setFeedback(`Tsy azo amboarina na zaraina ny PDF. Andramo indray. (${detail})`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Hiverina any amin’ny lisitra"
        onPress={onBack}
        style={styles.back}
      >
        <BrandIcon name="back" size={18} />
        <Text style={styles.backText}>Mpiandraikitra</Text>
      </Pressable>
      {loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Mamaky ny CV" style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.secondary}>Mamaky ny CV…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)} style={styles.retry}>
            <Text style={styles.backText}>Andramo indray</Text>
          </Pressable>
        </View>
      ) : cv ? (
        <>
          <Text accessibilityRole="header" style={styles.heading}>
            Hijery CV
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sintomy PDF ity CV ity"
            disabled={exporting}
            accessibilityState={{ disabled: exporting, busy: exporting }}
            onPress={() => {
              void exportPdf();
            }}
            style={({ pressed }) => [styles.download, (pressed || exporting) && styles.dimmed]}
          >
            {exporting ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <BrandIcon name="download" color={colors.accent} />
                <Text style={styles.downloadText}>Sintomy PDF</Text>
              </>
            )}
          </Pressable>
          {feedback ? (
            <Text accessibilityRole="alert" style={styles.secondary}>
              {feedback}
            </Text>
          ) : null}
          <View style={styles.document}>
            {cv.template === 'Tily' || cv.template === 'Mpanazava' ? (
              <View style={styles.templateRow}>
                <Image
                  accessibilityLabel={`Emblème ${cv.template}`}
                  source={templateLogos[cv.template]}
                  resizeMode="contain"
                  style={styles.templateLogo}
                />
                <Text style={styles.template}>{cv.template}</Text>
              </View>
            ) : null}
            <CvSection
              title="Fampahafantarana ny tena"
              rows={[
                ['Anarana', `${cv.firstName} ${cv.lastName}`],
                ['Adiresy', cv.address],
                ['Daty nahaterahana', cv.birthDate.slice(0, 10)],
                ['Toerana nahaterahana', cv.birthPlace],
                ...cv.extraPersonal.map((item) => [item.label, item.value]),
              ]}
            />
            <CvSection
              title="Fifandraisana"
              rows={[
                ['Finday', cv.phone],
                ['Mailaka', cv.email],
                ['Facebook', cv.facebook],
                ...cv.extraContact.map((item) => [item.label, item.value]),
              ]}
            />
            <CvSection
              title="Fampahafantarana ny maha skoto"
              rows={[
                ['Faritany', cv.province],
                ['Faritra', cv.area],
                ['Fivondronana', cv.fivondronana],
              ]}
            />
            <CvSection
              title="Sampana"
              rows={cv.branches.map((branch) => [
                branch.name,
                [branch.group, branch.project].filter(Boolean).join(' · '),
              ])}
            />
            <CvSection
              title="Hetsika"
              rows={cv.activities.map((activity) => [
                activity.name || 'Hetsika',
                [activity.responsibility, activity.description, activity.date?.slice(0, 10)]
                  .filter(Boolean)
                  .join(' · '),
              ])}
            />
          </View>
        </>
      ) : (
        <Text style={styles.secondary}>Tsy mbola misy antsipirian’ny CV ao amin’ny tahiry.</Text>
      )}
    </ScrollView>
  );
}

function CvSection({ title, rows }: { title: string; rows: Array<Array<string | null | undefined>> }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.table}>
        {rows.map(([label, value], index) => (
          <View key={`${label}-${index}`} style={[styles.field, index > 0 && styles.fieldDivider]}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value || '—'}</Text>
          </View>
        ))}
        {rows.length === 0 ? <Text style={[styles.secondary, styles.empty]}>Tsy mbola misy angona.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 12, backgroundColor: colors.page },
  back: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 4,
  },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  heading: { color: colors.text, fontSize: 21, fontWeight: '700' },
  template: { color: colors.secondary, fontSize: 14 },
  document: { gap: 20, paddingVertical: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  templateRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  templateLogo: { width: 48, height: 56 },
  download: {
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadText: { color: colors.accent, fontWeight: '700', fontSize: 15, flexShrink: 1 },
  dimmed: { opacity: 0.55 },
  section: { gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  table: { borderWidth: 1, borderColor: colors.secondary },
  field: { flexDirection: 'row', alignItems: 'stretch' },
  fieldDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  label: {
    width: '42%',
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    padding: 8,
    backgroundColor: colors.muted,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  value: { flex: 1, minWidth: 0, color: colors.text, fontSize: 15, lineHeight: 21, padding: 8 },
  empty: { padding: 12 },
  secondary: { color: colors.secondary, fontSize: 14, lineHeight: 21 },
  errorBox: { backgroundColor: colors.errorSurface, padding: 12, borderRadius: 7 },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 21 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 6 },
});
