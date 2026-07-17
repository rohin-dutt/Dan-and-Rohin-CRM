# Onboarding Design QA

## Comparison target

- Source visual truth: `C:\Users\danie\AppData\Local\Temp\codex-clipboard-e45181b9-4d8e-4ce7-b7d2-291594253646.png`
- Brand source: `C:\Users\danie\Desktop\Roots Mock Up Photos\roots_app_store_icon_1024.png`
- Real-device problem evidence: `C:\Users\danie\.codex\codex-remote-attachments\019f70a4-6589-7351-92de-5a71ffb3b1bc\39BFAFFA-B1BD-4221-8239-803FD2FEA31C\1-Photo-1.jpg` through `5-Photo-5.jpg`
- Residual page 3/4 overlap evidence: `C:\Users\danie\AppData\Local\Temp\codex-clipboard-fb848b46-5a99-438a-8f91-47e28c514722.png` and `C:\Users\danie\AppData\Local\Temp\codex-clipboard-227fb6d6-e3e0-4581-b3da-090bf50ce954.png`
- Final page 3/4 comparison: `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\offset-fix-comparison.png`
- Browser-rendered implementation screenshot: `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\revised-implementation-contact-sheet.png`
- Combined source/implementation evidence: `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\revised-reference-vs-implementation.png`
- Focused page 2 before/after evidence: `C:\Users\danie\Desktop\Coding\personal-crm\tmp\onboarding-qa\page-2-before-after.png`
- Viewport: 390 x 844 CSS pixels.
- State: unauthenticated first-download onboarding, pages 1-5.

The source board is an art-direction and composition guide rather than a literal
clone. Required deviations are initials-only contacts, no real people, the new
Roots identity, no Skip action, immediate tap navigation, and native Apple sign
in on iOS.

## Full-view comparison evidence

The combined comparison contains the full five-screen source board and the
latest five implementation captures in one image. The implementation retains
the reference's warm ivory editorial hierarchy, botanical/tactile depth,
centered progress treatment, relationship-memory collage, context
constellation, before/after connection story, and rooted closing screen.

The final 390 x 844 strip shows a clean copy-to-art gutter on pages 1-4. No
headline or body text intersects a generated card, initials token, icon,
botanical detail, or still-life object. Page 1 and pages 3-4 were tightened
after an intermediate pass so the fix does not create an oversized empty band.

## Focused-region comparison evidence

- Page 1: the supplied real-device capture placed the body copy over the `MC`
  token and leaves. The latest capture keeps the exact live copy and begins the
  relationship collage below it with a modest visible buffer.
- Page 2: the focused before/after composite shows the old unrelated coffee,
  umbrella, and lamp tiles replaced by one continuous visual metaphor. A phone
  and `AM` almost connect, calendar milestones descend through the page, the
  connection fades, and seasonal leaves show time passing. The original live
  headline/body and generated microcopy remain intact.
- Page 3: the clock card now begins below the live paragraph; the constellation
  remains large, readable, and grounded by the vase/books/bowl still life.
- Page 4: the upper Alex Morgan card now begins below the live paragraph; the
  before/action/after sequence remains complete and the lower card is visible.
- Page 5: the logo, title, rooted tree, email/returning-user controls, and privacy
  note retain the intended hierarchy. The Apple control is native-iOS-only and
  is visible in the supplied real-device capture rather than the web capture.

Focused crops beyond these full phone captures were not needed because the
important copy, labels, icons, and copy-to-art boundaries remain legible at the
actual 390 x 844 QA viewport.

## Required fidelity surfaces

- Fonts and typography: live headings use Cormorant Garamond and live body/UI
  text uses Inter. Size, weight, wrapping, line height, and centered hierarchy
  remain consistent across the five pages. No live text clips or truncates.
- Spacing and layout rhythm: all screens fit the phone frame with no document
  overflow. Pages 1-4 now have clear but compact copy-safe spacing. Pages 3 and
  4 retain their full-scale art with small, clipped-at-screen-edge placement
  offsets rather than shrinking the main visual story.
- Colors and tokens: ivory, deep forest, sage, oat, restrained amber, and the
  small dusty-lilac accent remain consistent with the brand and source board.
- Image quality and asset fidelity: production plates are project-owned raster
  assets at roughly 853 x 1844, rendered with memory/disk caching at more than
  2x logical phone resolution. They are sharp and free of visible masks, halos,
  placeholder art, people, or CSS/SVG substitutes.
- Copy and content: all five live headlines and paragraphs are unchanged. Page
  2 retains `Thought about reaching out`, `A few weeks later`, `A few months
  later`, `It's been a while`, `Life moves fast.`, and `Good intentions get lost
  in it.` The other memory, context, and connection labels remain unchanged.
- Icons: generated icons use one restrained Roots visual language. Live email
  and privacy icons use Ionicons; Apple sign in uses Apple's native control.
- Accessibility: story pages expose adjustable previous/next actions and page
  values. Tap regions cover the left and right halves of the screen. Final CTAs
  retain semantic labels. Dynamic Type and VoiceOver still merit a physical
  device pass.

## Interaction, loading, and console verification

- The first capture after reload showed only the neutral ivory loading surface.
  After all five images decoded, live copy and artwork appeared together in one
  complete frame.
- Once loaded, right-side taps advanced through the story without an artificial
  delay or image flash. A left-side tap from page 5 returned to page 4.
- Pages 1-5 were captured at exactly 390 x 844 in the Codex in-app Browser.
- The final browser console error check returned an empty list.
- Email/login routing and native Apple integration were already verified in the
  preceding onboarding implementation pass and were not changed by this fix.

## Comparison history

1. P1 - real iPhone copy/art collision on pages 1-4.
   Evidence: the five user-supplied Expo Go photos show live copy touching or
   overlaying the generated artwork. Fix: rebuilt the page 1 copy-safe plate,
   recreated page 2, and gave pages 3-4 deterministic full-scale placement
   offsets. Post-fix evidence: the revised implementation contact sheet.
2. P1 - copy and raster art appeared at different times.
   Evidence: the old React Native image mounted independently from the live
   copy while Expo Go fetched/decoded the roughly 2 MB plates. Fix: preload and
   retain all five plates as native image references, gate the intro behind a
   neutral surface, and render the selected predecoded reference with zero
   transition. Post-fix evidence: reload showed the neutral state first and a
   complete page frame next; subsequent page taps were immediate.
3. P1 - page 2 lacked a coherent visual message.
   Evidence: the supplied page 2 photo contains three unrelated still lifes.
   Fix: replaced them with a repeated phone/contact near-connection whose line
   fades across week/month milestones. Post-fix evidence:
   `page-2-before-after.png`.
4. P2 - first spacing revision overcorrected pages 1, 3, and 4 with excessive
   empty space. Fix: tightened page 1's generated composition and restored
   pages 3-4 at full scale with measured placement offsets. Post-fix
   evidence: final captures for pages 1, 3, and 4 in the revised contact sheet.
5. P1 - the first physical-iPhone recheck still showed a small residual overlap
   on pages 3 and 4. Fix: changed only their existing image offsets, moving page
   3 from 8% to 10% and page 4 from 6% to 9%. Post-fix evidence:
   `offset-fix-comparison.png`, where both live paragraphs clear the artwork.

## Findings

No actionable P0, P1, or P2 differences remain for the requested fix. The
implementation is a deliberate no-people Roots adaptation of the reference and
now resolves the real-device overlap, timing, and page 2 storytelling problems.

## Open questions

- Recheck Dynamic Type, VoiceOver, and the native Apple consent sheet on a
  physical iPhone. These do not block the visual/layout fix.

## Implementation checklist

- [x] Copy/art overlap removed on pages 1-4.
- [x] All five assets preloaded before onboarding content is revealed.
- [x] Page changes render from decoded in-memory image references.
- [x] Page 2 redesigned as one coherent delayed-intention story.
- [x] Original live headline/body text preserved.
- [x] No real people introduced.
- [x] Left/back and right/forward tap behavior verified.
- [x] Browser console checked with no errors.
- [ ] Physical-iPhone Dynamic Type, VoiceOver, and Apple consent-sheet pass.

## Follow-up polish

- Confirm the smallest page 2 milestone captions remain comfortable on the
  user's exact iPhone display scale; enlarge only if the device pass calls for
  it.

final result: passed
