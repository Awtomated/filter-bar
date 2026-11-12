import createCache from '@emotion/cache';

// Same as main-app's src/app/utils/createLayeredEmotionCache.js: MUI's CSS
// goes into the `mui` cascade layer, below Tailwind's `utilities` layer, so
// the playground stacks MUI, the reset and Tailwind exactly like the app.
const UNLAYERABLE_RULE = /^@(import|charset|namespace|layer)\b/i;

const wrapRuleInLayer = (rule, layer) =>
  UNLAYERABLE_RULE.test(rule) ? rule : `@layer ${layer}{${rule}}`;

export default function createLayeredEmotionCache(options, layer = 'mui') {
  const cache = createCache(options);
  const { sheet } = cache;

  class LayeredStyleSheet extends sheet.constructor {
    insert(rule) {
      super.insert(wrapRuleInLayer(rule, layer));
    }
  }

  cache.sheet = new LayeredStyleSheet({
    key: sheet.key,
    nonce: sheet.nonce,
    container: sheet.container,
    speedy: sheet.isSpeedy,
    prepend: sheet.prepend,
    insertionPoint: sheet.insertionPoint,
  });
  return cache;
}
