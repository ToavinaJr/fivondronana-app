import { useEffect, useMemo, useReducer, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Brand } from '../access/Brand';
import { BrandIcon, type BrandIconName } from '../access/BrandIcon';
import { type AuthSession, changePassword } from '../access/auth-api';
import { colors } from '../theme/tokens';
import {
  type ArchiveItem,
  archives,
  type Contact,
  contacts,
  filterLeaders,
  type Leader,
  leaders,
  type Notice,
  notices,
} from './sample-data';
import { initialMainFlow, type MainTab, mainFlowReducer } from './main-flow';
import { CvEditor } from './CvEditor';
import { LeaderDirectoryScreen } from './LeaderDirectoryScreen';
import { LeaderCvScreen } from './LeaderCvScreen';
import { getSignOutConfirmation } from './sign-out-confirmation';

const tabs: { id: MainTab; title: string; icon: BrandIconName }[] = [
  { id: 'archives', title: 'Arisiva', icon: 'archive' },
  { id: 'leaders', title: 'Mpiandraikitra', icon: 'leaders' },
  { id: 'messages', title: 'Hafatra', icon: 'messages' },
  { id: 'contacts', title: 'Fifandraisana', icon: 'contacts' },
  { id: 'settings', title: 'Fikirana', icon: 'settings' },
];

export function MainShell({ session, onSignOut }: { session: AuthSession; onSignOut: () => void }) {
  const [flow, dispatch] = useReducer(mainFlowReducer, initialMainFlow);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [visibleNotices, setVisibleNotices] = useState(notices);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!flow.detail) return false;
      dispatch({ type: 'BACK' });
      return true;
    });
    return () => subscription.remove();
  }, [flow.detail]);

  const canSearch = !flow.detail && ['archives', 'leaders', 'contacts'].includes(flow.tab);
  const isDemo = flow.detail?.type === 'notifications' || (!flow.detail && ['archives', 'contacts'].includes(flow.tab));
  const requestDownload = () => setFeedback('Tsy mbola mifandray amin’ny tahiry ny fisintonana.');
  return (
    <View style={styles.page}>
      <View style={styles.topBar}>
        <Brand compact />
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fampafantarana"
            onPress={() => {
              dispatch({ type: 'OPEN_NOTIFICATIONS' });
              setFeedback('');
            }}
            style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
          >
            <BrandIcon name="notifications" />
          </Pressable>
          {canSearch && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Karoka"
              accessibilityState={{ expanded: searchOpen }}
              onPress={() => setSearchOpen((value) => !value)}
              style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
            >
              <BrandIcon name="search" />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kaonty"
            onPress={() => dispatch({ type: 'SELECT_TAB', tab: 'settings' })}
            style={styles.avatar}
          >
            <BrandIcon name="profile" size={24} />
          </Pressable>
        </View>
      </View>

      {flow.detail?.type === 'notifications' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hiverina"
          onPress={() => dispatch({ type: 'BACK' })}
          style={styles.detailBack}
        >
          <BrandIcon name="back" />
          <Text style={styles.signOutText}>Hiverina</Text>
        </Pressable>
      )}
      {searchOpen && canSearch && (
        <View style={styles.searchWrap}>
          <TextInput
            accessibilityLabel="Karohy"
            onChangeText={setQuery}
            placeholder="Karohy"
            placeholderTextColor={colors.secondary}
            style={styles.search}
            value={query}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSearchOpen(false);
              setQuery('');
            }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.cancel}>Akatona</Text>
          </Pressable>
        </View>
      )}
      {isDemo ? (
        <View style={styles.demoBanner}>
          <Text style={styles.demoText}>Angona santionany</Text>
        </View>
      ) : null}

      {flow.detail?.type === 'notifications' ? (
        <NotificationsScreen
          items={visibleNotices}
          onDismiss={(id) => setVisibleNotices((items) => items.filter((item) => item.id !== id))}
        />
      ) : flow.detail?.type === 'cv' ? (
        <LeaderCvScreen session={session} userId={flow.detail.leaderId} onBack={() => dispatch({ type: 'BACK' })} />
      ) : flow.tab === 'archives' ? (
        <ArchivesScreen query={query} onDownload={requestDownload} />
      ) : flow.tab === 'leaders' ? (
        <LeaderDirectoryScreen
          session={session}
          query={query}
          onOpenCv={(leaderId) => dispatch({ type: 'OPEN_CV', leaderId })}
        />
      ) : flow.tab === 'contacts' ? (
        <ContactsScreen query={query} />
      ) : flow.tab === 'messages' ? (
        <PlaceholderScreen title="Hafatra" text="Tsy mbola azo ampiasaina ny fandefasana sy fandraisana hafatra." />
      ) : (
        <SettingsScreen session={session} onSignOut={onSignOut} />
      )}

      {feedback ? (
        <Text accessibilityRole="alert" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
      {!flow.detail && (
        <View accessibilityRole="tablist" style={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: flow.tab === tab.id }}
              onPress={() => {
                setFeedback('');
                dispatch({ type: 'SELECT_TAB', tab: tab.id });
              }}
              style={({ pressed }) => [styles.tab, flow.tab === tab.id && styles.tabActive, pressed && styles.pressed]}
            >
              <BrandIcon name={tab.icon} color={flow.tab === tab.id ? colors.primary : colors.secondary} size={20} />
              <Text style={[styles.tabText, flow.tab === tab.id && styles.tabTextActive]}>{tab.title}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function PageContent({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

function ArchivesScreen({ query, onDownload }: { query: string; onDownload: () => void }) {
  const filtered = archives.filter((item) =>
    `${item.title} ${item.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <PageContent>
      <Text style={styles.pageHeading}>Arisiva</Text>
      <Text style={styles.subtitle}>Tantaran’ny fivondronana sy ny antontan-taratasy ilaina.</Text>
      {filtered.map((item) => (
        <ArchiveRow key={item.id} item={item} onDownload={onDownload} />
      ))}
      {!filtered.length && <EmptyState text="Tsy misy arisiva mifanaraka amin’ny fikarohana." />}
    </PageContent>
  );
}

function ArchiveRow({ item, onDownload }: { item: ArchiveItem; onDownload: () => void }) {
  return (
    <View style={styles.archiveRow}>
      <View style={styles.fileMark}>
        <BrandIcon name="document" size={22} />
        <Text style={styles.fileMarkText}>{item.format}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMeta}>
          {item.category}
          {item.year ? ` · ${item.year}` : ''}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sintomy ${item.title}`}
        onPress={onDownload}
        style={styles.smallAction}
      >
        <BrandIcon name="download" size={16} color={colors.accent} />
        <Text style={styles.accentText}>Sintomy</Text>
      </Pressable>
    </View>
  );
}

function LeadersScreen({ query, onOpenCv }: { query: string; onOpenCv: (leaderId: string) => void }) {
  const [entity, setEntity] = useState('Rehetra');
  const [group, setGroup] = useState('Rehetra');
  const filtered = useMemo(() => filterLeaders(leaders, query, entity, group), [query, entity, group]);
  return (
    <PageContent>
      <Text style={styles.pageHeading}>Mpiandraikitra</Text>
      <Text style={styles.subtitle}>Tadiavo araka ny entité na vondrona.</Text>
      <Text style={styles.filterLabel}>Entité</Text>
      <ChoiceRow values={['Rehetra', 'Mavo', 'Maitso', 'Mena', 'Menafify']} selected={entity} onSelect={setEntity} />
      <Text style={styles.filterLabel}>Vondrona</Text>
      <ChoiceRow values={['Rehetra', 'Mpanazava', 'Tily']} selected={group} onSelect={setGroup} />
      {filtered.map((leader) => (
        <LeaderRow key={leader.id} leader={leader} onPress={() => onOpenCv(leader.id)} />
      ))}
      {!filtered.length && <EmptyState text="Tsy misy mpiandraikitra mifanaraka amin’ny fikarohana." />}
    </PageContent>
  );
}

function ChoiceRow({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.choiceScroll}
      contentContainerStyle={styles.choiceRow}
    >
      {values.map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={value}
          accessibilityState={{ selected: value === selected }}
          onPress={() => onSelect(value)}
          style={[styles.choice, value === selected && styles.choiceSelected]}
        >
          <Text style={[styles.choiceText, value === selected && styles.choiceTextSelected]}>{value}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function LeaderRow({ leader, onPress }: { leader: Leader; onPress: () => void }) {
  return (
    <View style={styles.leaderRow}>
      <View style={styles.leaderPortrait}>
        <Text style={styles.portraitInitial}>{leader.name.slice(-1)}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{leader.name}</Text>
        <Text style={styles.leaderMeta}>
          {leader.entity} {leader.group}
        </Text>
        <Text style={styles.rowMeta}>{leader.responsibility}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Hijery ny CV an’i ${leader.name}`}
        onPress={onPress}
        style={styles.cvButton}
      >
        <Text style={styles.cvButtonText}>Hijery CV</Text>
      </Pressable>
    </View>
  );
}

function CvScreen({ leader, onDownload }: { leader?: Leader; onDownload: () => void }) {
  if (!leader)
    return (
      <PageContent>
        <EmptyState text="Tsy hita ilay mpiandraikitra." />
      </PageContent>
    );
  return (
    <PageContent>
      <Text style={styles.pageHeading}>Hijery CV</Text>
      <Text style={styles.subtitle}>
        {leader.name} · {leader.entity} {leader.group}
      </Text>
      <View style={styles.cvActions}>
        <Pressable accessibilityRole="button" onPress={onDownload} style={styles.cvAction}>
          <Text style={styles.accentText}>Sintomy PDF</Text>
        </Pressable>
        <Text style={styles.cvOwner}>{leader.responsibility}</Text>
      </View>
      <CvSection
        title="Fampahafantarana ny tena"
        rows={['Anarana feno', 'Adiresy', 'Daty nahaterahana', 'Toerana nahaterahana']}
      />
      <CvSection title="Fifandraisana" rows={['Finday', 'Mailaka', 'Facebook']} />
      <CvSection title="Fampahafantarana ny maha skoto" rows={['Faritany', 'Faritra', 'Fivondronana']} />
      <CvSection title="Sampana sy hetsika" rows={['Anarana', 'Andraikitra', 'Daty']} />
      <Text style={styles.emptyHint}>Tsy mbola misy antsipirian’ny CV ao amin’ny tahiry.</Text>
    </PageContent>
  );
}

function CvSection({ title, rows }: { title: string; rows: string[] }) {
  return (
    <View style={styles.cvSection}>
      <Text style={styles.cvSectionTitle}>{title}</Text>
      {rows.map((row) => (
        <View key={row} style={styles.cvField}>
          <Text style={styles.cvFieldName}>{row}</Text>
          <Text style={styles.cvFieldValue}>—</Text>
        </View>
      ))}
    </View>
  );
}

function ContactsScreen({ query }: { query: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filtered = contacts.filter((contact) =>
    `${contact.name} ${contact.group} ${contact.responsibility}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <PageContent>
      <Text style={styles.pageHeading}>Fifandraisana</Text>
      <Text style={styles.subtitle}>Ireo tompon’andraikitra sy mpiara-miasa.</Text>
      {filtered.map((contact) => (
        <ContactRow
          key={contact.id}
          contact={contact}
          expanded={expandedId === contact.id}
          onToggle={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
        />
      ))}
      {!filtered.length && <EmptyState text="Tsy misy fifandraisana mifanaraka amin’ny fikarohana." />}
    </PageContent>
  );
}

function ContactRow({ contact, expanded, onToggle }: { contact: Contact; expanded: boolean; onToggle: () => void }) {
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
          <Text style={styles.rowMeta}>{contact.group}</Text>
        </View>
        <Text style={styles.expandLabel}>{expanded ? 'Afenina' : 'Hijery bebe kokoa'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.contactDetails}>
          <View style={styles.contactDetailRow}>
            <BrandIcon name="location" size={18} />
            <Text style={styles.detailLine}>{contact.address}</Text>
          </View>
          <View style={styles.contactDetailRow}>
            <BrandIcon name="phone" size={18} />
            <Text style={styles.detailLine}>{contact.phone}</Text>
          </View>
          <View style={styles.contactDetailRow}>
            <BrandIcon name="email" size={18} />
            <Text style={styles.detailLine}>{contact.email}</Text>
          </View>
          <Text style={styles.contactDescription}>{contact.description}</Text>
        </View>
      )}
    </View>
  );
}

function NotificationsScreen({ items, onDismiss }: { items: Notice[]; onDismiss: (id: string) => void }) {
  return (
    <PageContent>
      <Text style={styles.pageHeading}>Fampafantarana</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.noticeRow}>
          <View style={styles.noticeTop}>
            <Text style={styles.noticeCategory}>{item.category}</Text>
            <Text style={styles.noticeTime}>{item.time}</Text>
          </View>
          <View style={styles.noticeBottom}>
            <BrandIcon name="notifications" size={24} />
            <Text style={styles.noticeTitle}>{item.title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Esory ${item.title}`}
              onPress={() => onDismiss(item.id)}
              style={styles.dismiss}
            >
              <BrandIcon name="close" size={20} />
            </Pressable>
          </View>
        </View>
      ))}
      {!items.length && <EmptyState text="Tsy misy fampafantarana." />}
    </PageContent>
  );
}

function SettingsScreen({ session, onSignOut }: { session: AuthSession; onSignOut: () => void }) {
  const [screen, setScreen] = useState<'home' | 'cv' | 'password'>('home');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const updatePassword = async () => {
    setMessage('');
    if (newPassword !== confirmPassword) {
      setMessage('Tsy mitovy ny teny miafina roa vaovao.');
      return;
    }
    if (newPassword.length < 8) {
      setMessage('Tokony ho litera 8 farafahakeliny ny teny miafina vaovao.');
      return;
    }
    setPending(true);
    try {
      await changePassword(session.accessToken, currentPassword, newPassword);
      setMessage('Voova ny teny miafina. Midira indray azafady.');
      setTimeout(onSignOut, 900);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tsy voaova ny teny miafina.');
    } finally {
      setPending(false);
    }
  };
  if (screen === 'cv') return <CvEditor session={session} onBack={() => setScreen('home')} />;
  if (screen === 'password')
    return (
      <PageContent>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setScreen('home');
            setMessage('');
          }}
          style={styles.headerBack}
        >
          <BrandIcon name="back" size={18} color={colors.accent} />
          <Text style={styles.accentText}>Fikirana</Text>
        </Pressable>
        <Text style={styles.pageHeading}>Hanova teny miafina</Text>
        <Text style={styles.subtitle}>Ampidiro aloha ny teny miafina ampiasainao amin’izao fotoana izao.</Text>
        <Text style={styles.filterLabel}>Teny miafina ankehitriny</Text>
        <TextInput
          accessibilityLabel="Teny miafina ankehitriny"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
          style={styles.settingsInput}
        />
        <Text style={styles.filterLabel}>Teny miafina vaovao</Text>
        <TextInput
          accessibilityLabel="Teny miafina vaovao"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          style={styles.settingsInput}
        />
        <Text style={styles.filterLabel}>Avereno ny teny miafina vaovao</Text>
        <TextInput
          accessibilityLabel="Avereno ny teny miafina vaovao"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.settingsInput}
        />
        {message ? (
          <Text accessibilityRole="alert" style={styles.feedback}>
            {message}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={() => {
            void updatePassword();
          }}
          style={[styles.signOut, pending && styles.disabled]}
        >
          <Text style={styles.signOutText}>{pending ? 'Tehirizina…' : 'Ovay ny teny miafina'}</Text>
        </Pressable>
      </PageContent>
    );
  const name = session.user.accountName;
  return (
    <PageContent>
      <Text style={styles.pageHeading}>Fikirana</Text>
      <View style={styles.accountBlock}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{name.slice(0, 1).toLocaleUpperCase()}</Text>
        </View>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.rowMeta}>{session.user.email ?? session.user.phone ?? 'Kaonty mpiandraikitra'}</Text>
      </View>
      <Text style={styles.sectionLabel}>Kaonty</Text>
      <Text style={styles.settingHint}>
        Ny anarana, adiresy mailaka, laharana, vondrona ary andraikitra ofisialy dia tantanin’ny mpitantana.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setMessage('');
          setScreen('cv');
        }}
        style={styles.settingAction}
      >
        <BrandIcon name="document" size={24} />
        <View style={styles.rowBody}>
          <Text style={styles.settingActionTitle}>Ny CV-ko</Text>
          <Text style={styles.rowMeta}>Hamorona na hanova ny mombamomba anao</Text>
        </View>
        <BrandIcon name="forward" size={18} color={colors.secondary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setMessage('');
          setScreen('password');
        }}
        style={styles.settingAction}
      >
        <BrandIcon name="lock" size={24} />
        <View style={styles.rowBody}>
          <Text style={styles.settingActionTitle}>Hanova teny miafina</Text>
          <Text style={styles.rowMeta}>Ilaina ny teny miafina ankehitriny</Text>
        </View>
        <BrandIcon name="forward" size={18} color={colors.secondary} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          const confirmation = getSignOutConfirmation(onSignOut);
          Alert.alert(confirmation.title, confirmation.message, confirmation.buttons, { cancelable: true });
        }}
        style={styles.signOut}
      >
        <BrandIcon name="logout" />
        <Text style={styles.signOutText}>Hiala amin’ny kaonty</Text>
      </Pressable>
    </PageContent>
  );
}

function PlaceholderScreen({ title, text }: { title: string; text: string }) {
  return (
    <PageContent>
      <Text style={styles.pageHeading}>{title}</Text>
      <View style={styles.placeholderIcon}>
        <BrandIcon name="messages" size={40} color={colors.secondary} />
      </View>
      <Text style={styles.emptyText}>{text}</Text>
    </PageContent>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Tsy misy angona</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  topBar: {
    minHeight: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  brandName: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  headerActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerAction: { minWidth: 44, minHeight: 44, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  avatar: {
    width: 40,
    height: 40,
    marginLeft: 4,
    borderRadius: 20,
    backgroundColor: colors.portrait,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBack: { minWidth: 64, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  searchWrap: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  search: {
    flex: 1,
    minHeight: 48,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
  },
  cancel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 44,
    textAlignVertical: 'center',
    textDecorationLine: 'underline',
  },
  demoBanner: { backgroundColor: colors.warningSurface, paddingVertical: 8, paddingHorizontal: 16 },
  demoText: { color: colors.warningText, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28, flexGrow: 1 },
  pageHeading: { color: colors.text, fontSize: 23, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.secondary, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  archiveRow: {
    minHeight: 76,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.muted,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileMark: {
    width: 44,
    height: 44,
    backgroundColor: colors.page,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileMarkText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowMeta: { color: colors.secondary, fontSize: 13, lineHeight: 18 },
  smallAction: {
    minWidth: 72,
    minHeight: 44,
    flexDirection: 'row',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  accentText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  filterLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  // Horizontal ScrollViews must not absorb space freed by filtering the results.
  choiceScroll: { flexGrow: 0, flexShrink: 0 },
  choiceRow: { gap: 8, paddingBottom: 16, alignItems: 'flex-start' },
  choice: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: 'center',
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.selected },
  choiceText: { color: colors.secondary, fontSize: 13 },
  choiceTextSelected: { color: colors.primary, fontWeight: '600' },
  leaderRow: {
    minHeight: 84,
    marginBottom: 8,
    padding: 12,
    backgroundColor: colors.muted,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leaderPortrait: {
    width: 48,
    height: 48,
    backgroundColor: colors.portrait,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  portraitInitial: { color: colors.text, fontSize: 20, fontWeight: '600' },
  leaderMeta: { color: colors.secondary, fontSize: 13, fontWeight: '500' },
  cvButton: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  cvButtonText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  cvActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  cvAction: { minHeight: 44, justifyContent: 'center' },
  cvOwner: { color: colors.secondary, fontSize: 13 },
  cvSection: { marginTop: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  cvSectionTitle: { padding: 12, backgroundColor: colors.muted, color: colors.text, fontSize: 15, fontWeight: '600' },
  cvField: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cvFieldName: { color: colors.secondary, fontSize: 13 },
  cvFieldValue: { color: colors.text, fontSize: 13 },
  emptyHint: { marginTop: 16, color: colors.secondary, fontSize: 13 },
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
  contactMarkText: { color: colors.text, fontWeight: '600', fontSize: 16 },
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
  contactDetailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  detailBack: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center' },
  placeholderIcon: { alignItems: 'center', paddingTop: 40 },
  contactDescription: { marginTop: 5, color: colors.secondary, fontSize: 14, lineHeight: 20 },
  noticeRow: { paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border },
  noticeTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  noticeCategory: { color: colors.text, fontSize: 14, fontWeight: '700' },
  noticeTime: { color: colors.secondary, fontSize: 12 },
  noticeBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeTitle: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  dismiss: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  dismissText: { color: colors.primary, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  accountBlock: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.portrait,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: { color: colors.primary, fontSize: 28, fontWeight: '700' },
  sectionLabel: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 12 },
  settingHint: { color: colors.secondary, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 8 },
  settingAction: {
    minHeight: 68,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingActionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  settingsInput: {
    minHeight: 50,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    color: colors.text,
  },
  disabled: { opacity: 0.6 },
  signOut: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: colors.primary, fontWeight: '700', flexShrink: 1 },
  emptyState: { paddingVertical: 36, paddingHorizontal: 16, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: colors.secondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  feedback: { marginHorizontal: 12, marginBottom: 4, color: colors.error, fontSize: 12, textAlign: 'center' },
  tabBar: {
    minHeight: 64,
    borderTopWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    backgroundColor: colors.page,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  tabActive: { borderTopColor: colors.primary },
  tabText: { color: colors.secondary, fontSize: 11, textAlign: 'center' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
});
