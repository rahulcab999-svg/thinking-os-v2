// ─── VERIFIED SOURCES CONFIG (Fix #2 / Fix #3) ──────────────────────────────
// Every URL in this file was individually searched and confirmed during the
// verification pass in this conversation. Nothing here is invented. Where a
// co-attributed thinker's material could not be confirmed, that is noted
// explicitly rather than filled in with a guess.
//
// type: "primary"   = the thinker's own original text (public domain or
//                      self-published in full)
// type: "secondary"  = free interviews/transcripts/lectures ABOUT or BY the
//                      thinker, used in place of their copyrighted book text
//
// IMPORTANT CAVEATS carried over from verification, per framework:
// - feynman: source explicitly states "free to read online" but prohibits
//   downloading/redistributing. Retrieval must fetch live per-query; do not
//   cache/store the full text locally.
// - second_order: only Howard Marks' half is confirmed. Ray Dalio's original
//   free "Principles" PDF could not be re-confirmed at a stable current URL
//   (the link found was stale). This framework should only draw from the
//   Howard Marks source until Dalio's is separately confirmed.
// - bayes: NO source found. Remains memory-based; not included below.
// - keynes_economics, camus_absurdism: grounded ONLY under India's
//   Copyright Act 1957 §22 (life+60). Not public domain in the US.

const SOURCES = {
  // ─── Public domain (Project Gutenberg / equivalent) ───────────────────────
  marcus_aurelius: [
    { type: "primary", url: "https://www.gutenberg.org/files/2680/2680-h/2680-h.htm", label: "Meditations" }
  ],
  sun_tzu: [
    { type: "primary", url: "https://www.gutenberg.org/files/17405/17405-h/17405-h.htm", label: "The Art of War (Giles translation)" }
  ],
  machiavelli_prince: [
    { type: "primary", url: "https://www.gutenberg.org/files/1232/1232-h/1232-h.htm", label: "The Prince" }
  ],
  epictetus_stoic: [
    { type: "primary", url: "https://www.gutenberg.org/files/10661/10661-h/10661-h.htm", label: "Discourses and Enchiridion" }
  ],
  seneca_stoic: [
    { type: "primary", url: "https://www.gutenberg.org/files/56075/56075-h/56075-h.htm", label: "Morals of a Happy Life, Benefits, Anger and Clemency" }
  ],
  nietzsche_willpower: [
    { type: "primary", url: "https://www.gutenberg.org/files/4363/4363-h/4363-h.htm", label: "Beyond Good and Evil" }
  ],
  marx_dialectical: [
    { type: "primary", url: "https://www.gutenberg.org/files/61/61-h/61-h.htm", label: "The Communist Manifesto" }
  ],
  smith_invisible_hand: [
    { type: "primary", url: "https://gutenberg.org/files/3300/3300-h/3300-h.htm", label: "The Wealth of Nations" }
  ],
  darwin_evolution: [
    { type: "primary", url: "https://www.gutenberg.org/files/1228/1228-h/1228-h.htm", label: "On the Origin of Species" }
  ],
  // Aristotle half of first_principles
  first_principles: [
    { type: "primary", url: "https://www.gutenberg.org/files/8438/8438-h/8438-h.htm", label: "Nicomachean Ethics (Aristotle)" },
    { type: "secondary", url: "https://lexfridman.com/elon-musk-4-transcript/", label: "Lex Fridman interview (Elon Musk)" },
    { type: "secondary", url: "https://www.thehenryford.org/documents/default-source/default-document-library/transcript_musk_full-length.pdf", label: "The Henry Ford official oral history (Elon Musk)" }
  ],
  // India-jurisdiction public domain (life+60) — NOT public domain in the US
  keynes_economics: [
    { type: "primary", url: "https://gutenberg.net.au/ebooks03/0300071h/printall.html", label: "The General Theory of Employment, Interest and Money — India (life+60) only" }
  ],
  camus_absurdism: [
    { type: "secondary", url: "https://www.nobelprize.org/prizes/literature/1957/camus/speech/", label: "Nobel Banquet Speech, 1957 — India (life+60) only for full essay text" }
  ],

  // ─── Self-published / freely released by the author ────────────────────────
  bezos_day1: [
    { type: "primary", url: "https://www.aboutamazon.com/about-us/shareholder-letters", label: "Amazon Shareholder Letters (official archive)" }
  ],
  naval_leverage: [
    { type: "primary", url: "https://www.navalmanack.com/almanack-of-naval-ravikant/find-a-position-of-leverage", label: "The Almanack of Naval Ravikant — 'Find a Position of Leverage' chapter" },
    { type: "primary", url: "https://www.navalmanack.com/almanack-of-naval-ravikant/find-and-build-specific-knowledge", label: "The Almanack of Naval Ravikant — 'Find and Build Specific Knowledge' chapter" },
    // PDF fallback — will be skipped by retrieval.js's PDF-detection (see
    // note at top of file), kept only in case PDF parsing is added later.
    { type: "primary", url: "https://navalmanack.s3.amazonaws.com/Eric-Jorgenson_The-Almanack-of-Naval-Ravikant_Final.pdf", label: "The Almanack of Naval Ravikant (official free PDF, full book)" }
  ],
  buffett_margin_safety: [
    { type: "primary", url: "https://www.berkshirehathaway.com/letters/letters.html", label: "Berkshire Hathaway Shareholder Letters (official)" }
  ],
  feynman: [
    { type: "primary", url: "https://www.feynmanlectures.caltech.edu/I_01.html", label: "The Feynman Lectures on Physics, Vol. I Ch. 1: Atoms in Motion (Caltech, read-only — do not cache)" }
  ],
  second_order: [
    { type: "primary", url: "https://www.oaktreecapital.com/insights/memo/the-best-of", label: "Oaktree Capital Memos (Howard Marks, official)" }
    // Ray Dalio's half intentionally omitted — no stable confirmed URL. See caveat above.
  ],

  // ─── Secondary material for copyrighted thinkers ────────────────────────────
  thiel: [
    { type: "secondary", url: "https://www.hoover.org/research/peter-thiel-transcript", label: "Hoover Institution interview transcript" },
    { type: "secondary", url: "https://blakemasters.tumblr.com/peter-thiels-cs183-startup", label: "Blake Masters' Stanford CS183 class notes" }
  ],
  kahneman: [
    { type: "secondary", url: "https://www.nobelprize.org/prizes/economic-sciences/2002/kahneman/interview/", label: "Official Nobel Prize interview" },
    { type: "secondary", url: "https://kahneman.scholar.princeton.edu/lectures", label: "Princeton scholar page — lecture links" }
  ],
  kahneman_noise: [
    { type: "secondary", url: "https://www.nobelprize.org/prizes/economic-sciences/2002/kahneman/interview/", label: "Official Nobel Prize interview" }
  ],
  taleb: [
    { type: "secondary", url: "https://www.econtalk.org/taleb-on-antifragility/", label: "EconTalk: 'Taleb on Antifragility' (full transcript)" },
    { type: "secondary", url: "https://www.econtalk.org/taleb-on-black-swans-fragility-and-mistakes/", label: "EconTalk: 'Taleb on Black Swans, Fragility, and Mistakes' (full transcript)" }
  ],
  taleb_black_swan: [
    { type: "secondary", url: "https://www.econtalk.org/taleb-on-black-swans/", label: "EconTalk: 'Taleb on Black Swans' (full transcript)" },
    { type: "secondary", url: "https://www.econtalk.org/taleb-on-black-swans-fragility-and-mistakes/", label: "EconTalk: 'Taleb on Black Swans, Fragility, and Mistakes' (full transcript)" }
  ],
  porter: [
    { type: "secondary", url: "https://ted.com/talks/michael_porter_why_business_can_be_good_at_solving_social_problems/transcript", label: "Official TED talk transcript" }
  ],
  christensen_disruption: [
    { type: "secondary", url: "https://hbr.org/podcast/2020/01/revisiting-jobs-to-be-done-with-clayton-christensen", label: "Official HBR IdeaCast transcript" }
  ],
  dawkins_memetic: [
    { type: "secondary", url: "https://www.pbs.org/faithandreason/transcript/dawk-body.html", label: "Official PBS interview transcript" },
    { type: "secondary", url: "https://www.pbs.org/thinktank/transcript410.html", label: "Official PBS Think Tank transcript" }
  ],
  harari_narrative: [
    { type: "secondary", url: "https://lexfridman.com/yuval-noah-harari-transcript/", label: "Official Lex Fridman transcript" },
    { type: "secondary", url: "https://ynharari.com/media/", label: "Harari's own official media page" }
  ],
  greene_power: [
    { type: "secondary", url: "https://singjupost.com/the-key-to-transforming-yourself-by-robert-greene-full-transcript/", label: "TEDxBrixton: 'The Key to Transforming Yourself' (full transcript)" },
    { type: "secondary", url: "https://singjupost.com/robert-greene-the-laws-of-human-nature-talks-at-google-transcript/", label: "Talks at Google: 'The Laws of Human Nature' (full transcript)" }
  ],
  greene_seduction: [
    { type: "secondary", url: "https://singjupost.com/robert-greene-the-laws-of-human-nature-talks-at-google-transcript/", label: "Talks at Google: 'The Laws of Human Nature' (full transcript)" },
    { type: "secondary", url: "https://singjupost.com/the-key-to-transforming-yourself-by-robert-greene-full-transcript/", label: "TEDxBrixton: 'The Key to Transforming Yourself' (full transcript)" }
  ],
  senge_systems: [
    { type: "secondary", url: "https://thesystemsthinker.com/the-inescapable-need-to-change-our-organizations-an-interview-with-peter-senge/", label: "The Systems Thinker: interview with Peter Senge" },
    { type: "secondary", url: "https://www.globalacademy.media/transcript-peter-senge-the-heart-of-transformation/", label: "'The Heart of Transformation' (full interview transcript)" }
  ],
  ackoff_idealized: [
    { type: "secondary", url: "https://ackoffcenter.blogs.com/ackoff_center_weblog/classics", label: "Official Ackoff Center archive (U. Penn / ACASA)" }
  ],
  drucker_effectiveness: [
    { type: "secondary", url: "https://billmoyers.com/content/peter-drucker/", label: "Official Bill Moyers interview transcript" }
  ],
  collins_flywheel: [
    { type: "secondary", url: "https://www.jimcollins.com/media_topics", label: "Collins' own official media page" }
  ],
  gladwell_tipping: [
    { type: "secondary", url: "https://www.ted.com/talks/malcolm_gladwell_on_spaghetti_sauce/transcript", label: "TED2004: 'Choice, happiness and spaghetti sauce' (official transcript)" },
    { type: "secondary", url: "https://www.ted.com/talks/worklife_with_adam_grant_a_debate_with_malcolm_gladwell/transcript", label: "WorkLife with Adam Grant: debate with Malcolm Gladwell (official transcript)" }
  ],
  thaler_nudge: [
    { type: "secondary", url: "https://www.nobelprize.org/prizes/economic-sciences/2017/thaler/", label: "Official Nobel Prize interview + banquet speech" }
  ],
  sartre_existentialism: [
    { type: "secondary", url: "https://www.nobelprize.org/prizes/literature/1964/press-release/", label: "Official Nobel press release (quotes Sartre directly)" },
    { type: "secondary", url: "https://www.nobelprize.org/prizes/literature/1964/sartre/documentary/", label: "Official Nobel documentary page" }
  ],
  foucault_power: [
    { type: "secondary", url: "https://foucault.info/parrhesia/", label: "Discourse and Truth: the Problematization of Parrhesia (Berkeley 1983 seminar, full transcript)" }
  ],
  hayek_spontaneous: [
    { type: "secondary", url: "https://static.library.ucla.edu/oralhistory/text/masters/21198-zz0008zd21-4-master.html", label: "UCLA Library official oral history transcript" },
    { type: "secondary", url: "https://www.pbs.org/thinktank/transcript726.html", label: "Official PBS Think Tank transcript" }
  ],
  friedman_free_market: [
    { type: "secondary", url: "https://www.minneapolisfed.org/article/1992/interview-with-milton-friedman", label: "Federal Reserve Bank of Minneapolis official interview" },
    { type: "secondary", url: "https://www.econlib.org/library/Columns/y2006/Friedmantranscript.html", label: "EconTalk interview transcript (Econlib)" },
    { type: "secondary", url: "https://www.pbs.org/wgbh/commandingheights/shared/minitext/int_miltonfriedman.html", label: "PBS Commanding Heights interview" }
  ],
  munger: [
    { type: "secondary", url: "https://www.cnbc.com/2023/11/30/full-transcript-from-cnbcs-charlie-munger-a-life-of-wit-and-wisdom-.html", label: "Official CNBC transcript" }
  ],
  inversion: [
    { type: "secondary", url: "https://www.cnbc.com/2023/11/30/full-transcript-from-cnbcs-charlie-munger-a-life-of-wit-and-wisdom-.html", label: "Munger — official CNBC transcript" },
    { type: "primary", url: "https://www.gutenberg.org/files/2680/2680-h/2680-h.htm", label: "Stoics — Marcus Aurelius, Meditations" },
    { type: "primary", url: "https://www.gutenberg.org/files/10661/10661-h/10661-h.htm", label: "Stoics — Epictetus, Discourses and Enchiridion" }
  ],
  bias_checker: [
    { type: "secondary", url: "https://www.nobelprize.org/prizes/economic-sciences/2002/kahneman/interview/", label: "Kahneman — official Nobel interview" },
    { type: "secondary", url: "https://www.cnbc.com/2023/11/30/full-transcript-from-cnbcs-charlie-munger-a-life-of-wit-and-wisdom-.html", label: "Munger — official CNBC transcript" },
    { type: "secondary", url: "https://fs-lc.s3.amazonaws.com/Podcast+Transcripts/Robert+Cialdini+transcript+y79fn.pdf", label: "Cialdini — Farnam Street Knowledge Project transcript" },
    { type: "secondary", url: "https://nassimtaleb.org/category/videos/", label: "Taleb — official free video archive" }
  ],
  hoffertrue_believer: [
    { type: "secondary", url: "https://americanarchive.org/catalog/cpb-aacip-55-93gxf189", label: "\"Conversations with Eric Hoffer,\" ep.1 — American Archive of Public Broadcasting" }
  ],
  meadows_leverage: [
    { type: "secondary", url: "https://donellameadows.org/mollys-interview-dana/", label: "Official Donella Meadows Project interview" }
  ],
};

export { SOURCES };
