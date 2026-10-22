import type { AuthFieldError } from '../domain/entities/AuthError';

/**
 * Sorts a `VALIDATION_FAILED` answer's `errors[]` onto the inputs they belong to
 * (spec §5: "map `errors[].field` onto form fields").
 *
 * `fieldsByApiName` maps the API's field names (`dob`, `newPassword`) onto the
 * form's own inputs. `messages` swaps the API's developer wording ("lastName must
 * be longer than or equal to 1 characters") for ours where one is written; any
 * other complaint keeps the server's text, which still beats a blanket "check
 * your details".
 *
 * Anything about a field the form does not show (the terms version, say) comes
 * back in `rest`, to be shown against the button, so nothing is silently dropped.
 * The first complaint per input wins: one message under a box is readable, three
 * are not.
 */
export function sortFieldErrors<Field extends string>(
  errors: readonly AuthFieldError[],
  fieldsByApiName: Readonly<Record<string, Field>>,
  messages: Readonly<Record<string, string>> = {},
): { fields: Partial<Record<Field, string>>; rest: string[] } {
  const fields: Partial<Record<Field, string>> = {};
  const rest: string[] = [];

  for (const { field, message } of errors) {
    const target = Object.prototype.hasOwnProperty.call(fieldsByApiName, field)
      ? fieldsByApiName[field]
      : undefined;
    if (!target) {
      rest.push(messages[field] ?? message);
      continue;
    }
    fields[target] ??= messages[field] ?? message;
  }

  return { fields, rest };
}
