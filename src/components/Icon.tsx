import type { SVGProps } from "react";

// lucide-react의 Icon은 "use client"라, 서버 컴포넌트에서 쓰면 아이콘마다 클라이언트 청크와 RSC 데이터가 된다.
// 공개 페이지(랜딩·로그인)에서 쓰는 아이콘만 서버에서 같은 <svg>로 그린다.
// path 데이터는 lucide-react v1.69.0에서 옮겼다. Lucide, ISC License, Copyright (c) Lucide Contributors.
const icons = {
  check: [["path", { d: "M20 6 9 17l-5-5" }]],
  "shield-check": [
    ["path", { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }],
    ["path", { d: "m9 12 2 2 4-4" }],
  ],
  minus: [["path", { d: "M5 12h14" }]],
  lock: [
    ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }],
    ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }],
  ],
} as const;

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: keyof typeof icons;
  size?: number;
  strokeWidth?: number;
};

export function Icon({ name, size = 24, strokeWidth = 2, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={["lucide", `lucide-${name}`, className].filter(Boolean).join(" ")}
      {...props}
    >
      {icons[name].map(([Tag, attrs], index) => <Tag key={index} {...attrs} />)}
    </svg>
  );
}
