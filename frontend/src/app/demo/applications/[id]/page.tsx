"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, getDemoApplication, getDemoFitAnalysis } from "@/lib/api";
import { ColdStartGate } from "@/components/ColdStartGate";
import { ApplicationDetailView } from "@/components/ApplicationDetailView";
import type { ApplicationDetailResponse } from "@/lib/types";

function DemoApplicationDetailContent({ id }: { id: string }) {
  const [detail, setDetail] = useState<ApplicationDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDemoApplication(id)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link href="/demo" className="text-sm font-medium text-black underline dark:text-white">
        ← Back to demo dashboard
      </Link>
      <div className="mt-4">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {!error && !detail && <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>}
        {detail && (
          <ApplicationDetailView
            detail={detail}
            readOnly
            onRunFitAnalysis={() => getDemoFitAnalysis(id)}
          />
        )}
      </div>
    </main>
  );
}

export default function DemoApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <ColdStartGate>
      <DemoApplicationDetailContent id={id} />
    </ColdStartGate>
  );
}
