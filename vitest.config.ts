import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only는 react-server 조건이 아니면 import만 해도 throw한다.
      // 테스트(Node)에서는 Next 서버 번들과 같은 빈 모듈을 쓴다.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    server: { deps: { inline: ["@polar-sh/nextjs"] } },
    include: ["src/**/*.test.{ts,tsx}", "supabase/**/*.test.ts"],
    environment: "node",
  },
});
