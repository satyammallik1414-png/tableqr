"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AccessDisabled } from "@/components/shared/AccessDisabled";

function DisabledContent() {
  const searchParams = useSearchParams();
  const featureKey = searchParams.get("feature");
  const reason = searchParams.get("reason");
  const effectiveStatus = searchParams.get("status");

  return (
    <AccessDisabled
      featureKey={featureKey}
      reason={reason}
      effectiveStatus={effectiveStatus}
    />
  );
}

export default function AccessDisabledPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500">Loading verification...</div>}>
      <DisabledContent />
    </Suspense>
  );
}
