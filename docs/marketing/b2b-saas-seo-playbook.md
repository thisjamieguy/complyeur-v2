# B2B SaaS SEO Playbook

Last reviewed: 2026-06-18

This playbook adapts the B2B SaaS SEO tutorial notes from the YouTube transcript into a ComplyEur-specific operating plan. It is a working marketing artifact, not a source of product, legal, or compliance truth. Verify claims against current product behaviour, legal copy, and production analytics before publishing new pages.

## Source Notes

- Desktop transcript: `B2B SaaS SEO Tutorial in 60 Mins (2026): Beginner to Expert.md`.
- Public Notion hub: `https://burnt-cone-05b.notion.site/YOUTUBE-SHOW-NOTES-1755908994e080899ff6e75c76b2a961`.
- Relevant Notion child page: `B2B SaaS SEO Full Course - Beginner to Expert (2026)`.
- Embedded video on that child page: `https://youtu.be/S-nrZ8IAT78`.
- Linked microsite: `https://ai.studio/apps/drive/1h-Z7Vs287mmEWlD5CO9TorGUxqWtMDwJ?fullscreenApplet=true`.

The Notion child page is mostly a pointer page: it embeds the video, links to a Google AI Studio microsite, and includes a client insight document image. The microsite currently redirects to Google sign-in, so it should be reviewed manually from an authenticated browser before we treat it as a complete source.

## Useful Ideas From The Tutorial

- Start with customer evidence before keyword tools: sales questions, CRM notes, demo calls, support tickets, and any paid-search terms that produce qualified conversations.
- Prioritise commercial and transactional intent over raw volume. High CPC and competitor bidding can be stronger buying-intent signals than search volume alone.
- Cluster keywords by search intent, then decide whether each cluster deserves a new page, an existing-page optimisation, or no page.
- Check the SERP before creating a page. If Google shows comparison pages, build a buyer guide or comparison page. If it shows vendor homepages, strengthen the product page.
- Use Google Search Console to avoid cannibalisation. Do not create a new page for a query where an existing ComplyEur page already has meaningful impressions and matching intent.
- Build internal links deliberately from informational pages into commercial pages using clear, relevant anchor text.
- Treat backlinks and digital PR as a core growth channel, especially for competitive B2B software terms.
- Track rankings, organic conversions, first page seen, assisted pipeline, and the pages that influenced demo or signup events.

## Adjacent Notion Notes To Mine Next

The show-notes hub contains several related pages that may be useful after the first SEO pass:

| Notion Page | Why It Matters For ComplyEur |
| --- | --- |
| `How To Find Low Volume Keywords Worth High Value B2B Leads` | Likely useful for narrow compliance, HR, mobility, and travel-risk queries with low volume but high buying intent. |
| `Quick Hack - Find Hundreds of SEO Keywords (In Minutes) Using Your Own Data` | Fits the customer-led research approach: mine Search Console, contact forms, CRM notes, support questions, and imports/onboarding language. |
| `How we increased Pipeline by 300% Using SEO` | Useful when designing reporting around pipeline rather than blog traffic. |
| `5 Ways to Integrate Traditional PR & SEO` | Relevant for digital PR campaigns around EES readiness, spreadsheet risk, and employer Schengen compliance. |
| `B2B SEO Strategy: Framework To Maximise ROI [2024]` | Worth comparing against this playbook before committing to a 90-day SEO roadmap. |
| `ON PAGE SEO + AI SEO CHECKLIST (2026 Update)` | Useful as a checklist before publishing new solution, comparison, or guide pages. |

## Customer Evidence To Gather

Before expanding the SEO footprint, collect:

- Top reasons prospects choose ComplyEur.
- Top reasons prospects hesitate or do not choose ComplyEur.
- Roles involved in the buying process: HR, operations, finance, mobility, legal, travel management, founders, or office management.
- Industries with repeat Schengen travel: consulting, engineering, professional services, events, sales, manufacturing, and field service.
- Phrases prospects use for the problem, not just the product category.
- Existing acquisition data from GA4, Search Console, Stripe checkout source fields, contact forms, and any CRM or email conversations.
- Any paid-search test terms that produce qualified signup, contact, or demo intent.

## Initial Keyword Cluster Map

These are hypotheses for research and SERP validation. The current site already targets the main product term through `/`.

| Cluster | Example Keywords | Intent | Likely Page Type | Initial Action |
| --- | --- | --- | --- | --- |
| Schengen compliance software | schengen compliance software, schengen 90/180 software, 90 180 rule software | Commercial | Primary solution page | Continue strengthening `/` |
| Employee travel compliance software | employee travel compliance software, business travel compliance software, EU travel compliance software | Commercial | Solution page | Research SERP and consider `/solutions/employee-travel-compliance-software` |
| Schengen calculator for employers | schengen calculator for employers, employee schengen calculator, 90 180 day calculator for business travel | Transactional | Tool or calculator landing page | Consider a public calculator only if legal/product scope is clear |
| UK business travel to EU after Brexit | UK business travel EU after Brexit, Schengen rules for UK business travellers | Informational with commercial follow-up | Guide or hub article | Expand blog content and link to `/` |
| EES employer guidance | EES for UK employers, EU Entry Exit System business travel | Informational | Guide articles | Existing blog posts cover this; improve internal links |
| Pricing | schengen compliance software pricing, travel compliance software pricing | Transactional | Pricing page | Continue strengthening `/pricing` |
| Alternatives and comparisons | spreadsheet vs schengen tracker, best schengen compliance software | Commercial investigation | Comparison or buyer guide | Create only after competitor/SERP review |
| Industry use cases | schengen compliance for consulting firms, EU travel compliance for engineering teams | Commercial long-tail | Industry solution pages | Create after customer evidence confirms vertical demand |

## Page Creation Rules

1. Run a SERP check for each target cluster.
2. Check Search Console for existing impressions and landing pages.
3. Decide whether to optimise an existing page or create a new URL.
4. Draft around the buying question, not a generic keyword list.
5. Add schema only when it truthfully represents visible page content.
6. Add internal links from relevant blog and FAQ content to the target commercial page.
7. Add the new public URL to `app/sitemap.ts` only after the page exists and is indexable.

## First Execution Backlog

- Add commercial internal links from `/` to `/pricing`, `/faq`, and the two EES blog posts.
- Pull the last 90 days of Search Console query/page data for `/`, `/pricing`, `/blog`, and both EES posts.
- Build a keyword research sheet with columns for cluster, primary keyword, CPC, volume, SERP page type, existing ComplyEur page, GSC impressions, proposed URL, and status.
- Decide whether the next page should be an employee travel compliance software solution page, a public calculator page, or a buyer guide.
- Design one digital PR asset idea around anonymised employer Schengen readiness or spreadsheet risk, only if data collection is lawful and does not involve customer data without consent.
- Manually open the linked Google AI Studio microsite from the Notion page and copy any reusable templates or checklists into this playbook, with attribution and a review date.

## Reporting Metrics

- Rankings for agreed commercial clusters.
- Organic landing-page sessions and engaged sessions.
- Contact, signup, and checkout events from organic traffic.
- First page seen for organic conversions.
- Search Console clicks, impressions, CTR, and average position by URL.
- New referring domains, reclaimed links, and unlinked brand mentions.
