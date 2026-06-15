# EES and ETIAS Source Brief

Reviewed: 2026-06-04
Status: Internal briefing note based on the external source pack in `/Users/jameswalsh/Dev/Web Projects/ComplyEur-v2/EU Regulation Documents`

## Purpose

This note summarizes the EES and ETIAS material in the external research folder and translates it into product, engineering, and content implications for ComplyEur.

This is not a replacement for current legal review, repo code, or current production copy. Treat it as a verified working summary of the reviewed documents, not as a canonical product spec.

## Source Pack Reviewed

### Primary legal texts

- `EES/REGULATION (EU) 2017:2226 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL.pdf`
- `EES/REGULATION (EU) 2018:1240 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL.pdf`
- `EES/REGULATION (EU) 2025:1534 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL.pdf`

### Public EES guidance

- `EES/What is the EES? - EES.pdf`
- `EES/FAQs about EES - EES.pdf`
- `EES/How does the EES work? - EES.pdf`
- `EES/To whom does the EES not apply? - EES.pdf`
- `EES/Check how long you can stay - EES.pdf`
- `EES/Data held by the EES - EES.pdf`
- `EES/Travel to Europe mobile app - EES.pdf`
- `EES/National facilitation programmes - EES.pdf`
- `EES/Contact details for data protection matters - EES.pdf`
- `EES/How the entry:exit system works - Consilium.pdf`

### Public ETIAS guidance

- `European Travel Information and Authorisation System (ETIAS) /What is ETIAS - ETIAS.pdf`
- `European Travel Information and Authorisation System (ETIAS) /Who should apply - ETIAS.pdf`
- `European Travel Information and Authorisation System (ETIAS) /What you need to apply - ETIAS.pdf`
- `European Travel Information and Authorisation System (ETIAS) /Frequently asked questions - ETIAS.pdf`
- `European Travel Information and Authorisation System (ETIAS) /Applying on behalf of others - ETIAS.pdf`
- `European Travel Information and Authorisation System (ETIAS) /Your right to appeal - ETIAS.pdf`

## High-Confidence Facts From The Pack

### EES

- The EES legal base in the pack is `Regulation (EU) 2017/2226`.
- The reviewed public FAQ states that EES was deployed gradually across the external borders of the participating countries over a `6 month` period lasting until `9 April 2026`, with full operation from `10 April 2026`.
- The pack also includes `Regulation (EU) 2025/1534`, which specifically creates temporary derogations for the progressive start of EES operations.
- EES applies to non-EU nationals travelling for a short stay, defined as `up to 90 days within any 180-day period`.
- The reviewed public EES country list covers `29` countries:
  Austria, Belgium, Bulgaria, Croatia, Czechia, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Italy, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden, Switzerland.
- The same EES guidance states that `Cyprus` and `Ireland` are outside the EES country set and will continue using manual passport stamping.
- EES electronically records entries, exits, and refusal-of-entry events.
- EES uses biometrics. The FAQ states:
  - visa-required short-stay travellers: facial image only, because fingerprints were already registered during the visa process;
  - visa-exempt short-stay travellers: four fingerprints and facial image;
  - children below `12` are currently not fingerprinted even if subject to EES.
- The public EES materials describe optional self-service systems and mobile-app-assisted pre-registration flows, but border officers remain part of the process.

### ETIAS

- The ETIAS legal base in the pack is `Regulation (EU) 2018/1240`.
- The reviewed ETIAS public guidance states that ETIAS will start operations in the `last quarter of 2026` and that no action is required from travellers yet.
- ETIAS applies to visa-exempt travellers going to `30` European countries. The public country list includes the 29 EES countries plus `Cyprus`.
- The reviewed ETIAS guidance states that ETIAS is linked to the traveller's passport and is valid for up to `3 years` or until passport expiry, whichever comes first.
- ETIAS is an entry requirement, not a guarantee of admission. Border officers still decide entry.
- The reviewed ETIAS guidance states that short stays remain `up to 90 days in any 180-day period`.
- The ETIAS public page explicitly says time spent in `Cyprus` is calculated separately and does not count toward the days allowed in the other ETIAS countries.
- The reviewed ETIAS public guidance states an application fee of `EUR 20`, with some exemptions.
- The reviewed ETIAS public guidance states that most applications are processed within minutes, but can take up to `4 days`, and in some cases up to `14` or `30` additional days depending on requests for information or interview.

## Product Implications For ComplyEur

### 1. ComplyEur should keep EES, ETIAS, and 90/180 compliance as separate concepts

- `90/180 compliance` is the day-counting problem ComplyEur solves.
- `EES` is the border recording and enforcement infrastructure.
- `ETIAS` is a travel authorisation regime for visa-exempt nationals.

These concepts overlap in the user journey but they are not interchangeable. Product copy should avoid using EES or ETIAS as shorthand for the 90/180 rule itself.

### 2. Cyprus needs explicit handling in product logic and copy

- Existing repo logic already treats Cyprus as non-Schengen.
- The ETIAS public guidance adds an important nuance: Cyprus can still be in the ETIAS scope while remaining separate from the 90/180 calculation used for the other ETIAS countries.

This reinforces that "EU", "Schengen", "EES", and "ETIAS" are different sets and should remain modeled separately.

### 3. Official systems do not remove the need for pre-trip planning

The EES pack includes an official stay-check tool, but the reviewed guidance still points to operational edge cases and rollout limitations. That supports ComplyEur's positioning as pre-trip planning and internal control software rather than as a replacement for government systems.

### 4. ETIAS introduces a second business-travel readiness check

For visa-exempt travellers, employers will increasingly need both:

- remaining lawful short-stay days; and
- valid travel authorisation status.

ComplyEur does not need to implement ETIAS application handling to benefit from this. Even a simple "authorisation required / likely required / out of scope" layer could become useful later.

## Copy and UX Implications

### Safer copy

- "ComplyEur helps teams track short-stay day usage before border checks become a problem."
- "EES is an EU border-recording system. ComplyEur does not submit data to EES."
- "ETIAS is a separate travel authorisation requirement for many visa-exempt travellers."

### Copy to avoid unless freshly re-verified

- Any absolute claim that EES "went live on 12 October 2025" without clarifying the later phased rollout material.
- Any statement that Cyprus is either fully Schengen or fully outside the broader EU travel-authorisation picture.
- Any suggestion that ETIAS itself determines how many Schengen days a traveller has left.

### UX opportunities

- Add explanatory glossary content for `Schengen`, `EES`, `ETIAS`, `Cyprus`, and `Ireland`.
- Add warnings when users assume any EU country counts toward Schengen.
- Consider future itinerary warnings when a traveller is visa-exempt and appears likely to need ETIAS for the destination set.

## Open Questions And Risks

### 1. Launch-date messaging is not clean inside the repo

The reviewed source pack emphasizes progressive EES rollout through `9 April 2026` with full operation from `10 April 2026`.

Current repo marketing drafts still contain hard launch wording such as "EES has been live since 12 October 2025". Those statements should be revalidated before publication or reuse.

### 2. The source pack mixes legal texts with public guidance

The regulations are the strongest source for legal structure. The public one-page PDFs are useful for current operational guidance and user-facing explanations, but they should not be treated as the only authority for legal interpretation.

### 3. EES online stay-check output has limitations

The reviewed `Check how long you can stay - EES.pdf` states:

- remaining authorised stay does not reflect time spent in Schengen that began before `10 April 2026`;
- until `6 October 2026` inclusive, an `OK` answer may be unreliable for certain single-entry or double-entry visa holders with specific prior entry usage.

This matters because users may assume official tools are always complete and final. Product messaging should avoid overclaiming certainty.

### 4. ETIAS scope will matter operationally for UK and US travellers

The reviewed ETIAS country list of visa-exempt nationalities includes both the `United Kingdom` and the `United States`. This is likely to affect a large share of ComplyEur's target user base once ETIAS operations begin.

## Recommended Follow-Up Work

### Short term

- Review and update repo marketing drafts that make hard EES launch-date claims.
- Create a small internal terminology sheet covering `Schengen`, `EES`, `ETIAS`, `Cyprus`, and `Ireland`.
- Keep the existing compliance engine focused on 90/180 counting rather than attempting to mirror all EES or ETIAS edge cases.

### Medium term

- Evaluate whether ComplyEur should surface "ETIAS likely required" as a planning signal for visa-exempt travellers.
- Add product copy that clearly positions ComplyEur as complementary to official EU border systems.
- If public content on EES or ETIAS is published, re-verify claims against current EU primary sources immediately before release.

## Repo Cross-Check Notes

- `docs/CALCULATION_LOGIC.md` already correctly distinguishes Cyprus and Ireland from Schengen counting.
- `docs/marketing/blog-drafts/blog-post-1-why-ees-is-happening.md`
- `docs/marketing/blog-drafts/blog-post-2-how-ees-works.md`

The marketing drafts above should be reviewed before reuse because the date language may no longer reflect the most accurate framing supported by the reviewed pack.
