# App Store Readiness

This checklist tracks what Roots needs before App Store submission.

## Apple Account

- [ ] Apple Developer Program enrollment confirmed.
- [ ] App Store Connect access confirmed.
- [ ] Team owner identified.
- [ ] Bundle ID created.
- [ ] App record created in App Store Connect.

Proposed bundle ID:

```text
com.roots.crm
```

## App Identity

- [ ] App name confirmed: Roots.
- [ ] Subtitle drafted.
- [ ] App description drafted.
- [ ] Keywords drafted.
- [ ] Category selected.
- [ ] Age rating completed.
- [ ] Copyright owner confirmed.

## Build Configuration

- [ ] Expo app config created.
- [ ] EAS project configured.
- [ ] iOS bundle identifier set.
- [ ] App icon complete.
- [ ] Splash screen complete.
- [ ] Version and build number process defined.
- [ ] TestFlight build uploaded.
- [ ] TestFlight install verified on real iPhone.

## URLs

- [ ] Privacy policy URL.
- [ ] Support URL.
- [ ] Marketing URL, if used.
- [ ] Supabase auth redirect URLs configured.
- [ ] Deep link scheme configured.

Proposed deep link scheme:

```text
roots://
```

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
- [ ] Confirm whether diagnostics are collected.
- [ ] Confirm retention policy for deleted accounts.
- [ ] Confirm cached private data clearing on logout/account deletion.

## Permissions

Contacts:

- [ ] Purpose string written.
- [ ] Permission pre-prompt screen implemented.
- [ ] Denied-permission fallback implemented.
- [ ] Import review-before-save implemented.

Push Notifications:

- [ ] Purpose shown before system prompt.
- [ ] Permission request implemented.
- [ ] User can disable reminder notifications.
- [ ] Notification payloads avoid private notes/details.

## Review Notes

- [ ] Demo account created.
- [ ] Demo account credentials stored securely for submission.
- [ ] Review notes explain Contacts permission.
- [ ] Review notes explain Notifications permission.
- [ ] Review notes explain account deletion path.
- [ ] Review notes mention no payment/subscription in mobile v1.

## Screenshots And Media

Required iPhone screenshots:

- [ ] Dashboard.
- [ ] People list.
- [ ] Person detail.
- [ ] Follow Ups.
- [ ] Contacts import or onboarding.
- [ ] Settings if useful.

Screenshot rules:

- Use realistic but non-sensitive sample data.
- Avoid showing private real contacts.
- Keep notification examples privacy-safe.

## Functional QA Before Submission

- [ ] Signup.
- [ ] Login.
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
- [ ] Offline app launch with cached data.
- [ ] Export.
- [ ] Import/update.
- [ ] Restore/replace.
- [ ] Account deletion.

## Submission Gate

Do not submit until:

- [ ] TestFlight build has been used on at least one real iPhone.
- [ ] App Privacy answers are complete.
- [ ] Demo account works.
- [ ] No known auth, data ownership, or account deletion blocker remains.
- [ ] Contacts and notification permissions match review notes.
- [ ] Support and privacy URLs are live.
