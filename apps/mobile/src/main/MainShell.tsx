import * as ImagePicker from 'expo-image-picker';
import { useEffect, useReducer, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  type AuthSession,
  type AuthUser,
  changePassword,
  fetchMyAvatarDataUrl,
  removeAvatar,
  updateAccountName,
  uploadAvatar,
} from '../access/auth-api';
import { Brand } from '../access/Brand';
import { BrandIcon, type BrandIconName } from '../access/BrandIcon';
import { colors } from '../theme/tokens';
import { ArchiveDirectoryScreen } from './ArchiveDirectoryScreen';
import { ContactDirectoryScreen } from './ContactDirectoryScreen';
import { CvEditor } from './CvEditor';
import { LeaderCvScreen } from './LeaderCvScreen';
import { LeaderDirectoryScreen } from './LeaderDirectoryScreen';
import { MessagesScreen } from './MessagesScreen';
import { initialMainFlow, type MainTab, mainFlowReducer } from './main-flow';
import { getSignOutConfirmation } from './sign-out-confirmation';

const tabs: { id: MainTab; title: string; icon: BrandIconName }[] = [
  { id: 'archives', title: 'Arisiva', icon: 'archive' },
  { id: 'leaders', title: 'Mpiandraikitra', icon: 'leaders' },
  { id: 'messages', title: 'Hafatra', icon: 'messages' },
  { id: 'contacts', title: 'Fifandraisana', icon: 'contacts' },
  { id: 'settings', title: 'Fikirana', icon: 'settings' },
];

export function MainShell({
  session,
  onSignOut,
  onSessionUpdate,
}: {
  session: AuthSession;
  onSignOut: () => void;
  onSessionUpdate: (user: AuthUser) => void;
}) {
  const [flow, dispatch] = useReducer(mainFlowReducer, initialMainFlow);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarDebug, setAvatarDebug] = useState('Aucun chargement observé.');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const reportAvatarDebug = (message: string) => {
    console.info(`[avatar-debug] ${message}`);
    setAvatarDebug(message);
  };

  useEffect(() => {
    let active = true;
    if (!session.user.hasAvatar) {
      setAvatarDataUrl(null);
      return () => {
        active = false;
      };
    }
    setAvatarDataUrl(null);
    reportAvatarDebug('Téléchargement authentifié de l’avatar commencé.');
    void fetchMyAvatarDataUrl(session.accessToken)
      .then((dataUrl) => {
        if (!active) return;
        setAvatarDataUrl(dataUrl);
        reportAvatarDebug('Téléchargement authentifié réussi; image prête à afficher.');
      })
      .catch((error: unknown) => {
        if (!active) return;
        reportAvatarDebug(
          `Échec du téléchargement authentifié : ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, session.user.hasAvatar, avatarVersion]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!flow.detail) return false;
      dispatch({ type: 'BACK' });
      return true;
    });
    return () => subscription.remove();
  }, [flow.detail]);

  const canSearch = !flow.detail && ['leaders', 'contacts'].includes(flow.tab);
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
            {session.user.hasAvatar && avatarDataUrl ? (
              <Image
                source={{ uri: avatarDataUrl }}
                onLoadStart={() => reportAvatarDebug('Barre supérieure : chargement commencé.')}
                onLoad={(event) =>
                  reportAvatarDebug(
                    `Barre supérieure : chargée (${event.nativeEvent.source.width} × ${event.nativeEvent.source.height}).`,
                  )
                }
                onError={(event) => reportAvatarDebug(`Barre supérieure : erreur — ${event.nativeEvent.error}`)}
                style={styles.avatarHeaderImage}
              />
            ) : (
              <BrandIcon name="profile" size={24} />
            )}
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

      {flow.detail?.type === 'notifications' ? (
        <PlaceholderScreen title="Fampafantarana" text="Tsy mbola azo ampiasaina ny fampafantarana." />
      ) : flow.detail?.type === 'cv' ? (
        <LeaderCvScreen session={session} userId={flow.detail.leaderId} onBack={() => dispatch({ type: 'BACK' })} />
      ) : flow.tab === 'archives' ? (
        <ArchiveDirectoryScreen session={session} onSessionExpired={onSignOut} />
      ) : flow.tab === 'leaders' ? (
        <LeaderDirectoryScreen
          session={session}
          query={query}
          onOpenCv={(leaderId) => dispatch({ type: 'OPEN_CV', leaderId })}
        />
      ) : flow.tab === 'contacts' ? (
        <ContactDirectoryScreen session={session} query={query} />
      ) : flow.tab === 'messages' ? (
        <MessagesScreen session={session} onSessionExpired={onSignOut} />
      ) : (
        <SettingsScreen
          session={session}
          avatarDataUrl={avatarDataUrl}
          onAvatarChanged={() => setAvatarVersion((value) => value + 1)}
          avatarDebug={avatarDebug}
          onAvatarDebug={reportAvatarDebug}
          onSignOut={onSignOut}
          onSessionUpdate={onSessionUpdate}
        />
      )}

      {!flow.detail && (
        <View accessibilityRole="tablist" style={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: flow.tab === tab.id }}
              onPress={() => {
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

function SettingsScreen({
  session,
  avatarDataUrl,
  onAvatarChanged,
  avatarDebug,
  onAvatarDebug,
  onSignOut,
  onSessionUpdate,
}: {
  session: AuthSession;
  avatarDataUrl: string | null;
  onAvatarChanged: () => void;
  avatarDebug: string;
  onAvatarDebug: (message: string) => void;
  onSignOut: () => void;
  onSessionUpdate: (user: AuthUser) => void;
}) {
  const [screen, setScreen] = useState<'home' | 'cv' | 'password' | 'profile'>('home');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [accountName, setAccountName] = useState(session.user.accountName);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMessage, setNameMessage] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState('');

  const saveName = async () => {
    setNameMessage('');
    const trimmed = accountName.trim();
    if (!trimmed) {
      setNameMessage('Tsy maintsy misy ny anarana.');
      return;
    }
    setNameBusy(true);
    try {
      const updated = await updateAccountName(session.accessToken, trimmed);
      onSessionUpdate(updated);
      setScreen('home');
    } catch (error) {
      setNameMessage(error instanceof Error ? error.message : 'Tsy voaova ny anarana.');
    } finally {
      setNameBusy(false);
    }
  };

  const changeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setAvatarBusy(true);
    setAvatarMessage('');
    try {
      await uploadAvatar(session.accessToken, {
        uri: asset.uri,
        name: asset.fileName ?? 'avatar.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      onSessionUpdate({ ...session.user, hasAvatar: true });
      onAvatarChanged();
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : 'Tsy voatahiry ny sary.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const removePhoto = async () => {
    setAvatarBusy(true);
    setAvatarMessage('');
    try {
      await removeAvatar(session.accessToken);
      onSessionUpdate({ ...session.user, hasAvatar: false });
      onAvatarChanged();
    } catch (error) {
      setAvatarMessage(error instanceof Error ? error.message : 'Tsy voaesotra ny sary.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const onAvatarPress = () => {
    const options = session.user.hasAvatar
      ? [
          { text: 'Hisafidy sary vaovao', onPress: () => void changeAvatar() },
          { text: 'Hanala ny sary', style: 'destructive' as const, onPress: () => void removePhoto() },
          { text: 'Hanafoana', style: 'cancel' as const },
        ]
      : [
          { text: 'Hisafidy sary', onPress: () => void changeAvatar() },
          { text: 'Hanafoana', style: 'cancel' as const },
        ];
    Alert.alert('Sary profily', undefined, options, { cancelable: true });
  };

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
  if (screen === 'profile')
    return (
      <PageContent>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setScreen('home');
            setNameMessage('');
            setAccountName(session.user.accountName);
          }}
          style={styles.headerBack}
        >
          <BrandIcon name="back" size={18} color={colors.accent} />
          <Text style={styles.accentText}>Fikirana</Text>
        </Pressable>
        <Text style={styles.pageHeading}>Hanova ny anarana</Text>
        <Text style={styles.subtitle}>Ity no anarana hita amin’ny mpiandraikitra hafa.</Text>
        <Text style={styles.filterLabel}>Anarana feno</Text>
        <TextInput
          accessibilityLabel="Anarana feno"
          value={accountName}
          onChangeText={setAccountName}
          style={styles.settingsInput}
          maxLength={120}
        />
        {nameMessage ? (
          <Text accessibilityRole="alert" style={styles.feedback}>
            {nameMessage}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={nameBusy}
          onPress={() => {
            void saveName();
          }}
          style={[styles.signOut, nameBusy && styles.disabled]}
        >
          <Text style={styles.signOutText}>{nameBusy ? 'Tehirizina…' : 'Tehirizo'}</Text>
        </Pressable>
      </PageContent>
    );
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hanova sary profily"
          disabled={avatarBusy}
          onPress={onAvatarPress}
          style={styles.avatarLarge}
        >
          {session.user.hasAvatar && avatarDataUrl ? (
            <Image
              source={{ uri: avatarDataUrl }}
              onLoadStart={() => onAvatarDebug('Paramètres : chargement commencé.')}
              onLoad={(event) =>
                onAvatarDebug(
                  `Paramètres : chargée (${event.nativeEvent.source.width} × ${event.nativeEvent.source.height}).`,
                )
              }
              onError={(event) => onAvatarDebug(`Paramètres : erreur — ${event.nativeEvent.error}`)}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarLargeText}>{name.slice(0, 1).toLocaleUpperCase()}</Text>
          )}
          <View style={styles.avatarEditBadge}>
            {avatarBusy ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <BrandIcon name="camera" size={14} color={colors.onPrimary} />
            )}
          </View>
        </Pressable>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.rowMeta}>{session.user.email ?? session.user.phone ?? 'Kaonty mpiandraikitra'}</Text>
      </View>
      {avatarMessage ? (
        <Text accessibilityRole="alert" style={styles.feedback}>
          {avatarMessage}
        </Text>
      ) : null}
      <Text style={styles.sectionLabel}>Kaonty</Text>
      <Text style={styles.settingHint}>
        Azonao ovaina ny anaranao sy ny sarinao. Ny adiresy mailaka, ny laharana, ny vondrona ary ny andraikitra
        ofisialy dia tantanin’ny mpitantana.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setNameMessage('');
          setAccountName(session.user.accountName);
          setScreen('profile');
        }}
        style={styles.settingAction}
      >
        <BrandIcon name="profile" size={24} />
        <View style={styles.rowBody}>
          <Text style={styles.settingActionTitle}>Hanova ny anarana</Text>
          <Text style={styles.rowMeta}>Ovay ny anarana feno hita amin’ny mpiandraikitra hafa</Text>
        </View>
        <BrandIcon name="forward" size={18} color={colors.secondary} />
      </Pressable>
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
    overflow: 'hidden',
  },
  avatarHeaderImage: { width: 40, height: 40, borderRadius: 20 },
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
    minHeight: 56,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.muted,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  archiveRowTitle: { flex: 1 },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowMeta: { color: colors.secondary, fontSize: 13, lineHeight: 18 },
  smallAction: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accentText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  filterLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  detailBack: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center' },
  placeholderIcon: { alignItems: 'center', paddingTop: 40 },
  noticeRow: { paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border },
  noticeTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  noticeCategory: { color: colors.text, fontSize: 14, fontWeight: '700' },
  noticeTime: { color: colors.secondary, fontSize: 12 },
  noticeBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeTitle: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  dismiss: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  accountBlock: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.portrait,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarDebug: { color: colors.secondary, fontSize: 11, lineHeight: 16, textAlign: 'center', marginBottom: 4 },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.page,
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
