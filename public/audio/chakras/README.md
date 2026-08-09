# Chanted seed-sound recordings

The player in `components/ui/seed-sound.tsx` is complete — play, pause,
loop, slow mode, progress, waveform, loading and error states all
function. It reads its source from each chakra's `audio` field in
`lib/data/chakras.ts`, which already points here.

Drop seven files in, and every seed sound on the site plays:

    root-lam.mp3
    sacral-vam.mp3
    solar-plexus-ram.mp3
    heart-yam.mp3
    throat-ham.mp3
    third-eye-om.mp3
    crown-om.mp3

Recorded by a practitioner, not synthesised — a bīja mantra generated
by software would be worse than silence. Until the files exist the
control disables itself and says so plainly; nothing else changes.
