import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    inlineCss: true,
  },
  turbopack: {
    // Next 내장 polyfill(at, flat, fromEntries, trimStart 등)은 지원 브라우저(Chrome 111+, Safari 16.4+)에
    // 이미 있다. 예외인 URL.canParse(Chrome 120+, Safari 17+)는 앱 코드에서 쓰지 않으므로 빈 모듈로 바꾼다.
    // app-globals.js가 상대 경로로 import해서 resolveAlias로는 잡히지 않아, 해석된 파일 경로로 맞춘다.
    rules: {
      "**/next/dist/build/polyfills/polyfill-module.js": {
        loaders: [path.resolve("scripts/empty-module-loader.cjs")],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
