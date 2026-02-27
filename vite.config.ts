import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const normalizeBase = (value: string) => {
  if (!value || value === '/') return '/';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const defaultBase = repositoryName ? `/${repositoryName}/` : '/';

export default defineConfig({
  plugins: [vue()],
  base: normalizeBase(process.env.VITE_BASE_PATH ?? defaultBase),
});
