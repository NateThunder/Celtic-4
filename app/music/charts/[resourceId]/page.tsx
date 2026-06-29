import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "../../../components/SiteHeader";
import {
  getAllChartResourceParams,
  getChartResourceDetail,
  isResourceType,
} from "../chartResources";
import styles from "../charts.module.css";
import ChartDetailPageClient from "./ChartDetailPageClient";

type PageProps = {
  params: Promise<{ resourceId: string }>;
  searchParams: Promise<{ resource?: string | string[] }>;
};

function getRequestedResourceType(resource: string | string[] | undefined) {
  const value = Array.isArray(resource) ? resource[0] : resource;
  return isResourceType(value) ? value : undefined;
}

export function generateStaticParams() {
  return getAllChartResourceParams();
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { resourceId } = await params;
  const { resource } = await searchParams;
  const detail = getChartResourceDetail(resourceId, getRequestedResourceType(resource));

  if (!detail) {
    return {
      title: "Chart Not Found | Celtic Worship",
    };
  }

  const title = detail.kind === "song" ? detail.song.songTitle : detail.album.title;

  return {
    title: `${title} ${detail.resourceType} | Celtic Worship`,
    description: `Preview and purchase ${title} ${detail.resourceType} from Celtic Worship.`,
  };
}

export default async function ChartDetailPage({ params, searchParams }: PageProps) {
  const { resourceId } = await params;
  const { resource } = await searchParams;
  const requestedResourceType = getRequestedResourceType(resource);
  const detail = getChartResourceDetail(resourceId, requestedResourceType);

  if (!detail) notFound();

  return (
    <div className="site-shell">
      <SiteHeader hideMobileSocials />
      <main className={styles.detailPage}>
        <ChartDetailPageClient
          key={`${resourceId}-${requestedResourceType ?? "default"}`}
          resourceId={resourceId}
          initialResourceType={requestedResourceType}
        />
      </main>
    </div>
  );
}
