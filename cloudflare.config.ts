import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "ostaad-erp",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-29",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      VINEXT_KV_CACHE: bindings.kv({ id: "d972be6bea5142918dfb46fb89d84bac" }),
      DB: bindings.d1({ id: "d7dbcaf9-68e4-4869-a4a2-8b939f8b14d0" }),
      STORAGE: bindings.r2({ bucketName: "ostaad-erp-storage" }),
    },
  }),
});
