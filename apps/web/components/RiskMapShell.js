"use client";

import dynamic from "next/dynamic";
import MapSkeleton from "./MapSkeleton";

const RiskMapClient = dynamic(() => import("./RiskMapClient"), {
  ssr: false,
  loading: () => <MapSkeleton />
});

export default function RiskMapShell(props) {
  return <RiskMapClient {...props} />;
}

