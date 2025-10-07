# Form Control Error Helpers

This repository standardises how Angular templates surface validation messages from reactive forms. The pattern relies on small helper methods declared on the component class that inspect a `FormControl` and return the translated error string that should be rendered by UI primitives such as `app-text-input`.

## Diary Creation Modal

`src/app/components/Organisms/create-diary-modal/create-diary-modal.component.ts` exposes two helpers:

- `getDiaryControlError(controlName: string)` handles the travel diary stage. It inspects `diaryForm`, propagating `required`, `minlength`, and `maxlength` messages for inputs like the trip name (`title`) and the departure date (`startDate`).
- `getStepControlError(controlName: string)` does the same for the embedded step wizard, aligning messaging with the standalone step form.

Both helpers now provide specific copy for the date pickers:

- Required start dates surface `"Sélectionnez une date de départ"`.
- Required end dates surface `"Sélectionnez une date de fin"`.
- Invalid formats (anything other than `YYYY-MM-DD` or `jj/mm/aaaa`) trigger `"Format de date invalide. Utilisez jj/mm/aaaa."` via the shared `dateFormatValidator`.

The modal template binds these helpers to the reusable text inputs, for example:

```html
<app-text-input
  formControlName="title"
  label="Nom du voyage"
  [isRequired]="true"
  [errorMessage]="getDiaryControlError('title')"
></app-text-input>
```

When submission is attempted, `handleDiarySubmit()` calls `diaryForm.markAllAsTouched()`. Any invalid control now satisfies the "touched or dirty" guard inside the helper, returning the translated message and prompting `app-text-input` to render it.

## Standalone Step Form

`src/app/components/Organisms/create-step-form/create-step-form.component.ts` already used the same approach via `getControlError`. Keeping diary and step helpers in sync guarantees consistent copy and behaviour regardless of whether a step is created through the modal or the standalone form.

## Adding New Validations

1. Declare the validator(s) on the `FormControl` inside the relevant `FormGroup` builder.
2. Extend the helper to translate the new error key to user-facing copy (e.g., `invalidDate`).
3. Pass the helper through `[errorMessage]` on the UI component responsible for displaying the field.
4. Ensure the submission handler calls `markAllAsTouched()` so users receive feedback after attempting to submit.

Following this pattern keeps validation flows centralised and re-usable while letting design-system components remain presentation only.
