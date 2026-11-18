# Mobile Design System

## Surface

- Product surface: FIVONDRONANA leader mobile application.
- Mode: Operate. The interface helps leaders consult records and complete profile, document, and communication tasks.
- Platforms: adaptive iOS and Android, with portrait phone layouts as the reference baseline.
- Source of visual truth: the user-provided captures in `../../docs/screens/`. The existing green-and-ivory `App.tsx` is a temporary scaffold and does not override those references.

## Visual Direction

Keep the quiet, information-first layout of the supplied screens: white page backgrounds, compact shared navigation, strong red primary actions, restrained turquoise document actions, pale row surfaces, and Malagasy labels. Use screenshots as layout references; implement controls and content as native React Native UI rather than placing screenshots behind the interface.

## Tokens

The reference files are JPEGs, so sampled colors are starting values and may contain compression noise. Confirm against original brand artwork if it becomes available.

### Color

| Token | Initial value | Use |
|---|---|---|
| `brand.primary` | `#B8170F` | Main action, active tab, important emphasis; sampled from `auth-page.jpeg`. |
| `brand.accent` | `#087F7B` | Download and secondary document actions; sampled from `arisiva-page.jpeg`. |
| `surface.page` | `#FFFFFF` | Main screen background. |
| `surface.muted` | `#F5F5F5` | Quiet list rows and message surfaces. |
| `surface.selected` | `#FCEFED` | Selected filter and navigation states. |
| `text.primary` | `#171717` | Main labels and content. |
| `text.secondary` | `#595959` | Supporting text and descriptions; maintains readable contrast on white. |
| `border.subtle` | `#DEDEDE` | Input outlines and row separators. |
| `state.error` | `#A1120C` | Validation and destructive-state feedback, paired with text or an icon. |
| `state.warning.surface` | `#F8F3E8` | Sample-data notice background. |
| `state.warning.text` | `#55451F` | Sample-data notice text. |

Create semantic light and dark variants from these roles; keep the supplied light appearance as the reference default. Do not use raw color values throughout screen components.

### Typography

- Use platform system fonts; no custom font asset is present.
- Map shared roles to native sizes: screen title 20–22, section title 16–17, body 16sp on Android / 17pt on iOS, supporting text 14–15, and captions/tab labels 11–12. Use Android `sp` and iOS Dynamic Type styles so system scaling remains effective.
- Avoid per-screen arbitrary font sizes; maintain a legibility floor of 11sp/pt for compact labels.
- Keep Malagasy labels intact, including diacritics and apostrophes; store source files as UTF-8.
- Respect iOS Dynamic Type and Android font scaling; long Malagasy labels must wrap rather than clip.

### Spacing and Shape

- Use a 4-point spacing base with shared steps of 4, 8, 12, 16, 24, and 32.
- Use restrained 6–8 point corner radii for buttons, fields, and list surfaces, matching the lightly rounded references.
- Keep selected filter chips the same height and padding as unselected chips; selection changes color and border only.
- Interactive targets meet at least 44 points in both dimensions. Keep supporting labels at 11 points or larger.
- Preserve enough separation between adjacent controls to satisfy platform touch-target guidance.

## Shared Components

- **Top app bar:** organization mark at leading edge; notification, search, and profile actions at trailing edge on the main tab screens. Detail screens use a native back affordance and contextual title.
- **Bottom navigation:** five top-level destinations in the supplied order: Arisiva, Mpiandraikitra, Hafatra, Fifandraisana, Fikirana. Active destination uses the primary tint. Use a native-feeling bottom navigation bar on compact devices and an adaptive navigation pattern on expanded widths.
- **Primary button:** filled primary red with white label; show disabled, loading, and pressed states.
- **Text input:** clear label, visible focus/error state, native keyboard type, and show/hide affordance only where useful.
- **List row/card:** prioritize scanability and stable alignment; status colors are supportive and never the only way to convey meaning.
- **Document action:** use the turquoise accent for download or document actions, with a visible button treatment and an accessible text label or accessibility name.
- **Icons and emblems:** use `expo-symbols` through the shared `BrandIcon` component for consistent SF Symbols on iOS and Material Symbols on Android. Keep an accessible text label on every icon-only action. Show Tily/Mpanazava emblems only when that group is known; do not substitute an unrelated branch emblem for a person's portrait.
- **Action affordance:** important actions use filled or outlined native-feeling buttons. Secondary text links use the brand primary color and an underline or another visible pressed/selected treatment; color alone must not be the only signal that text is interactive.
- **Brand mark:** the official FIVONDRONANA logo is not available as a standalone asset. Use the FIVONDRONANA wordmark until it is supplied; do not invent a monogram or crop the screenshots. The Tily and Mpanazava logos under `src/assets/` are official unit marks and may be shown in group context.
- **Forms and document viewers:** scroll within safe areas; preserve form values on validation errors and prevent actions from hiding behind the keyboard.

## Platform Behavior

- Keep iOS safe areas, native stack transitions, and edge-swipe back behavior.
- Keep Android system/predictive Back behavior, edge-to-edge insets, Material touch targets, and Android navigation conventions.
- Honor reduced-motion settings and system text scaling.
- Avoid using the 260-pixel-wide CV-form capture as a fixed device width; it is a tall content reference. The screen must reflow and scroll on normal phone widths.

## Assets and Open Decisions

- No standalone FIVONDRONANA logo or profile illustrations are present. Tily/Mpanazava and branch emblem JPEGs do exist under `src/assets/`; use only a matching emblem in a known unit context and do not ship crops from the reference screenshots as final brand assets.
- The source captures show light mode only. Light mode is the visual baseline; dark-mode colors require a separate review against the real screens.
- The membership rule, password-recovery channel, attachment formats and size limits, and exact search/notification behavior remain open in `PRODUCT.md` because the source requirements conflict or do not specify them.
