"use client";

import dynamic from "next/dynamic";
import MapSkeleton from "./MapSkeleton";

const MobileLiveMapV3Client = dynamic(() => import("./MobileLiveMapV3Client"), {
  ssr: false,
  loading: () => <MapSkeleton />
});

export default function MobileLiveMapV3(props) {
  return <MobileLiveMapV3Client {...props} />;
}
