# Onboarding Pages 2, 4, and 5 Design QA

Date: 2026-07-18

## Comparison Target

- Page 2 source visual truth: `C:\Users\danie\Desktop\a.png`
- Page 4 before-state reference: `C:\Users\danie\AppData\Local\Temp\codex-clipboard-227fb6d6-e3e0-4581-b3da-090bf50ce954.png`
- Page 5 source visual truth: `C:\Users\danie\AppData\Local\Temp\codex-clipboard-fa9d740a-de94-494b-be1d-5f40417a5c1a.png`
- Standard implementation screenshots:
  - `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\refined-standard\page-2.png`
  - `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\refined-standard\page-4-final.png`
  - `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\refined-standard\page-5.png`
- Small implementation screenshots:
  - `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\refined-small\page-2.png`
  - `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\refined-small\page-4-v2.png`
  - `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\refined-small\page-5.png`
- Side-by-side comparison evidence: `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\refined-comparisons\page-2-comparison.png`, `page-4-comparison.png`, and `page-5-comparison.png`.

## Viewports And States

- Standard viewport: 390 x 844.
- Small viewport: 375 x 667.
- States: page 2 timeline, page 4 connection example, and page 5 pre-auth state.
- Theme: light.
- Visual runtime: Expo web rendering of the production React Native screen.
- Native bundle check: `npx expo export --platform ios` completed successfully.

The source images include iOS status chrome while the implementation captures intentionally do not. The app continues to rely on `SafeAreaView` instead of recreating system UI.

## Full-View Comparison Evidence

### Page 2

The revised screen preserves the requested timeline hierarchy while adding the missing emotional detail: the heading and supporting copy are centered, a thin organic vine visually links all three moments, and muted watercolor plants frame the lower portion of the screen. The vine sits behind the initials column instead of reading as a separate UI rule. Message cards remain native and readable, and the plants stay secondary to the timeline at both viewports.

### Page 4

The reference-to-implementation comparison shows the requested slight zoom-out. Cards and the log-connection control are visibly smaller without changing their order, proportions, typography, or artwork. The final image uses a 0.95 scale and `contain` sizing so the lower card remains visible on compact phones instead of being cropped.

### Page 5

The brand mark, headline, supporting copy, email action, account link, and security statement now form one vertically centered composition. The resulting page has balanced space above and below rather than splitting the brand at the top and actions at the bottom. The Apple option is intentionally disabled on this onboarding page across platforms.

The full-resolution standard and small screenshots also serve as focused evidence. The relevant typography, vine detail, card edges, icon alignment, privacy copy, and compact-screen bottom spacing are readable without additional crops.

## Required Fidelity Surfaces

- Fonts and typography: passed. All three pages reuse the existing Cormorant Garamond and Inter tokens. Page 2's top copy is centered with controlled line breaks, and no text clips at either viewport.
- Spacing and layout rhythm: passed. Timeline entries retain clear separation; page 4 has a lighter visual density; page 5 is centered as a single group. Existing horizontal margins, radii, borders, and shadows are unchanged.
- Colors and visual tokens: passed. The forest, ink, sage, sand, border, and brand-ivory values remain sourced from `mobile/constants/theme.ts`.
- Image quality and asset fidelity: passed. Page 2 uses a new 852 x 1846 production raster asset matching the existing warm paper and watercolor botanical treatment. It contains no baked-in copy, cards, status chrome, people, or screenshots.
- Copy and content: passed. The page 2 and page 5 product copy is unchanged. The revised security statement is grounded in the production privacy policy: relationship data is private to the account, and Roots does not sell it or share it with advertisers.
- Icons: passed. Existing Ionicons and the Roots logo remain aligned and consistent.
- Responsiveness: passed at 390 x 844 and 375 x 667. No overlap, horizontal overflow, clipped copy, or off-screen primary action was observed in the captured states.
- Accessibility: passed for the touched implementation. Existing semantic buttons, labels, adjustable navigation behavior, and bounded text scaling remain intact.

## Interaction And Runtime Checks

- Right-side taps advanced through the onboarding sequence.
- A left-side tap returned page 4 to page 3.
- A left-side background tap on page 5 returned to page 4 as intended.
- A tap near the far-left edge of "Continue with email" navigated directly to `/signup` without also activating page-level back navigation.
- "I already have an account" navigated to `/login` without returning to page 4.
- Page badges and progress dots updated with navigation.
- Browser console: no errors. The only warning was Expo Notifications' known web-only push-token-listener warning, unrelated to onboarding.
- Mobile TypeScript and lint checks passed.
- Root test suite passed.
- iOS Expo export passed and included `onboarding-02-botanical.png`.
- Root lint remains blocked by five previously recorded public-site copy errors.
- Root production build remains blocked by the previously recorded missing `RESEND_API_KEY` during `/api/contact` page-data collection.

## Comparison History

### Iteration 1

- [P2] Page 2 lacked the reference's organic continuity and background depth.
  - Fix: replaced the straight native rule with a generated decorative background containing one subtle squiggle vine and restrained lower-corner foliage; centered the headline and supporting copy.
  - Post-fix evidence: `tmp/onboarding-qa/refined-standard/page-2.png`, `tmp/onboarding-qa/refined-small/page-2.png`, and `tmp/onboarding-qa/refined-comparisons/page-2-comparison.png`.

- [P2] Page 4 cards felt oversized, and the lower card could crop on a short viewport.
  - Fix: scaled the artwork to 0.95 and used contained fitting for the page 4 asset.
  - Post-fix evidence: `tmp/onboarding-qa/refined-standard/page-4-final.png`, `tmp/onboarding-qa/refined-small/page-4-v2.png`, and `tmp/onboarding-qa/refined-comparisons/page-4-comparison.png`.

- [P2] Page 5 split its composition vertically and used privacy copy that was less precise than the production policy.
  - Fix: centered the full content stack and replaced the line with policy-grounded language about account privacy, data sales, and advertisers.
  - Post-fix evidence: `tmp/onboarding-qa/refined-standard/page-5.png`, `tmp/onboarding-qa/refined-small/page-5.png`, and `tmp/onboarding-qa/refined-comparisons/page-5-comparison.png`.

## Follow-up Polish

- P3 test gap: a final physical-device pass remains useful for native safe-area spacing before release.

final result: passed
