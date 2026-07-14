import { useState } from "react"
import { Alert, Share } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system/legacy"
import { supabase } from "@/lib/supabase"
import { clearLocalPrivateData } from "@/lib/private-data"
import { callTrustedApi } from "@/lib/trusted-api"

// Export / import / restore / account deletion handlers for Settings.
// Server-side validation is authoritative (the trusted routes validate the
// payload shape); this hook adds early local file validation and result
// feedback so a bad file fails before upload.
export function useDataManagement({
  onSuccess,
  onFailure,
}: {
  onSuccess: (message: string) => void
  onFailure: (message: string) => void
}) {
  const [dataWorking, setDataWorking] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  async function pickJsonPayload(): Promise<Record<string, unknown> | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    })
    if (result.canceled) return null
    const asset = result.assets[0]
    if (!asset?.uri) return null
    const text = await FileSystem.readAsStringAsync(asset.uri)

    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Error("The selected file is not valid JSON. Choose a Roots export file.")
    }
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("The selected file does not look like a Roots export.")
    }
    return parsed as Record<string, unknown>
  }

  async function exportData() {
    if (dataWorking) return
    setDataWorking(true)
    try {
      const payload = await callTrustedApi("/api/export", { method: "GET" })
      await Share.share({
        title: "Roots export",
        message: JSON.stringify(payload, null, 2),
      })
      onSuccess("Your data is being exported.")
    } catch (e) {
      onFailure(e instanceof Error ? e.message : "Failed to export data.")
    } finally {
      setDataWorking(false)
    }
  }

  async function importData() {
    if (dataWorking) return
    setDataWorking(true)
    try {
      const payload = await pickJsonPayload()
      if (!payload) return
      await callTrustedApi("/api/import/restore", {
        body: { payload, replace_existing: false },
      })
      onSuccess("Import complete. Existing data was kept and updated.")
    } catch (e) {
      onFailure(e instanceof Error ? e.message : "Failed to import data.")
    } finally {
      setDataWorking(false)
    }
  }

  function restoreData() {
    Alert.alert(
      "Restore and replace?",
      "This replaces your current Roots data with the selected export file.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Choose file",
          style: "destructive",
          onPress: async () => {
            if (dataWorking) return
            setDataWorking(true)
            try {
              const payload = await pickJsonPayload()
              if (!payload) return
              await callTrustedApi("/api/import/restore", {
                body: { payload, replace_existing: true },
              })
              onSuccess("Restore complete. Your data now matches the backup file.")
            } catch (e) {
              onFailure(e instanceof Error ? e.message : "Failed to restore data.")
            } finally {
              setDataWorking(false)
            }
          },
        },
      ],
    )
  }

  function deleteAccount() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your Roots account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            if (deletingAccount) return
            setDeletingAccount(true)
            try {
              // The trusted route revokes push tokens server-side before
              // deleting the auth user; local private data is cleared here.
              await callTrustedApi("/api/account/delete", {
                method: "POST",
                body: { confirm: "DELETE" },
              })
              await clearLocalPrivateData()
              // The auth user no longer exists, so a server-side sign-out can
              // fail; a local sign-out is enough to drop the session.
              await supabase.auth.signOut({ scope: "local" }).catch(() => null)
            } catch (e) {
              const message = e instanceof Error ? e.message : "Failed to delete account."
              onFailure(message)
              Alert.alert(
                "Account deletion failed",
                `${message}\n\nYour account was not deleted. Please try again or contact support.`,
              )
            } finally {
              setDeletingAccount(false)
            }
          },
        },
      ],
    )
  }

  return { dataWorking, deletingAccount, exportData, importData, restoreData, deleteAccount }
}
