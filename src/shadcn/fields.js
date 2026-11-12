import { getChoiceLabel, isMultiSelectionField, isSelectionField } from '../utils';
import { formatDay, formatRange } from './dates';
import { findChoice, hasOwnLabel } from './hooks/useChoices';

// Which editor a field's popover shows for the selected operator. Same rules
// as the MUI version (ValueInput / DynamicFilterBar): the operator's
// `input_field` decides, except that a selection field with a single
// operator always uses its choice list.
export function getEditorKind(fieldDef, op) {
  if (!fieldDef || !op) return 'text';
  if (op.input_type === 'none') return 'none';
  const hasChoices = Boolean(fieldDef.fetch_url) || Boolean(fieldDef.options?.length);
  const singleOperator = (fieldDef.operators ?? []).length <= 1;
  if (
    hasChoices &&
    (op.input_field === 'select' || (singleOperator && isSelectionField(fieldDef)))
  ) {
    return 'select';
  }
  if (op.input_field === 'date' || fieldDef.type === 'datetime') {
    return op.input_type === 'range' ? 'range' : 'date';
  }
  if (op.input_field === 'number') return 'number';
  return 'text';
}

export function isMultipleSelect(fieldDef, op) {
  if (op?.input_field === 'select') return op.input_type === 'multiple';
  return isMultiSelectionField(fieldDef);
}

// Whether a value can stay when the operator changes (e.g. "Contains" ->
// "Starts with" keeps the text; "Is" -> "Is any of" can't keep one choice).
export function sameEditor(fieldDef, opA, opB) {
  return (
    getEditorKind(fieldDef, opA) === getEditorKind(fieldDef, opB) &&
    isMultipleSelect(fieldDef, opA) === isMultipleSelect(fieldDef, opB)
  );
}

function choiceText(value, choices, fieldDef) {
  const full = findChoice(choices, value) ?? (hasOwnLabel(value) ? value : null);
  return full ? getChoiceLabel(full, fieldDef.selectConfig, fieldDef) : null;
}

// The chip's operator word: the operator label in lower case ("Is any of" ->
// "is any of"), except that a multi-select holding a single value reads
// "is" (Figma: "One value = is, two or more = is any of").
export function chipOperatorText(fieldDef, op, value, labels) {
  if (!op) return '';
  if (isMultipleSelect(fieldDef, op) && Array.isArray(value) && value.length === 1) {
    return labels.singleValueOperator;
  }
  return String(op.label ?? '').toLowerCase();
}

// The chip's value text. Returns `{ text, pending }`: `pending` is true when
// a choice's label isn't known yet (its list is still loading).
export function chipValueText({ fieldDef, op, value, choices, dateFormat }) {
  const kind = getEditorKind(fieldDef, op);
  if (kind === 'none') return { text: '', pending: false };
  if (kind === 'date') return { text: formatDay(value, dateFormat), pending: false };
  if (kind === 'range') return { text: formatRange(value), pending: false };
  if (kind === 'select') {
    const items = Array.isArray(value) ? value : [value];
    const texts = items.map((item) => choiceText(item, choices, fieldDef));
    if (texts.some((t) => t === null)) {
      return {
        text: items.map((item, i) => texts[i] ?? String(item?.id ?? '')).join(', '),
        pending: true,
      };
    }
    return { text: texts.join(', '), pending: false };
  }
  return { text: String(value ?? ''), pending: false };
}
