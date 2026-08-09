import { requirePermission } from "@/lib/auth/session";
import { listModalities, listLanguages } from "@/lib/services/reference";
import { isConfigured } from "@/lib/services/integrations";
import { createHealerAction } from "@/lib/actions/healers";
import { PageHeader } from "@/components/admin/ui";
import { HealerForm } from "@/components/admin/healer-form";

export const metadata = { title: "Add healer · HealerJi Operations" };
export const dynamic = "force-dynamic";

export default async function NewHealerPage() {
  await requirePermission("healers.manage");

  const [modalities, languages] = await Promise.all([listModalities(), listLanguages()]);

  return (
    <>
      <PageHeader
        eyebrow="Healers"
        title="Add a healer"
        description="Creates the profile. Sending a portal invitation is a separate, deliberate step once the profile is ready."
      />
      <HealerForm
        action={createHealerAction}
        submitLabel="Create healer"
        cloudinaryConfigured={isConfigured("cloudinary")}
        options={{
          modalities: (modalities.ok ? modalities.data : []).map((m) => ({ value: m.slug, label: m.name })),
          languages: (languages.ok ? languages.data : []).map((l) => ({ value: l.code, label: l.name })),
        }}
        initial={{
          modalitySlugs: [],
          languageCodes: [],
          sessionKinds: ["audio", "video"],
          acceptingBookings: false,
        }}
      />
    </>
  );
}
