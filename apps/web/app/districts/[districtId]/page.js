import { redirect } from "next/navigation";

export default async function DistrictRedirectPage({ params }) {
  const { districtId } = await params;
  redirect(`/en/districts/${districtId}`);
}
