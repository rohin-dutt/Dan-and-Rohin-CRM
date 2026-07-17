# App Store Readiness

This checklist tracks what Roots needs before App Store submission.

## Apple Account

- [ ] Apple Developer Program enrollment confirmed.
- [ ] App Store Connect access confirmed.
- [ ] Team owner identified.
- [ ] One Apple Developer account owner is assigned before Phase 4/TestFlight
      work begins.
- [ ] Bundle ID created.
- [ ] App record created in App Store Connect.

Decision: create an Apple Developer account for Roots. The specific owner is
pending until the account exists.

Proposed bundle ID:

```text
com.useroots.app
```

Decision: use `com.useroots.app` for the current Expo app config. If this
changes before Apple provisioning, update `mobile/app.json`, this checklist,
and App Store Connect together.

## App Identity

- [x] App name confirmed: Roots.
- [ ] Subtitle drafted.
- [ ] App description drafted.
- [ ] Keywords drafted.
- [ ] Category selected.
- [ ] Age rating completed.
- [ ] Copyright owner confirmed.

## Build Configuration

- [x] Expo app config created.
- [ ] EAS project configured.
- [x] EAS development, preview/TestFlight, and production profiles defined.
- [x] iOS bundle identifier set.
- [x] App icon complete.
  - Uses the approved tree-and-roots artwork in `mobile/assets/icon.png`.
- [x] Splash screen complete.
  - Uses the approved artwork on the matching `#FBF2E5` brand field with
    `contain` scaling so the mark is not cropped.
- [x] Version and build number process defined.
  - Decision: use date-based build numbers, such as `2026051601`.
- [ ] Release channel/update policy defined.
- [ ] Rollback approach defined for bad builds or OTA updates.
- [ ] TestFlight build uploaded.
- [ ] TestFlight install verified on real iPhone.

June 10, 2026 status: `mobile/eas.json` defines development, preview, and
production profiles. `mobile/app.json` sets `com.useroots.app`, `roots://`,
version `1.0.0`, and build number `2026060201`. EAS project linking, Apple
Developer enrollment, provisioning, upload, and TestFlight install remain
manual external blockers.

## Sign In With Apple

- [x] Native Expo Apple Authentication dependency installed.
- [x] Expo config plugin and `ios.usesAppleSignIn` capability enabled.
- [x] Native Apple button is available from first-download intro, login, and
      signup.
- [x] Apple identity tokens are exchanged through Supabase
      `signInWithIdToken`; no Apple credential is persisted by the app.
- [x] First-authorization name data is saved to display-only user metadata when
      Apple supplies it.
- [ ] Enable Sign in with Apple for App ID `com.useroots.app` in the Apple
      Developer portal.
- [ ] Enable the Apple provider in the Supabase Auth dashboard and include
      `com.useroots.app` in the allowed Client IDs.
- [ ] Configure Apple's private email relay for Roots' approved sending domain.
- [ ] Verify new-account, returning-account, hidden-email, canceled-consent,
      revoked-credential, and existing-email collision behavior on a real
      iPhone/TestFlight build.

## URLs

- [x] Privacy policy URL.
- [x] Support URL.
- [ ] Marketing URL, if used.
- [ ] User privacy choices or account deletion URL, if used.
- [ ] Supabase auth redirect URLs configured.
- [x] Deep link scheme configured.

Proposed deep link scheme:

```text
roots://
```

Decision: use the existing website privacy page and contact page for mobile v1
legal/support links. Use `roots://` as the app deep link scheme.

## App Privacy

The final App Privacy answers must match actual behavior and SDK usage.

Data likely collected or processed:

- account email
- contacts created by user
- iOS Contacts data selected by user for import
- relationship notes
- interaction history
- reminder preferences
- push notification token
- diagnostics if logging is added

Required decisions:

- [ ] Confirm data linked to user.
- [ ] Confirm data not sold.
- [x] Confirm whether diagnostics are collected.
  - Decision: no analytics or crash reporting SDK in mobile v1.
- [x] Confirm whether crash reporting, analytics, or logging SDKs are used.
  - Decision: no analytics or crash reporting SDK in mobile v1.
- [x] Confirm retention policy for deleted accounts.
  - Decision: account deletion deletes private CRM data immediately.
- [x] Confirm cached private data clearing on logout/account deletion.
  - Decision: private offline cache must be encrypted for v1 and cleared on
    logout/account deletion; delay offline cache if encrypted storage is not
    practical.
- [x] Confirm contacts are imported only after user selection and review.
  - Decision: users can select contacts or choose import all, but both paths
    require review before save.
- [x] Confirm unselected Contacts data is not uploaded or persisted.

## Privacy Manifest And SDK Review

- [ ] `PrivacyInfo.xcprivacy` verified in a generated/archived build.
  - Current state: there is no standalone `PrivacyInfo.xcprivacy` file in the
    repo. Privacy manifest values live in `mobile/app.json` under
    `ios.privacyManifests` (no collected data types, no tracking). Expo
    prebuild/EAS generates the native manifest from that config; verifying the
    generated manifest in a real build remains open.
- [ ] Collected data declarations match App Store privacy answers.
- [ ] Required-reason API usage is declared where applicable.
- [ ] Third-party SDK privacy manifests are present where required.
- [ ] SDK list reviewed for tracking domains, analytics, ads, and diagnostics.
- [ ] No tracking use is present unless explicitly approved, disclosed, and
      reflected in privacy answers.

## Permissions

Contacts:

- [x] Purpose string written.
- [x] Permission pre-prompt screen implemented.
- [x] Denied-permission fallback implemented.
- [x] Limited/partial access behavior implemented if applicable.
- [x] Import review-before-save implemented.
- [x] Unselected contacts are not uploaded or persisted.

Decision: support selected-contact import and an import-all option. Import all
must still pass through review before save.

June 2, 2026 status: native Contacts import is implemented as a review screen
that maps only name, first email, and first phone. It flags likely duplicates
and uploads only selected contacts through the trusted contacts import API.
Update-existing behavior and real-device permission QA remain open.

Push Notifications:

- [ ] Purpose shown before system prompt.
- [x] Permission request implemented.
  - Implemented from mobile Settings before token registration. Real iPhone QA
    still required.
- [x] User can disable reminder notifications.
  - Mobile Settings exposes one push notification toggle backed by follow-up,
    birthday, and important-moment push preference columns.
- [x] Notification payloads avoid private notes/details.
  - The code-ready sender uses generic copy only and includes routing metadata,
    not notes, raw contact payloads, contact names, or detailed relationship
    context.
- [x] Notification preferences, token cleanup, and delivery logging match the
      privacy policy.
  - Settings preferences, trusted token registration, logout cleanup,
    server-side account deletion cleanup, protected scheduled sending,
    idempotent delivery rows, and invalid-token marking are implemented.
    Physical-device validation remains open.

## Accessibility And Device QA

- [ ] Dynamic Type checked on key screens.
- [ ] VoiceOver basics checked for navigation, forms, and destructive actions.
- [ ] Color contrast checked for text, controls, tags, and status indicators.
- [ ] Reduced Motion behavior checked if animations are used.
- [ ] Keyboard avoidance checked for auth, person forms, and interaction forms.
  - Implemented centrally in the mobile `Screen` component; still needs real
    iPhone QA.
- [ ] Safe areas checked on small and large iPhone sizes.
- [ ] Empty, loading, error, and offline states checked on device.

## Review Notes

- [ ] Demo account created.
- [ ] Demo account credentials stored securely for submission.
- [ ] Review notes explain Contacts permission.
- [ ] Review notes explain Notifications permission.
- [x] Review notes explain account deletion path.
  - Account deletion is available from mobile Settings and uses a trusted
    server route with explicit confirmation.
- [ ] Review notes mention no payment/subscription in mobile v1.
- [ ] Review notes mention offline cache behavior if relevant to testing.

## Screenshots And Media

Required iPhone screenshots:

- [ ] Dashboard.
- [ ] People list.
- [ ] Person detail.
- [ ] Your Roots.
- [ ] Contacts import or onboarding.
- [ ] Settings if useful.

Screenshot rules:

- Use realistic but non-sensitive sample data.
- Avoid showing private real contacts.
- Keep notification examples privacy-safe.

## Functional QA Before Submission

- [ ] Signup.
- [ ] Login.
- [ ] Sign in with Apple.
- [ ] Logout.
- [ ] Session restore.
- [ ] Password reset.
- [ ] Onboarding.
- [ ] Create person.
- [ ] Edit person.
- [ ] Delete person.
- [ ] Search/filter/sort people.
- [ ] Create/edit/delete interaction.
- [ ] Mark follow-up done.
- [ ] Reopen follow-up.
- [ ] Snooze follow-up.
- [ ] Contacts import.
- [ ] Push notification delivery.
- [ ] Notification deep link.
  - Code-ready tap handling is implemented for person detail, People
    follow-up filters, and Dashboard fallback. TestFlight/App Store iPhone QA
    is still required.
- [ ] Offline app launch with cached data.
- [ ] Export.
- [ ] Import/update.
- [ ] Restore/replace.
- [ ] Account deletion.
  - Implemented in mobile Settings; still needs real-device/TestFlight QA.
- [x] Local cache clearing after logout.
- [x] Local cache clearing after account deletion.
- [x] Push token cleanup after logout/account deletion where practical.
- [ ] Restore/replace atomicity verified.
- [x] Mobile trusted API auth rejects missing/invalid bearer tokens.
  - Implemented shared JSON auth errors and bearer/cookie trusted auth for
    export, contacts import, account deletion, and restore/import. Locally
    verified unauthenticated API smoke expectations for export, contacts
    import, and push-token registration plus Supabase RPC unauthenticated
    rejection; real mobile bearer-token QA still needs a device/simulator
    session.

## Submission Gate

Do not submit until:

- [ ] TestFlight build has been used on at least one real iPhone.
- [ ] App Privacy answers are complete.
- [ ] Demo account works.
- [ ] No known auth, data ownership, or account deletion blocker remains.
- [ ] Contacts and notification permissions match review notes.
- [ ] Support and privacy URLs are live.
- [ ] Privacy manifest and SDK privacy review are complete.
- [ ] Accessibility/device QA has no known release blocker.
- [ ] Version/build-number and rollback process are documented.
