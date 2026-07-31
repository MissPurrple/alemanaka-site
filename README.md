# Alemanaka

**Alemanaka ea Temo ea Lesotho** — a living agricultural almanac for Lesotho.

A single-page interactive calendar tracking the four Basotho growing seasons, the
twelve Sesotho month names and their meanings, the moon's cycle as it appears over
the Maloti, and the planting and harvest windows for crops Basotho households
actually grow. Built as a cultural preservation project, and as the digital
companion to a printed wall calendar.

Curated by **Barefaced Media**.

## Running it

There is no build step and no dependencies. Open `index.html` in a browser.

To serve it locally:

```bash
python -m http.server 8000
```

To publish it, enable GitHub Pages on this repository (Settings → Pages → deploy
from the `main` branch, root folder). `index.html` at the repo root is all Pages
needs.

## What's in the file

Everything — markup, styles, data, and logic — lives in `index.html`. That is
deliberate: the site must run with no network requests, no build tooling, and no
framework, so it stays readable, archivable, and easy to hand to someone else.

The JavaScript is organised in labelled blocks:

| Block | What it does |
| --- | --- |
| `DATA` | The `SEASONS`, `MONTHS`, and `CROPS` tables — edit these to change content |
| `SEASON + DATE HELPERS` | Places today inside the agricultural year (1 August – 31 July) |
| `MOON` | Phase, illumination, and next full/new moon from a synodic-month approximation |
| `GEOMETRY` | Polar maths for the season wheel |
| `RENDER` | Builds the hero, wheel, month cards, and crop cards |
| `SCROLL BEHAVIOUR` | Scroll reveals and the active state in the nav dock |

### Editing content

Most changes are data edits, not code edits.

- **Crops** — add an entry to `CROPS`. `plant` and `harvest` are arrays of calendar
  month indexes where January is `0`. Always include a `source`.
- **Months** — `MONTHS` is in agricultural-year order starting at Phato (August).
  `cal` is the calendar month index.
- **Seasons** — `startDay` and `endDay` in `SEASONS` are days offset from 1 August.
- **Colours and type** — the custom properties at the top of the `<style>` block.

## Suggestion box

Visitors can suggest changes from the site. A suggestion only reaches the review
queue once the sender clicks a link emailed to them, and only reaches the site once
a person accepts it. See [`feedback-api/README.md`](feedback-api/README.md) for
setup — it needs a free Cloudflare account and a mail provider.

Until that is deployed, the form works against Cloudflare's public test key and
will report that it cannot reach the server.

## Conventions to preserve

These are easy to undo by accident, so they are worth stating.

**Lesotho orthography.** All Sesotho on the site uses Lesotho spelling, which
writes **l** where South African Sesotho writes **d**: *Lumela* not *Dumela*,
*linaleli* not *dinaledi*. The written form is part of what this project preserves.

**The Southern-Hemisphere moon.** In `moonLitPath`, a waxing moon is lit from the
**left** limb, which is how it appears from Lesotho. Northern-hemisphere code and
most libraries do the opposite. Do not "fix" this.

**Sources on every crop.** Each crop card carries its source, and crops outside the
*Lost Crops of Africa* trilogy say so plainly. Guidance that a farmer might act on
should be traceable.

**Moon planting is framed as heritage.** The moon section presents lunar planting as
indigenous practice and cultural learning, explicitly alongside — not instead of —
the seasonal rainfall calendar.

## Sources

- *Lost Crops of Africa*, Volumes I–III (National Academies Press)
- [FAO/WFP Crop and Food Supply Assessment Mission to Lesotho](https://www.fao.org/4/j2748e/j2748e00.htm)
- [FEWS NET Lesotho Data Book](https://help.fews.net/fde/v3/lesotho-country-book)
- [FAO GIEWS Country Brief: Lesotho](https://www.fao.org/giews/countrybrief/country.jsp?code=LSO)

## Known gaps

Flagged honestly rather than quietly carried forward.

- **Month meanings need a native-speaker review.** They follow commonly cited
  traditional readings, but etymologies vary between sources and districts.
- **Three crops have no Sesotho name on the card** — cowpea, pigeon pea, and
  moringa. Sesotho groups cowpea with the beans as *linaoa*, which collides with the
  dry-beans card, so the cowpea card currently uses English and the botanical name
  and asks the reader for their district's term. A native speaker should settle all
  three.
- **The field-pea window is the least documented** of the crop timings. Sources
  confirm peas as one of Lesotho's five principal crops but not the months, so
  July–August planting is inferred from winter-cropping practice and should be
  checked with a local agronomist before the printed edition.
- **The site is dark-theme only**, which is harder to read outdoors in bright sun.
  A light theme is worth considering given where this will be read.
- **No licence has been chosen yet.** Worth deciding deliberately, since the code
  and the cultural content may warrant different terms.
