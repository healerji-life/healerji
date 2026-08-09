import { requireHealer } from "@/lib/auth/session";
import { getHealerById } from "@/lib/services/healers";
import { listLanguages, listModalities, getHealerRelations } from "@/lib/services/reference";
import { isConfigured } from "@/lib/services/integrations";
import { HealerProfileForm } from "@/components/healer/profile-form";
import { formatPaise } from "@/lib/format";

export const metadata = { title: "Your profile · HealerJi" };
export const dynamic = "force-dynamic";

export default async function HealerProfilePage() {
  const viewer = await requireHealer();

  const [healer, languages, modalities, relations] = await Promise.all([
    getHealerById(viewer.healerId),
    listLanguages(),
    listModalities(),
    getHealerRelations(viewer.healerId),
  ]);

  if (!healer.ok) {
    return (
      <>
        <h1 className="font-display text-[1.75rem]">Your profile</h1>
        <p role="alert" className="mt-4 rounded-sm bg-error-50 px-4 py-3 text-sm text-error-700">
          We couldn&rsquo;t load your profile just now. Please try again in a moment.
        </p>
      </>
    );
  }

  const h = healer.data;
  const verifiedCount =
    Number(h.verified_identity) + Number(h.verified_credentials) + Number(h.verified_interviewed);

  return (
    <>
      <header className="pb-6">
        <h1 className="font-display text-[1.75rem] leading-tight">Your profile</h1>
        <p className="mt-1.5 text-sm text-ink-600 dark:text-mist-400">
          This is what customers read before they book you. Changes appear on the
          website as soon as you save.
        </p>
      </header>

      <HealerProfileForm
        healer={h}
        cloudinaryConfigured={isConfigured("cloudinary")}
        options={{
          languages: (languages.ok ? languages.data : []).map((l) => ({ value: l.code, label: l.name })),
          modalities: (modalities.ok ? modalities.data : []).map((m) => ({ value: m.slug, label: m.name })),
        }}
        initial={{
          languageCodes: relations.ok ? relations.data.languageCodes : [],
          modalitySlugs: relations.ok ? relations.data.modalitySlugs : [],
        }}
      />

      {/* Read-only, and explained. A healer should be able to see what HealerJi
          has recorded about them even though they cannot change it. */}
      <section className="mt-8 rounded-lg border border-dashed border-mist-300 p-5 dark:border-night-800">
        <h2 className="font-display text-[1.0625rem]">Set by HealerJi</h2>
        <p className="mt-1 text-sm text-ink-600 dark:text-mist-400">
          These are ours to maintain, so a profile can&rsquo;t claim something the
          panel hasn&rsquo;t checked. Ask us if any of it looks wrong.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-mist-500">Session rate</dt>
            <dd className="mt-1 text-sm">{formatPaise(h.price_paise)} for 45 minutes</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-mist-500">Verification</dt>
            <dd className="mt-1 text-sm">
              {verifiedCount === 3 ? "Fully verified" : `${verifiedCount} of 3 checks complete`}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-mist-500">Years of practice</dt>
            <dd className="mt-1 text-sm">{h.years}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-mist-500">Profile address</dt>
            <dd className="mt-1 break-all text-sm">/healers/{h.slug}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
