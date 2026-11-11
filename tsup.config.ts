import { defineConfig } from 'tsup';
export default defineConfig([
  { entry: ['src/index.ts'], format: ['esm', 'cjs'], dts: true, sourcemap: true, splitting: false, external: ['react', 'react-dom', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'], banner: { js: '"use client";' } },
  { entry: ['src/core.ts'], format: ['esm', 'cjs'], dts: true, sourcemap: true, splitting: false }
]);
