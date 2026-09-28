import { listApplications } from "@/lib/applications";
import { ApplicationsView } from "@/components/ApplicationsView";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage(props: PageProps<"/applications">) {
  const { open } = await props.searchParams;
  const apps = listApplications();
  return <ApplicationsView apps={apps} initialOpenId={typeof open === "string" ? Number(open) : null} />;
}
