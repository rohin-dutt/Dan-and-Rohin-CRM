export function AppleSignInButton(props: {
  kind?: "continue" | "sign-in" | "sign-up"
  onError: (message: string | null) => void
  onSignedIn: () => void | Promise<void>
}) {
  void props
  return null
}
