import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Aset statis & berkas hasil generate -- bukan kode sumber aplikasi.
    // `public/draco/**` adalah decoder Draco milik three.js (vendor).
    "public/**",
    "compress-wisuda.js",
    "**/*.bak",
    // `components/ui/orbit-delivery-hero.tsx` adalah bundel three.js hasil
    // generate/decompile ribuan baris, bukan kode sumber aplikasi yang diedit manual.
    "components/ui/orbit-delivery-hero.tsx",
  ]),
]);

export default eslintConfig;
