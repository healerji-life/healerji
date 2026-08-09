import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/reveal";
import { FounderNote } from "@/components/founder-note";

const steps = [
  {
    n: "01",
    title: "Tell us what you're carrying",
    body: "Pick the area that's heavy — health, relationships, career, money, or emotions — along with your preferred language, time, and whether you'd rather speak with a female or male healer.",
  },
  {
    n: "02",
    title: "Meet your matched healer",
    body: "We suggest certified healers who fit your concern and preferences. Read their profile, see their practices and experience, and book a session over chat, audio, or video.",
  },
  {
    n: "03",
    title: "Heal, and come back when you need to",
    body: "Sessions, live workshops, and community are all here when you return. Many people start with one conversation and build a rhythm from there.",
  },
];

/**
 * The sequence, told as a descent rather than a row. Each step is
 * offset from the last so the eye steps down the page the way the
 * process actually moves — and the founder's voice closes it, because
 * this is the part where people decide whether to trust us.
 */
export function HowItWorks() {
  return (
    <section className="py-32 md:py-52" aria-labelledby="how-heading">
      <Container>
        <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">
          How it works
        </p>
        <h2 id="how-heading" className="mt-5 max-w-[20ch] text-3xl md:text-4xl">
          Three steps from heavy to held.
        </h2>

        <ol className="mt-20 space-y-20 md:space-y-28">
          {steps.map((s, i) => (
            <Reveal
              as="li"
              key={s.n}
              className="grid gap-5 md:grid-cols-12 md:items-baseline"
            >
              <span
                className="font-display text-sm tabular-nums text-mist-500 md:col-span-2"
                aria-hidden
              >
                {s.n}
              </span>
              <h3
                className={
                  i === 1
                    ? "text-2xl md:col-span-4 md:col-start-4 md:text-3xl"
                    : i === 2
                      ? "text-2xl md:col-span-4 md:col-start-5 md:text-3xl"
                      : "text-2xl md:col-span-4 md:col-start-3 md:text-3xl"
                }
              >
                {s.title}
              </h3>
              <p className="max-w-[38ch] text-ink-600 dark:text-mist-400 md:col-span-4 md:col-start-9">
                {s.body}
              </p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-24 md:mt-32">
          <FounderNote>
            &ldquo;No one should have to explain their pain twice, or in a
            language that isn&rsquo;t theirs. That is the whole reason this
            platform exists.&rdquo;
          </FounderNote>
        </Reveal>
      </Container>
    </section>
  );
}
