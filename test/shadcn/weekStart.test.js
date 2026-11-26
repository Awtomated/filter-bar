import { fireEvent, render, screen } from '@testing-library/react';
import ChipEditor from '../../src/shadcn/components/ChipEditor';
import { shadcnDefaultLabels } from '../../src/shadcn/components/DynamicFilterBar';
import { getOperatorId } from '../../src/utils';
import { defaultLabels } from '../../src/tokens';

// The host passes the organisation's week start (main-app: orgTime); the
// range editor's "This Week" / "Last Week" follow it.

const labels = { ...defaultLabels, ...shadcnDefaultLabels };
const rangeOp = {
  label: 'Between',
  value: 'range',
  query_params: 'd__range',
  input_type: 'range',
  input_field: 'date',
};

function clickThisWeek(weekStart) {
  const onValue = jest.fn();
  const { unmount } = render(
    <ChipEditor
      fieldDef={{ name: 'd', label: 'Date', type: 'datetime', operators: [rangeOp] }}
      operatorId={getOperatorId(rangeOp)}
      value={null}
      mode='value'
      onModeChange={() => {}}
      onOperatorPick={() => {}}
      onValue={onValue}
      onDone={() => {}}
      choices={[]}
      choicesLoading={false}
      timezone='UTC'
      weekStart={weekStart}
      labels={labels}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'This Week' }));
  unmount();
  return onValue.mock.calls[onValue.mock.calls.length - 1][0];
}

describe('ChipEditor weekStart', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-11-12T12:00:00Z') })); // Thursday
  afterEach(() => jest.useRealTimers());

  it('Monday weeks when the host says so', () => {
    expect(clickThisWeek(1)).toEqual({
      start: '2026-11-09T00:00:00Z',
      end: '2026-11-15T23:59:59Z',
    });
  });

  it('Sunday weeks without the prop (older hosts)', () => {
    expect(clickThisWeek(undefined)).toEqual({
      start: '2026-11-08T00:00:00Z',
      end: '2026-11-14T23:59:59Z',
    });
  });
});
