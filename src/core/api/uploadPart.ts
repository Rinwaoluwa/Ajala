import { File } from 'expo-file-system';

/** A file on the phone to upload, as the pickers hand it over. */
export type UploadFile = { uri: string; name: string; type: string };

/**
 * Adds a file on the phone to a multipart form, in the shape Expo's `fetch`
 * can send.
 *
 * Expo's `fetch` (the app's global one) reads each file part's bytes itself and
 * does not take React Native's old `{ uri, name, type }` parts: those fail with
 * "Unsupported FormDataPart implementation" before the request leaves the
 * phone. So the part carries the file's name and type, and reads its bytes
 * from disk only when the request is sent.
 */
export function appendFile(form: FormData, field: string, file: UploadFile): void {
  const part = {
    name: file.name,
    type: file.type,
    bytes: () => new File(file.uri).bytes(),
  };
  form.append(field, part as unknown as Blob);
}
