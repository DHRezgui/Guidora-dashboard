import path from "path";
import { fileURLToPath } from "url";

const dashboardRoot = path.dirname(fileURLToPath(import.meta.url));

/** base = racine projet ; évite le scan Tailwind v4 depuis `/` en Docker. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: dashboardRoot,
    },
  },
};

export default config;
