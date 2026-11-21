import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    inlineCss: true,
  },
  turbopack: {
    // 지원 브라우저(Chrome 111+, Safari 16.4+)에 이미 있는 기능의 polyfill이라
    // Next에 들어 있는 0바이트 모듈로 바꾼다.
    resolveAlias: {
      "next/dist/build/polyfills/polyfill-module": "next/dist/compiled/server-only/empty.js",
      "next/dist/esm/build/polyfills/polyfill-module": "next/dist/compiled/server-only/empty.js",
    },
  },
};

export default nextConfig;
