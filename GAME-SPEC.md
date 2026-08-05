# Morulium — Game Spec

**The canonical, on-disk source of truth.** Where this and any earlier doc (the genome-schema
draft, chat) disagree, **this wins.** The rarity / drawWeight / expressed-allele system below is
the newest and authoritative.

Status legend: **[LOCKED]** decided · **[CALIBRATING]** decided in shape, numbers tuned by
measurement · **[OPEN]** genuine design decision not yet made — do not guess it into code.

---

## 1. Concept

A browser creature-breeder built on WaifuHatch's mechanics with the adult theme removed and a
combat/genetics focus. The player is a **villain bent on global domination** who grows and breeds
monsters with varied combat strengths to conquer the world region by region.

Two flavor registers, kept distinct in copy: the **cultivation/lab** side speaks clinical
biotech; the **conquest/map** side speaks imperial-military.

Design north star: **no easily discoverable meta.** Variety and emergent difficulty over a
solvable optimal loop. The invariants in §14 exist to protect this.

---

## 2. Glossary [LOCKED]

| Term | Meaning |
|---|---|
| **Rarity tiers** (low→high) | Baseline · Strain · Mutant · Chimera · Progenitor |
| **Morula** | An unhatched unit (was "egg") |
| **Harvest** | Acquiring a Morula (Daily / Extra Harvest) |
| **Decant** | Turning a Morula into a live specimen (was "hatch") |
| **Sequencer** | Late-unlock tool that reveals a Morula's contents pre-Decant |
| **Cull** / **Cull All** | Junk tag / sweep culls into the Vat |
| **the Vat** | The 10-in-1-out fusion chamber (single name, no alternate) |
| **Failsafe** | Dry-streak guarantee for a rare tier (was "pity") |
| **Incursion** | A combat/conquest mission (was "hunt") |
| **Occupation** | Stationing specimens to hold conquered ground for passive yield (was "job") |
| **Vivarium** | The player's base (was "home") |
| **Serum (SR)** | Currency (was "Credits/CR") |
| **the Registry** | The archive/codex — deliberately sparse and discovered, not an open notebook |
| **the Colony** | The player's full collection of specimens (was "roster") |

Unchanged genetics vocabulary: allele, locus, genome, dominant/recessive, mutation, generation,
pristine/degraded, aberration, phenotype, DNA Lab.

**[OPEN]** The player-facing **unit noun** ("specimen" is a working placeholder only — not locked).
**[OPEN]** The five **stat names** (see §3 — currently placeholders).

---

## 3. Genome architecture [LOCKED]

Stats (placeholder names), structured around a **physical ↔ mental** antagonism plus a
**speed ↔ mass** one:

| Stat | Label | Axis |
|---|---|---|
| PWR | Power | Physical (offense) |
| VIT | Vitality | Physical (defense/HP) |
| SPD | Speed | Tempo |
| INT | Intellect | Mental |
| GUI | Guile | Mental (stealth) |

Core tensions: PWR/VIT trade against INT/GUI; SPD trades against VIT.

Two locus layers, both Mendelian (two alleles per locus):

- **Quantitative loci** — polygenic. Many small-effect loci whose expressed values **sum** into
  stats. Some are **antagonistic** (one allele raises a stat and lowers another) — this is the
  tradeoff engine that prevents a strictly-dominant unit.
- **Qualitative loci** — categorical, IC-style part-slots (head, carapace, locomotion, appendage,
  the recessive **aberration** tree, plus a cosmetic `palette` locus). Each expressed allele draws
  a visual part, may modify stats, and may grant an ability. Abilities can't free-stack: one part
  per slot, and the strongest (aberration) abilities carry stat penalties.

Each allele carries **two independent weights** — keep them decoupled:
- `rarityWeight` ∈ {0,1,3,6,10} — how much it **scores** toward tier.
- `drawWeight` — how **often** it rolls (relative, within its locus).

---

## 4. Harvest & Decant [LOCKED]

A Harvest rolls a fresh genome: at each locus, draw two alleles independently via `weightedPick`
over that locus's `drawWeight` distribution. Decant renders the specimen. Genomes are unique by
construction — the combinatorial space is astronomical; there are **no preset layouts.**

Default `drawWeight` by allele `rarityWeight` (aberration locus hand-tuned separately):

| rarityWeight | drawWeight |
|---|---|
| 0 | 100 |
| 1 | 40 |
| 3 | 12 |
| 6 | 4 |
| 10 | 1 |

---

## 5. Rarity [LOCKED rules / CALIBRATING numbers]

- **Score only expressed alleles**, one per **qualitative** locus (dominance-resolved, §7).
- **Quantitative and palette loci contribute 0.** Rarity and combat power are **independent
  axes** — a Baseline unit can have monster stats; rarity means "has unusual traits," not "is
  strong." Never couple `rarityWeight` to `statDeltas`.
- `computeRarity(genome)` = Σ `rarityWeight` of the expressed allele across qualitative loci → tier
  via `tierForScore`.
- **The top tail (Chimera/Progenitor) comes from the aberration mechanic** — rare recessive
  power-traits expressing — **not** from stacking ordinary alleles. Aberration draw weights are
  raised until wild aberrations occasionally express (rare to draw, then recessive to express);
  ordinary part-stacking should top out around Chimera.
- **[CALIBRATING]** Tier thresholds are set to **describe the observed histogram**, not guessed.
  Run the verify harness (roll N, read the score histogram + per-locus contribution), then place
  cuts in the natural gaps. Coarse weights + few loci make the histogram lumpy; the durable
  smoother is **more contributing qualitative loci**, not more threshold patches.

---

## 6. Breeding, mutation, generation, wear [LOCKED rules; one OPEN number]

This is the part that was missing from disk. These are the rules.

**Inheritance (Mendelian, every locus):**
- Offspring inherits one allele from each parent at every locus, each chosen independently 50/50
  from that parent's two copies. Same pair-per-locus structure as a Harvest — breeding just fills
  each pair from the two parents instead of from `weightedPick`.
- Applies to quantitative **and** qualitative loci alike.

**Mutation (on breeding only, PER ALLELE):**
- After each offspring allele is inherited, it has a small independent chance to mutate → re-roll
  that allele via the same `drawWeight` distribution (weighted re-roll; consistent with Harvest).
  This is **two independent rolls per locus** (one per inherited allele), not one — a heterozygote
  can mutate one copy and keep the other.
- The novelty valve that keeps the gene pool from converging.
- **[CALIBRATING]** Rate is tunable — start ~1–2% per allele, read the effect off verify tooling.
- **Any mutation at a slot clears that slot's wear entirely** (see wear below). Because a mutation
  brings fresh genetic material to that locus, the inherited degradation there is moot.

**Generation:**
- Harvested specimens are **Gen 0.**
- A bred specimen is **max(parentA.gen, parentB.gen) + 1.** Lineage depth only — a tracking/display
  value, not a direct stat input.

**Lineage wear (pristine → degraded):**
- **Pristine** sources — Decanted from a Morula, Incursion drops, Vat output — carry no wear; full
  stat expression.
- **Bred** specimens inherit small per-slot stat **wear** from both parents: a mechanically-muted
  reduction that accumulates down a bred lineage, so inbreeding toward one "perfect" specimen
  degrades it over generations. **Visual lineage stays intact** (an Apex-looking part still looks
  Apex); only stat output is shaved, marked per-slot.
- A **mutation at either allele** of a slot resets that whole slot to fresh (no wear) — see Mutation
  above. Wear is stored per-slot, not per-allele, so there is no "half reset."
- **The Vat is the clean-slate escape hatch:** fusion output is always pristine.
- **Wear does not touch rarity.** Rarity is computed from the genome only and stays on its own axis.
- **[OPEN] The exact wear function** — how much a bred slot degrades per generation, and whether it's
  linear or diminishing — was never set. This is a real design call; flag it TBD, don't guess a
  formula into the code.

**Data model (so the doc matches the code):**
- Wear is a **per-locus map** on the Unit (keyed by locus), **not a scalar**. An absent key and a
  `0` must read identically — a missing locus never throws.
- A specimen's origin is derived from **`parentIds != null`**, not a separate `isPristine` flag —
  one source of truth. Bred ⇒ can carry wear; pristine ⇒ all-zero (`wear: {}`).
- Unit also carries `generation: number` and `parentIds: readonly [number, number] | null`. The
  migration that adds these fields defaults existing units to `gen: 0`, `parentIds: null`,
  `wear: {}` — true of them, since every legacy unit was Harvested (a pristine Gen 0 founder), not
  bred. Let the code own the persist version number; don't pin a version string in this doc.

**Breeding gate [LOCKED ruling]:**
- Breeding is a Serum sink (§13), but Serum arrives in M6. Until then, gate breeding with a real
  **Breed cap** — a per-day/per-cycle count mirroring the Daily Harvest limiter — **not** free-for-now.
  Unconstrained breeding misleads balance playtesting: the rarity/wear/anti-meta feel all assume
  breeding is a *constrained* choice, so testing it unlimited teaches lessons that evaporate the
  moment the Serum gate lands. Leave `// M6: replace or augment the Breed cap with Serum cost`.

---

## 7. Expressed-allele resolution [LOCKED]

One shared `resolveExpressed(locus, [aId, bId])`, used by **both** rarity and stats so phenotype and
scoring never diverge:

1. Homozygous (`aId === bId`) → that allele.
2. Heterozygous, one dominant + one recessive → the **dominant** one.
3. Same class (both dominant, or compound-het recessive) → tiebreak by **position in
   `locus.alleles`** — earlier = more dominant. (List each locus's alleles most-dominant-first;
   dominance is authored by ordering.)

---

## 8. Stats & leveling [LOCKED rules / CALIBRATING cap]

- **`computeStats`:** quantitative loci sum **both** alleles (polygenic/additive); qualitative loci
  use **only the expressed** allele's `statDeltas` (via `resolveExpressed`). Branch on
  `LOCI[locusId].type === 'quantitative'`, not on `dominance === undefined`.
- **Base stats** come from the genome; **leveling** improves them.
- **Growth is per-stat and genome-derived** — a unit levels fast in the stats its genes favor, slow
  in the rest, so leveling **deepens specialization** rather than rounding a unit out.
- **Stronger units scale faster**, but the total level contribution is **capped** so level can't
  become a master stat. **[CALIBRATING]** cap ≈ +40% over base — tune.

---

## 9. Combat — Incursions [LOCKED rules / CALIBRATING numbers]

- An Incursion carries **hidden** per-stat requirements, weighted so only some stats matter per front.
- Player fields a team (**[CALIBRATING]** cap ≈ 4). For each required stat, take the team's **best
  contributor** (not the sum — sum invites cloning your best / stacking bodies).
- Each required stat's coverage ratio combines into an overall **success probability**; shortfalls
  drag it down, a badly-uncovered stat drags hard.
- **Feedback is qualitative, never numeric** ("overwhelming here" / "dangerously slow"). Hidden
  thresholds are what make this a game of estimation instead of a spreadsheet.
- **Live ticker** runs the resolution (all the juice).
- **Failure has teeth** (cost/time/injury/front-hardening) so it isn't retry-spam.

---

## 10. Domination structure [LOCKED]

- A **region** decomposes into **fronts**, each a distinct mission type with a distinct stat profile
  (e.g. Infrastructure = INT/SPD, Military = PWR/VIT, Guerrilla = GUI/SPD).
- **Incursions = active conquest; Occupations = garrisoning held fronts** for passive Serum.
- **Conquest order authors difficulty:** taking one front can radicalize the populace and raise
  another's requirements (e.g. Guerrilla hardens). Understaff an Occupation and a pacified front
  flares back up.

---

## 11. Rest & injury [LOCKED rules; one OPEN]

- **Rest is mandatory** between Incursions; a rested specimen deploys at full stats.
- Deploying **under-rested** = reduced effectiveness **+ a chance of injury.**
- **Injury** benches a specimen (essentially useless) for a recovery period set by **injury type**;
  severity scales with recklessness (how far under-rested, how over-tier). **No permanent loss.**
- Vivarium buildings tie in (Barracks → rest capacity/speed; Medbay → injury recovery).
- **[OPEN]** Whether under-rested deploy is **gated behind a consumable (Stim)** or freely available
  with the penalty. Lean: gated, so the Stim has a purpose.

---

## 12. The Vat (fusion) [LOCKED]

- **10 same-rarity specimens → 1**, output rarity weighted on input rarity. Max **100** shredded at
  once. Donors permanently retired. **Output is always pristine.**
- Player-defined **Cull** rules tag junk; **Cull All** sweeps it in.

---

## 13. Systems

**Gear [LOCKED]:** always persists (no permanent-vs-consumable split); **each piece equips to one
specimen at a time** (exclusive), so you can't kit an identical squad. Keep good gear scarce and
mission-contextual with hidden stats.

**Economy [LOCKED shape]:** currency = **Serum (SR)**. Sources: Occupations, Incursion rewards, daily,
Vat outputs. Sinks: Harvests, breeding, gear, Vivarium upgrades, consumables, late Sequencer.

**Imagery [LOCKED]:**
- Every specimen is born with a **free procedural sprite** — code-drawn, parameterized by its genome,
  genes readable off it, must look intentional (curated palette, flat-stylized). This is the universal
  baseline; an "avatar-free" specimen shows this.
- A **paid, on-demand avatar** (higher fidelity) is generated only when the player chooses to portrait a
  keeper — **never auto-generated at creation** (don't spend generations/API on Cull fodder). Metered:
  free trial = X generations then avatar-free (kept images retained); paid = monthly pool for first
  render + regens. **Free users can't trigger the paid API.** Provider **[OPEN]** — TBD, **not PixelLab.**
- **PixelLab** = dev-time static assets only (gear icons, UI, branding). Not sprites, not the paid render.

**Removed vs WaifuHatch:** no bond mechanic, no shiny units.

---

## 14. Anti-meta invariants (the spine)

Every design change must preserve these. Violating one usually means reintroducing a discoverable meta.

1. **Every gain has a cost** — antagonistic quantitative loci; no strictly-dominant unit.
2. **No master stat** — capped, per-stat, genome-derived leveling; no single gene rules all.
3. **Abilities compete** — one part per slot; strong (aberration) abilities carry stat penalties.
4. **Missions demand different profiles** — front-specific hidden requirements; no unit wins everywhere.
5. **Information is hidden** — thresholds, weights, dominance, recessive carriers. Discovered, not looked up.
6. **Rest forces rotation** — no single elite runs everything.
7. **Convergence is taxed** — lineage wear degrades inbred "perfect" units.
8. **Rarity ≠ power** — rarity scores expressed qualitative alleles only; stats never touch it.
9. **The tail is aberration-driven** — top tiers mean "expressed a rare recessive power-trait," not "stacked commons."

---

## 15. Open decisions (do not guess these into code)

- **Lineage wear function** — magnitude per generation, linear vs diminishing.
- **Unit noun** — player-facing ("specimen" is placeholder).
- **Stat names** — the five are placeholders.
- **Stim gating** — is under-rested deploy consumable-gated?
- **Paid avatar provider** — TBD, not PixelLab.
- **Calibrating numbers** — tier thresholds, mutation rate, level cap, team-size cap, mission
  thresholds: all set by measurement, not assumption.
