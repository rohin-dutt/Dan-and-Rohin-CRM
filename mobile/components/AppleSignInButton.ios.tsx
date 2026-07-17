import { useState } from "react"
import { ActivityIndicator, View } from "react-native"
import * as AppleAuthentication from "expo-apple-authentication"

import { colors } from "@/constants/theme"
import { supabase } from "@/lib/supabase"

type AppleButtonKind = "continue" | "sign-in" | "sign-up"

type AppleSignInButtonProps = {
  kind?: AppleButtonKind
  onError: (message: string | null) => void
  onSignedIn: () => void | Promise<void>
}

function buttonType(kind: AppleButtonKind) {
  if (kind === "sign-in") return AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
  if (kind === "sign-up") return AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
  return AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
}

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error == null || !("code" in error)) return null
  return typeof error.code === "string" ? error.code : null
}

function errorMessage(error: unknown): string {
  if (typeof error !== "object" || error == null || !("message" in error)) {
    return "Apple sign-in couldn’t be completed. Please try again."
  }

  return typeof error.message === "string" && error.message.trim()
    ? error.message
    : "Apple sign-in couldn’t be completed. Please try again."
}

export function AppleSignInButton({
  kind = "continue",
  onError,
  onSignedIn,
}: AppleSignInButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleAppleSignIn() {
    if (loading) return

    onError(null)
    setLoading(true)

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (!credential.identityToken) {
        throw new Error("Apple did not return an identity token. Please try again.")
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      })

      if (error) throw error

      const givenName = credential.fullName?.givenName?.trim() || null
      const middleName = credential.fullName?.middleName?.trim() || null
      const familyName = credential.fullName?.familyName?.trim() || null
      const fullName = [givenName, middleName, familyName].filter(Boolean).join(" ")

      if (fullName) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            first_name: givenName,
            last_name: familyName,
            full_name: fullName,
            given_name: givenName,
            family_name: familyName,
          },
        })

        if (metadataError) {
          console.warn("Apple sign-in succeeded, but profile name could not be saved.")
        }
      }

      await onSignedIn()
    } catch (error) {
      if (errorCode(error) !== "ERR_REQUEST_CANCELED") {
        onError(errorMessage(error))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View
      className="w-full"
      style={{ minHeight: 50, opacity: loading ? 0.68 : 1, pointerEvents: loading ? "none" : "auto" }}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={buttonType(kind)}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={14}
        style={{ width: "100%", height: 50 }}
        onPress={() => void handleAppleSignIn()}
      />
      {loading ? (
        <View className="absolute inset-0 items-center justify-center" style={{ pointerEvents: "none" }}>
          <ActivityIndicator color={colors.ivory} />
        </View>
      ) : null}
    </View>
  )
}
