import {
  chipOperatorText,
  chipValueText,
  getEditorKind,
  isMultipleSelect,
  sameEditor,
} from '../../src/shadcn/fields';
import { findChoice, hasOwnLabel } from '../../src/shadcn/hooks/useChoices';

const op = (input_type, input_field, extra = {}) => ({
  label: 'Op',
  value: 'v',
  query_param: 'q',
  input_type,
  input_field,
  ...extra,
});

describe('getEditorKind', () => {
  it('follows the operator', () => {
    const field = { operators: [op('single', 'text'), op('single', 'select')], fetch_url: '/x/' };
    expect(getEditorKind(field, op('none', null))).toBe('none');
    expect(getEditorKind(field, op('single', 'select'))).toBe('select');
    expect(getEditorKind(field, op('single', 'text'))).toBe('text');
    expect(getEditorKind({ operators: [] }, op('single', 'number'))).toBe('number');
    expect(getEditorKind({ operators: [] }, op('single', 'date'))).toBe('date');
    expect(getEditorKind({ operators: [] }, op('range', 'date'))).toBe('range');
    expect(getEditorKind({ type: 'datetime', operators: [] }, op('single', 'text'))).toBe('date');
  });

  it('uses the choice list for a single-operator selection field', () => {
    const field = { options: [{ id: 1 }], operators: [op('single', 'text')] };
    expect(getEditorKind(field, field.operators[0])).toBe('select');
  });

  it('falls back to text without a field or operator', () => {
    expect(getEditorKind(null, null)).toBe('text');
  });

  it('a select operator without choices is a text field', () => {
    expect(getEditorKind({ operators: [op('single', 'select')] }, op('single', 'select'))).toBe(
      'text'
    );
  });
});

describe('isMultipleSelect / sameEditor', () => {
  it('reads single/multi from the operator, else from the default operator', () => {
    expect(isMultipleSelect({}, op('multiple', 'select'))).toBe(true);
    expect(isMultipleSelect({}, op('single', 'select'))).toBe(false);
    const field = {
      default_operator: 'in',
      operators: [{ ...op('multiple', 'select'), value: 'in' }],
    };
    expect(isMultipleSelect(field, op('single', 'text'))).toBe(true);
  });

  it('compares editors', () => {
    const field = { operators: [], fetch_url: '/x/' };
    expect(sameEditor(field, op('single', 'text'), op('single', 'text'))).toBe(true);
    expect(sameEditor(field, op('single', 'select'), op('multiple', 'select'))).toBe(false);
    const plain = { operators: [op('single', 'text'), op('single', 'date')] };
    expect(sameEditor(plain, op('single', 'text'), op('single', 'date'))).toBe(false);
  });
});

describe('chip text', () => {
  const labels = { singleValueOperator: 'is' };
  const multiField = { operators: [op('multiple', 'select')], fetch_url: '/x/' };
  const multiOp = { ...op('multiple', 'select'), label: 'Is any of' };

  it('lower-cases the operator and reads "is" for one value of a multi-select', () => {
    expect(chipOperatorText(multiField, multiOp, [{ id: 1 }, { id: 2 }], labels)).toBe('is any of');
    expect(chipOperatorText(multiField, multiOp, [{ id: 1 }], labels)).toBe('is');
    expect(chipOperatorText(multiField, null, null, labels)).toBe('');
  });

  it('joins choice labels and resolves bare ids from the choices', () => {
    const choices = [
      { id: 1, label: 'Lead', value: 'lead' },
      { id: 2, label: 'Customer', value: 'customer' },
    ];
    expect(
      chipValueText({ fieldDef: multiField, op: multiOp, value: [{ id: 1 }, { id: 2 }], choices })
    ).toEqual({ text: 'Lead, Customer', pending: false });
  });

  it('marks labels as pending while the choices are unknown', () => {
    expect(
      chipValueText({ fieldDef: multiField, op: multiOp, value: [{ id: 7 }], choices: [] })
    ).toEqual({ text: '7', pending: true });
    expect(chipValueText({ fieldDef: multiField, op: multiOp, value: [{}], choices: [] })).toEqual({
      text: '',
      pending: true,
    });
  });

  it('formats dates, ranges, none and text', () => {
    const fieldDef = { operators: [] };
    expect(
      chipValueText({
        fieldDef,
        op: op('single', 'date'),
        value: '2026-11-12T00:00:00.000Z',
        dateFormat: 'd MMM',
      })
    ).toEqual({ text: '12 Nov', pending: false });
    expect(
      chipValueText({
        fieldDef,
        op: op('range', 'date'),
        value: { start: '2026-11-01T00:00:00.000Z', end: '2026-11-15T00:00:00.000Z' },
      }).text
    ).toBe('1–15 Nov');
    expect(chipValueText({ fieldDef, op: op('none', null), value: null }).text).toBe('');
    expect(chipValueText({ fieldDef, op: op('single', 'text'), value: 'an' }).text).toBe('an');
    expect(chipValueText({ fieldDef, op: op('single', 'text'), value: undefined }).text).toBe('');
  });
});

describe('choice lookup', () => {
  it('finds by id, then by option value', () => {
    const choices = [{ id: 1, label: 'Yes', value: 'true' }];
    expect(findChoice(choices, { id: 1 })).toBe(choices[0]);
    expect(findChoice(choices, { id: 'true' })).toBe(choices[0]);
    expect(findChoice(choices, { id: 9, value: 'true' })).toBe(choices[0]);
    expect(findChoice(choices, { id: 9 })).toBeNull();
    expect(findChoice(choices, null)).toBeNull();
  });

  it('knows when a value carries its own label', () => {
    expect(hasOwnLabel({ id: 1 })).toBe(false);
    expect(hasOwnLabel({ id: 1, full_name: 'A' })).toBe(true);
    expect(hasOwnLabel(null)).toBe(false);
  });
});
