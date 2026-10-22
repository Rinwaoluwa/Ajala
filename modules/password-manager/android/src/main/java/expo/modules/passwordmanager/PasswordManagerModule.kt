package expo.modules.passwordmanager

import androidx.credentials.CreatePasswordRequest
import androidx.credentials.CredentialManager
import androidx.credentials.exceptions.CreateCredentialCancellationException
import androidx.credentials.exceptions.CreateCredentialException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Offers to save a password to the user's password manager (Google Password
 * Manager, or whichever provider they chose) through Android's Credential Manager.
 *
 * Resolves with what happened rather than throwing: "saved", "dismissed" (the
 * person said no), or "unavailable" (no provider, no activity, any other failure).
 * Saving a password is never worth an error on screen.
 */
class PasswordManagerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PasswordManager")

    AsyncFunction("savePassword") Coroutine { username: String, password: String ->
      val activity = appContext.currentActivity ?: return@Coroutine "unavailable"
      // The sheet is UI: it must be started from the main thread, with an activity.
      withContext(Dispatchers.Main) {
        try {
          CredentialManager.create(activity)
            .createCredential(activity, CreatePasswordRequest(username, password))
          "saved"
        } catch (e: CreateCredentialCancellationException) {
          "dismissed"
        } catch (e: CreateCredentialException) {
          "unavailable"
        }
      }
    }
  }
}
