"use client";

import dynamic from "next/dynamic";

// The room is fully client-side (Canvas shard field, localStorage, wallet). Load
// it without SSR so the glass renders only in the browser.
const RoomWorld = dynamic(
  () => import("@/components/room/RoomWorld").then((m) => m.RoomWorld),
  { ssr: false },
);

export default function Page() {
  return <RoomWorld />;
}
