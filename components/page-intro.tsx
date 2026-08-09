import { Container } from "@/components/ui/container";

export function PageIntro({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede: string;
}) {
  return (
    <Container>
      <header className="max-w-2xl pt-36">
        <p className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-mist-500">{eyebrow}</p>
        <h1 className="mt-3 text-4xl md:text-5xl">{title}</h1>
        <p className="mt-5 text-lg text-ink-600 dark:text-mist-400">{lede}</p>
      </header>
    </Container>
  );
}
