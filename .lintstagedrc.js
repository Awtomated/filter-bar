module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --quiet --fix', 'prettier --write'],
  '*.{test,spec}.{js,jsx,ts,tsx}': ['jest --bail --passWithNoTests'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
  '*.{css,scss,less}': ['prettier --write'],
};
