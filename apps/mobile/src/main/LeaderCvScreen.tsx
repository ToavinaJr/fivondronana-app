import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { AuthSession, PersonalCv } from '../access/auth-api';
import { getConfiguredApiBaseUrl } from '../access/auth-api';
import { colors } from '../theme/tokens';
import { createCvHtml } from './cv-pdf';
import { getLeaderCv } from './leader-api';

type Props = { session: AuthSession; userId: string; onBack: () => void };

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
      const file = await Print.printToFileAsync({ html: createCvHtml(cv), base64: false });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'CV FIVONDRONANA' });
      else setFeedback('Vita ny PDF, fa tsy misy fizarana azo ampiasaina amin’ity fitaovana ity.');
    } catch {
      setFeedback('Tsy azo amboarina na zaraina ny PDF. Andramo indray.');
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
        <Text style={styles.backText}>‹ Mpiandraikitra</Text>
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
          <Text style={styles.heading}>Hijery CV</Text>
          {cv.template ? <Text style={styles.template}>{cv.template}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sintomy PDF ity CV ity"
            disabled={exporting}
            onPress={() => {
              void exportPdf();
            }}
            style={styles.download}
          >
            {exporting ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={styles.downloadText}>Sintomy PDF</Text>
            )}
          </Pressable>
          {feedback ? (
            <Text accessibilityRole="alert" style={styles.secondary}>
              {feedback}
            </Text>
          ) : null}
          <CvSection
            title="Fampahafantarana ny tena"
            rows={[
              ['Anarana', `${cv.firstName} ${cv.lastName}`],
              ['Adiresy', cv.address],
              ['Daty nahaterahana', cv.birthDate.slice(0, 10)],
              ['Toerana nahaterahana', cv.birthPlace],
              ...cv.extraPersonal.map((value, index) => [`Fanampiny ${index + 1}`, value]),
            ]}
          />
          <CvSection
            title="Fifandraisana"
            rows={[
              ['Finday', cv.phone],
              ['Mailaka', cv.email],
              ['Facebook', cv.facebook],
              ...cv.extraContact.map((value, index) => [`Fifandraisana fanampiny ${index + 1}`, value]),
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
              [activity.responsibility, activity.description, activity.date?.slice(0, 10)].filter(Boolean).join(' · '),
            ])}
          />
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
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.map(([label, value], index) => (
        <View key={`${label}-${index}`} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value || '—'}</Text>
        </View>
      ))}
      {rows.length === 0 ? <Text style={styles.secondary}>Tsy mbola misy angona.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 12 },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  heading: { color: colors.text, fontSize: 21, fontWeight: '700' },
  template: { color: colors.secondary, fontSize: 14 },
  download: {
    minHeight: 48,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadText: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  section: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8, gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', paddingBottom: 4 },
  field: { gap: 2 },
  label: { color: colors.secondary, fontSize: 13 },
  value: { color: colors.text, fontSize: 15, lineHeight: 21 },
  secondary: { color: colors.secondary, fontSize: 14, lineHeight: 21 },
  errorBox: { backgroundColor: colors.errorSurface, padding: 12, borderRadius: 7 },
  errorText: { color: colors.error, fontSize: 14, lineHeight: 21 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 6 },
});
