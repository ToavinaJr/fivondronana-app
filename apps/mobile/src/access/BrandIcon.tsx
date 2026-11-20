import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { colors } from '../theme/tokens';

export type BrandIconName =
  | 'archive'
  | 'leaders'
  | 'messages'
  | 'contacts'
  | 'settings'
  | 'notifications'
  | 'search'
  | 'back'
  | 'download'
  | 'profile'
  | 'forward'
  | 'lock'
  | 'logout'
  | 'document'
  | 'location'
  | 'phone'
  | 'email'
  | 'close'
  | 'plus'
  | 'check'
  | 'eye'
  | 'eyeOff'
  | 'menu'
  | 'filter'
  | 'camera';

type NativeSymbol = NonNullable<ComponentProps<typeof SymbolView>['name']>;

const symbols: Record<BrandIconName, NativeSymbol> = {
  archive: { ios: 'archivebox', android: 'inventory_2', web: 'inventory_2' },
  leaders: { ios: 'person.2', android: 'groups', web: 'groups' },
  messages: { ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' },
  contacts: { ios: 'person.crop.rectangle.stack', android: 'contacts', web: 'contacts' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  notifications: { ios: 'bell', android: 'notifications', web: 'notifications' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  download: { ios: 'arrow.down.to.line', android: 'download', web: 'download' },
  profile: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  forward: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  document: { ios: 'doc.text', android: 'description', web: 'description' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  phone: { ios: 'phone', android: 'call', web: 'call' },
  email: { ios: 'envelope', android: 'mail', web: 'mail' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  menu: { ios: 'line.3.horizontal', android: 'menu', web: 'menu' },
  filter: { ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' },
  camera: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
};

export function BrandIcon({
  name,
  size = 20,
  color = colors.primary,
}: {
  name: BrandIconName;
  size?: number;
  color?: string;
}) {
  return <SymbolView name={symbols[name]} size={size} tintColor={color} />;
}
