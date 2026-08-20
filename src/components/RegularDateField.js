import dayjs from 'dayjs';
// dayjs ships no `exports` map for its plugins, so Node's strict ESM
// resolver (used when consumers load dist/index.mjs directly) can't resolve
// these extensionless — the explicit `.js` is required there even though it
// trips the airbnb import/extensions rule.
// eslint-disable-next-line import/extensions
import utc from 'dayjs/plugin/utc.js';
// eslint-disable-next-line import/extensions
import timezonePlugin from 'dayjs/plugin/timezone.js';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

function toCalendarDayInTz(input, tz) {
  if (!input) return null;
  const utcDate = dayjs.utc(input);
  return utcDate.isValid() ? dayjs.tz(utcDate.format('YYYY-MM-DD'), tz) : null;
}

// A date-only field: it only ever cares about the calendar day ("Y-M-D"),
// never a real instant. Values are serialized as literal UTC midnight of
// that day, matching the wire format the rest of the filter bar expects.
function RegularDateField({
  label,
  value,
  onChange,
  timezone,
  disabled,
  maxDate,
  minDate,
  fullWidth = true,
}) {
  const dateValue = toCalendarDayInTz(value, timezone);
  const dayjsMaxDate = toCalendarDayInTz(maxDate, timezone) ?? undefined;
  const dayjsMinDate = toCalendarDayInTz(minDate, timezone) ?? undefined;

  return (
    // `timezone` isn't a LocalizationProvider prop in this MUI X version —
    // timezone-correctness here comes entirely from toCalendarDayInTz's
    // explicit dayjs.tz() conversion above, not from the picker itself.
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={dateValue}
        disabled={disabled}
        format='DD/MM/YYYY'
        maxDate={dayjsMaxDate}
        minDate={dayjsMinDate}
        onChange={(newValue) => {
          if (newValue && dayjs.isDayjs(newValue) && newValue.isValid()) {
            onChange(dayjs.utc(newValue.format('YYYY-MM-DD')).toISOString());
          } else {
            onChange(null);
          }
        }}
        slotProps={{
          textField: { size: 'small', fullWidth, placeholder: 'dd/mm/yyyy' },
        }}
      />
    </LocalizationProvider>
  );
}

export default RegularDateField;
