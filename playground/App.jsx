import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';
// Imported from source (not dist) so component edits hot-reload.
import { CacheProvider } from '@emotion/react';
import { DynamicFilterBar, FilterToggleButton } from '../src';
import {
  DynamicFilterBar as ShadcnDynamicFilterBar,
  FilterToggleButton as ShadcnFilterToggleButton,
} from '../src/shadcn';
import { createMockFetcher } from './mockApi';
import createLayeredEmotionCache from './muiLayer';
import DesignCheck from './DesignCheck';
import { dayToIso, todayIn } from '../src/shadcn/dates';
import { applyQueryParams } from './queryEngine';
import { buildRoutes, scenarios } from './scenarios';
import { contactDisplayValues, contacts } from './sampleData';

const TIMEZONES = [
  { value: '', label: 'Browser default' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (+05:30)' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (+13)' },
];
const DATE_FORMATS = ['MM/DD/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY'];
const LATENCIES = [0, 400, 1500, 4000];
// MUI in the `mui` cascade layer, like main-app (App.js).
const muiCache = createLayeredEmotionCache({ key: 'muiltr' });
// The MUI version takes dayjs patterns, the shadcn version date-fns ones.
const DATE_FNS_FORMATS = {
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'DD-MM-YYYY': 'dd-MM-yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
  'DD/MM/YYYY': 'dd/MM/yyyy',
};
// Each version's own default for maxQuickChips (shadcn: pinned empty chips).
const DEFAULT_CHIPS = { mui: 5, shadcn: 2 };

function Json({ value }) {
  return (
    <Box
      component='pre'
      sx={{
        m: 0,
        p: 1.5,
        borderRadius: 1,
        bgcolor: 'action.hover',
        fontSize: 13,
        overflow: 'auto',
        maxHeight: 420,
      }}
    >
      {value === undefined ? '—' : JSON.stringify(value, null, 2)}
    </Box>
  );
}

function ContactsTable({ rows }) {
  const day = (iso) => (iso ? iso.slice(0, 10) : '—');
  return (
    <TableContainer sx={{ maxHeight: 460 }}>
      <Table size='small' stickyHeader>
        <TableHead>
          <TableRow>
            {[
              '#',
              'Name',
              'Email',
              'Phone',
              'Age',
              'Active',
              'Status',
              'Owner',
              'Country',
              'Company',
              'Language',
              'Tags',
              'Created',
              'Last contacted',
              'Due date',
            ].map((h) => (
              <TableCell key={h} sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((c) => {
            const display = contactDisplayValues(c);
            return (
              <TableRow key={c.id} hover>
                <TableCell>{c.id}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{c.phone ?? '—'}</TableCell>
                <TableCell>{c.age}</TableCell>
                <TableCell>{c.is_active ? 'Yes' : 'No'}</TableCell>
                <TableCell>{c.status}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{display.owner}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{display.country}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{c.company.title}</TableCell>
                <TableCell>{display.language}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{c.tags.join(', ') || '—'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{day(c.created_at)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{day(c.last_contacted)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{day(c.due_date)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function App() {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [mode, setMode] = useState('light');
  const [latency, setLatency] = useState(400);
  const [ui, setUi] = useState('shadcn');
  const [maxQuickChips, setMaxQuickChips] = useState(DEFAULT_CHIPS.shadcn);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState(null);
  const [dateFormat, setDateFormat] = useState(DATE_FORMATS[0]);
  const [timezone, setTimezone] = useState('');
  const [open, setOpen] = useState(true);
  const [mountKey, setMountKey] = useState(0);
  const [tab, setTab] = useState('params');

  const [lastParams, setLastParams] = useState(null);
  const [applyHistory, setApplyHistory] = useState([]);
  const [filtersState, setFiltersState] = useState([]);
  const [networkLog, setNetworkLog] = useState([]);

  const scenario = scenarios.find((s) => s.id === scenarioId);
  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode },
        // main-app's MUI theme uses the design tokens' sans font (Inter).
        typography: { fontFamily: 'var(--font-family-sans)' },
      }),
    [mode]
  );

  // The shadcn version follows the app's `.dark` class (tokens.css).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  // The fetcher must keep a stable identity: the choice editors list it as an
  // effect dependency, so a new function per render would refetch endlessly.
  const latencyRef = useRef(latency);
  latencyRef.current = latency;
  const fetcher = useMemo(
    () =>
      createMockFetcher({
        routes: buildRoutes(),
        getLatency: () => latencyRef.current,
        onLog: (entry) => setNetworkLog((log) => [entry, ...log].slice(0, 100)),
      }),
    []
  );

  function resetOutputs() {
    setLastParams(null);
    setApplyHistory([]);
    setFiltersState([]);
    setNetworkLog([]);
  }

  function remount() {
    resetOutputs();
    setMountKey((k) => k + 1);
  }

  function selectScenario(id) {
    setScenarioId(id);
    setDialogOpen(false);
    remount();
  }

  function selectUi(next) {
    setUi(next);
    setMaxQuickChips(DEFAULT_CHIPS[next]);
    remount();
  }

  function handleApply(params) {
    setLastParams(params);
    setApplyHistory((h) => [{ at: new Date(), params }, ...h].slice(0, 50));
  }

  function renderBar(extra = {}) {
    const key = `${ui}-${scenarioId}-${mountKey}`;
    const common = {
      filterApiUrl: scenario.filterApiUrl,
      fetcher,
      onApply: handleApply,
      onFiltersChange: setFiltersState,
      maxQuickChips,
      timezone: timezone || undefined,
    };
    if (ui === 'mui') {
      return <DynamicFilterBar key={key} {...common} dateFormat={dateFormat} {...scenario.props} />;
    }
    return (
      <ShadcnDynamicFilterBar
        key={key}
        {...common}
        dateFormat={DATE_FNS_FORMATS[dateFormat]}
        {...scenario.props}
        {...scenario.shadcnProps}
        {...extra}
      />
    );
  }

  const toggleButton =
    ui === 'mui' ? (
      <FilterToggleButton active={open} onClick={() => setOpen((v) => !v)} />
    ) : (
      <ShadcnFilterToggleButton
        active={open}
        label='Filter'
        count={filtersState.length}
        onClick={() => setOpen((v) => !v)}
      />
    );

  const { rows, unhandled } = applyQueryParams(contacts, lastParams ?? {});
  const queryString = lastParams ? new URLSearchParams(lastParams).toString() : '';

  return (
    <CacheProvider value={muiCache}>
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '300px 1fr' },
            minHeight: '100vh',
          }}
        >
          {/* ---------------- Sidebar ---------------- */}
          <Paper
            square
            elevation={0}
            sx={{ borderRight: { md: 1 }, borderColor: 'divider', p: 2, overflow: 'auto' }}
          >
            <Typography variant='h6'>Filter Bar Playground</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              Renders <code>src/</code> directly with a mock API.
            </Typography>

            <Typography variant='overline'>Scenarios</Typography>
            <List dense disablePadding sx={{ mb: 2 }}>
              {scenarios.map((s, i) => (
                <ListItemButton
                  key={s.id}
                  selected={s.id === scenarioId}
                  onClick={() => selectScenario(s.id)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText primary={`${i + 1}. ${s.title}`} />
                </ListItemButton>
              ))}
            </List>

            <Divider sx={{ mb: 2 }} />
            <Typography variant='overline'>Props &amp; environment</Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                select
                label='Bar UI'
                size='small'
                value={ui}
                onChange={(e) => selectUi(e.target.value)}
              >
                <MenuItem value='shadcn'>shadcn (@awtomated/filter-bar/shadcn)</MenuItem>
                <MenuItem value='mui'>MUI (@awtomated/filter-bar)</MenuItem>
              </TextField>
              <TextField
                label='maxQuickChips'
                type='number'
                size='small'
                value={maxQuickChips}
                onChange={(e) => setMaxQuickChips(Math.max(0, Number(e.target.value)))}
              />
              <TextField
                select
                label='dateFormat'
                size='small'
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                {DATE_FORMATS.map((f) => (
                  <MenuItem key={f} value={f}>
                    {f}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label='timezone'
                size='small'
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
              >
                {TIMEZONES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label='Mock network latency'
                size='small'
                value={latency}
                onChange={(e) => setLatency(Number(e.target.value))}
              >
                {LATENCIES.map((ms) => (
                  <MenuItem key={ms} value={ms}>
                    {ms} ms
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    checked={mode === 'dark'}
                    onChange={(e) => setMode(e.target.checked ? 'dark' : 'light')}
                  />
                }
                label='Dark theme'
              />
              <Button variant='outlined' onClick={remount}>
                Remount bar (reset state)
              </Button>
            </Stack>
          </Paper>

          {/* ---------------- Main ---------------- */}
          <Box sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}>
            <Typography variant='h5'>{scenario.title}</Typography>
            <Typography color='text.secondary' sx={{ mb: 1 }}>
              {scenario.description}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Schema: <code>{scenario.filterApiUrl}</code>
            </Typography>

            {scenario.timezoneInfo &&
              (() => {
                const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const zone = timezone || browserZone;
                const today = dayToIso(todayIn(zone), zone);
                return (
                  <Alert severity='warning' sx={{ mt: 1.5 }}>
                    Bar timezone: <b>{zone}</b>
                    {!timezone && ' (browser default)'} · today there: <b>{today.slice(0, 10)}</b> ·
                    "Today" sends <code>{today}</code> · your browser ({browserZone}):{' '}
                    {dayToIso(todayIn(browserZone), browserZone).slice(0, 10)}
                  </Alert>
                );
              })()}

            <Paper variant='outlined' sx={{ p: 2, my: 2 }}>
              <Typography variant='subtitle2' sx={{ mb: 1 }}>
                What to check
              </Typography>
              <Box component='ul' sx={{ m: 0, pl: 2.5 }}>
                {((ui === 'shadcn' && scenario.shadcnChecklist) || scenario.checklist).map(
                  (item) => (
                    <Typography component='li' variant='body2' key={item} sx={{ mb: 0.5 }}>
                      {item}
                    </Typography>
                  )
                )}
              </Box>
            </Paper>

            {/* The component under test, wired up like the README example */}
            <Paper variant='outlined' sx={{ p: 2, mb: 2 }}>
              {scenario.inDialog ? (
                <Button variant='contained' onClick={() => setDialogOpen(true)}>
                  Open dialog with the bar
                </Button>
              ) : (
                <Stack direction='row' spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                  {toggleButton}
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 40,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {open && renderBar()}
                  </Box>
                </Stack>
              )}
            </Paper>

            {scenario.inDialog && (
              <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth='md'
                fullWidth
              >
                <DialogTitle>Bar inside an MUI Dialog</DialogTitle>
                <DialogContent ref={setDialogContent} sx={{ minHeight: 320 }}>
                  <Stack direction='row' spacing={1.5} sx={{ alignItems: 'flex-start', pt: 1 }}>
                    {toggleButton}
                    {open && renderBar({ portalContainer: dialogContent })}
                  </Stack>
                </DialogContent>
              </Dialog>
            )}

            <Paper variant='outlined'>
              <Tabs
                value={tab}
                onChange={(e, v) => setTab(v)}
                variant='scrollable'
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab value='params' label='onApply params' />
                <Tab value='rows' label={`Matching contacts (${rows.length}/${contacts.length})`} />
                <Tab value='filters' label={`Filter state (${filtersState.length})`} />
                <Tab value='network' label={`Network (${networkLog.length})`} />
                <Tab value='history' label={`onApply calls (${applyHistory.length})`} />
                <Tab value='design' label='Design check' />
              </Tabs>
              <Box sx={{ p: 2 }}>
                {tab === 'params' && (
                  <Stack spacing={1.5}>
                    {lastParams === null ? (
                      <Alert severity='info'>onApply has not been called yet.</Alert>
                    ) : (
                      <>
                        <Typography variant='body2'>
                          Query string: <code>{queryString ? `?${queryString}` : '(empty)'}</code>
                        </Typography>
                        <Json value={lastParams} />
                      </>
                    )}
                  </Stack>
                )}

                {tab === 'rows' && (
                  <Stack spacing={1.5}>
                    {unhandled.length > 0 && (
                      <Alert severity='warning'>
                        Params not understood by the mock backend (ignored):{' '}
                        {unhandled.map((p) => (
                          <Chip key={p} label={p} size='small' sx={{ ml: 0.5 }} />
                        ))}
                      </Alert>
                    )}
                    <ContactsTable rows={rows} />
                  </Stack>
                )}

                {tab === 'filters' && <Json value={filtersState} />}

                {tab === 'network' && (
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Time</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>URL</TableCell>
                        <TableCell align='right'>ms</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {networkLog.map((entry, i) => (
                        <TableRow key={i}>
                          <TableCell>{entry.at.toLocaleTimeString()}</TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={entry.status}
                              color={entry.status === 200 ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            <code>{entry.url}</code>
                          </TableCell>
                          <TableCell align='right'>{entry.ms}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {tab === 'design' && <DesignCheck mode={mode} />}

                {tab === 'history' && (
                  <Json
                    value={applyHistory.map((h) => ({
                      at: h.at.toLocaleTimeString(),
                      params: h.params,
                    }))}
                  />
                )}
              </Box>
            </Paper>
          </Box>
        </Box>
      </ThemeProvider>
    </CacheProvider>
  );
}
