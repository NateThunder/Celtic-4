import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: [{
      find: "#stem-storage",
      replacement: fileURLToPath(new URL("./cloudflare/stemStorage.ts", import.meta.url)),
    }, {
      find: "#product-catalog",
      replacement: fileURLToPath(new URL("./cloudflare/productCatalog.ts", import.meta.url)),
    }, {
      find: "#product-catalog-sync",
      replacement: fileURLToPath(new URL("./cloudflare/productCatalogSync.ts", import.meta.url)),
    }],
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
