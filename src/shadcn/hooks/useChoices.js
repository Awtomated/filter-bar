import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyGrouping, extractAndResolveChoices, getChoiceId, resolveChoices } from '../../utils';

const IDLE = { status: 'idle', list: [] };

// One cache of fetched choice lists per bar, keyed by fetch URL: a field's
// popover and its chip (which needs labels for values that arrive as bare
// ids, e.g. built from URL params by the host app) share a single request,
// and reopening a popover doesn't refetch.
export function useChoicesStore(fetcher) {
  const cache = useRef(new Map());
  const mounted = useRef(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    (url) => {
      if (!url || cache.current.has(url)) return;
      const entry = { status: 'loading', list: [] };
      cache.current.set(url, entry);
      setVersion((v) => v + 1);
      Promise.resolve()
        .then(() => fetcher(url))
        .then((res) => {
          entry.status = 'ready';
          // Normalized only (full_name -> name); each field applies its own
          // transformChoices on top (see useFieldChoices).
          entry.list = extractAndResolveChoices(res);
        })
        .catch(() => {
          entry.status = 'error';
          entry.list = [];
        })
        .finally(() => {
          if (mounted.current) setVersion((v) => v + 1);
        });
    },
    [fetcher]
  );

  const get = useCallback((url) => cache.current.get(url) ?? IDLE, []);

  // `version` changes whenever an entry does, so consumers re-render.
  return useMemo(() => ({ load, get, version }), [load, get, version]);
}

// A field's choices: its static `options`, or its `fetch_url` list from the
// store, run through `fieldProps[field].fieldDef.select.transformChoices` and
// grouped when grouping is configured — the same pipeline as the MUI version.
// `enabled` triggers the fetch (popover open, or labels needed by the chip).
export function useFieldChoices(fieldDef, store, enabled) {
  const url = fieldDef?.options?.length ? null : fieldDef?.fetch_url;
  useEffect(() => {
    if (enabled && url) store.load(url);
  }, [enabled, url, store]);

  const entry = url ? store.get(url) : IDLE;
  const fetched = entry.list;

  const choices = useMemo(() => {
    if (!fieldDef) return [];
    const raw = url ? fetched : fieldDef.options ?? [];
    return applyGrouping(
      resolveChoices(raw, fieldDef.selectConfig, fieldDef),
      fieldDef.selectConfig
    ).choices;
  }, [url, fetched, fieldDef]);

  return {
    choices,
    loading: Boolean(url) && (entry.status === 'loading' || (enabled && entry.status === 'idle')),
  };
}

// Finds the full choice for a stored value (which may be just `{ id }`).
// Static options also match on `value`, since URL params carry option values.
export function findChoice(choices, value) {
  if (!value) return null;
  const id = getChoiceId(value);
  return (
    choices.find((c) => getChoiceId(c) === id) ??
    choices.find((c) => c.value !== undefined && String(c.value) === String(value.value ?? id)) ??
    null
  );
}

export function hasOwnLabel(choice) {
  return Boolean(
    choice &&
      (choice.label ||
        choice.title ||
        choice.name ||
        choice.full_name ||
        choice.subtitle ||
        choice.language_code)
  );
}
