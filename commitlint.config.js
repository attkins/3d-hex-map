/**
 * Conventional Commits with a fixed list of scopes.
 * Every commit needs a scope, so the changelog stays easy to scan.
 * Format: type(scope): subject
 */
export const scopes = [
  'game', // rules, state, economy, commands, computer opponents
  'view', // everything you see: dome, scene, lights, model loading, HUD, input
  'assets', // blender sources, glb files, textures
  'tooling', // build, dependencies, lint, hooks, CI, helper scripts
  'docs', // readme, roadmap, todos
  'release', // version bumps and changelog
];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'scope-enum': [2, 'always', scopes],
    'scope-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 72],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'body-max-line-length': [2, 'always', 100],
  },
};
