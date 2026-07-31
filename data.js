/* ============================================================
   ALEMANAKA — shared data

   Every page reads from here, so a correction is made once and
   shows up everywhere. Month indexes are calendar months with
   January = 0.
   ============================================================ */

window.ALEMANAKA_DATA = (function () {
  "use strict";

  var SEASONS = [
    {
      id: "selemo", name: "Selemo", en: "Early Spring — Prep & Planting",
      timeline: "August – mid-October", startDay: 0, endDay: 76, color: "#8bcf6a",
      weather: "First erratic rains. Late-frost risk until mid-September. Soil warming.",
      actions: [
        "Open and prepare fields with minimum tillage",
        "Plant drought-hardy summer crops after the first good rain",
        "Watch for late frost — protect early seedlings",
        "Start the perennial nursery (moringa, pigeon pea)"
      ]
    },
    {
      id: "lehlabula", name: "Lehlabula", en: "Main Summer Growth",
      timeline: "mid-October – January", startDay: 76, endDay: 184, color: "#5fd9a6",
      weather: "The hottest, wettest months. Peak growth — and peak pest pressure.",
      actions: [
        "Weed and mulch to hold moisture",
        "Manage pests with natural controls",
        "Harvest the first quick greens — theepe (amaranth) and lerotho (spider plant)",
        "Keep watching the rains; replant gaps early"
      ]
    },
    {
      id: "kotulo", name: "Kotulo", en: "Peak Harvest & Storage",
      timeline: "February – March", startDay: 184, endDay: 243, color: "#eab654",
      weather: "Rains taper off. Mature crops dry standing in the field.",
      actions: [
        "Harvest, dry, and thresh grains and pulses",
        "Move stores into airtight containers",
        "Save seed from the strongest plants for next Selemo",
        "Dry theepe leaves into powder for winter"
      ]
    },
    {
      id: "mariha", name: "Mariha", en: "Winter Rest & Planning",
      timeline: "April – July", startDay: 243, endDay: 365, color: "#7fa8e6",
      weather: "Cold and dry. Hard frosts; snow in the highlands.",
      actions: [
        "Grow winter-hardy crops — certain peas and garlic",
        "Feed the soil: cover crops, manure, compost",
        "Plan next season's fields and budget",
        "Harvest saffron where established"
      ]
    }
  ];

  // Every etymology below is the one attested in Mabille & Dieterlen's
  // Southern Sotho-English Dictionary (1950), by way of the reference document
  // compiled for this project. Nothing here is guessed: where the sources are
  // silent, the field is simply absent.
  //
  //   meaning : one line, for the cards on the front page
  //   root    : the derivation, as attested
  //   context : what the month is describing in the world
  //   work    : the agricultural activity of that month
  var MONTHS = [
    { st: "Phato", en: "August", cal: 7, season: "selemo",
      meaning: "The digging. Barren fields are broken open for what is coming.",
      root: "From the verb -fata, to dig.",
      context: "The Basotho year begins here. The winds come to clear away the winter and ready the land for the rains, and the fields are dug in preparation for planting. Selemo sa Basotho, the new year, is marked on the first of August.",
      work: "Soil preparation; ploughing of barren fields." },

    { st: "Loetse", en: "September", cal: 8, season: "selemo",
      meaning: "The milk overflows. Grass returns and the cattle grow fat.",
      root: "Related to the expression lebese le oetse, the milk has spilled over.",
      context: "The grass grows abundantly and the cows grow fat on it, giving so much milk that it is said to spill over. A time of pastoral plenty.",
      work: "Peak herding season; cattle at their most productive." },

    { st: "Mphalane", en: "October", cal: 9, season: "selemo",
      meaning: "The flower shoots rise on the Boophone plant.",
      root: "A shortening of Mphalane ea leshoma, the flower shoots of Boophone disticha.",
      context: "Boophone disticha is a bulbous perennial of the Amaryllis family, found from southern Africa up to Kenya and Uganda. This is the month it begins to send up its shoots.",
      note: "A UNISA Southern Sotho course instead links this month to the birth of young impala, which reads as a regional or secondary interpretation.",
      work: "The main sowing window opens with the first good rain." },

    { st: "Pulungoana", en: "November", cal: 10, season: "lehlabula",
      meaning: "The wildebeest calf. The herds drop their young.",
      root: "The diminutive of pulumo, the wildebeest.",
      context: "Many wildebeest deliver their young in this month, the height of the birthing season among the grazing animals.",
      work: "Weed and mulch while the rains hold." },

    { st: "Tšitoe", en: "December", cal: 11, season: "lehlabula",
      meaning: "The grasshopper. It comes in swarms and the milk thins.",
      root: "Named for a small grasshopper, tšitoe, that appears in great numbers.",
      context: "As the swarms arrive the cattle give less milk, and it is said the cows are being milked by the tšitoe — the insects competing with the herds for the same feed.",
      work: "Harvest the first quick greens." },

    { st: "Pherekhong", en: "January", cal: 0, season: "lehlabula",
      meaning: "The rafters go up. Bird-scarers camp in the fields.",
      root: "From phera ka khong, to set up the rafters using old dried wood.",
      context: "The crops grow tall and those guarding them build small framed shelters — khong — in the fields, staying out to keep the birds off the ripening grain.",
      work: "Active bird-scaring to protect maturing crops." },

    { st: "Hlakola", en: "February", cal: 1, season: "kotulo",
      meaning: "The wiping. The sorghum clears itself as the ears emerge.",
      root: "From Hlakola-molula, to wipe the molula off.",
      context: "The sorghum releases a white substance, molula, as the ears of grain emerge. As they come through it is said the molula is being wiped away.",
      work: "Ears of sorghum emerge; the plant turns from leaf to grain." },

    { st: "Tlhakubele", en: "March", cal: 2, season: "kotulo",
      meaning: "The grains of sorghum, now visible — and the birds have found them.",
      root: "From tlhaku tsa mabele, grains of sorghum.",
      context: "The grain heads have fully formed and stand exposed. The birds begin to eat, and damage becomes serious.",
      work: "Grain maturation; harvest, dry, thresh. Save seed." },

    { st: "Mmesa", en: "April", cal: 3, season: "mariha",
      meaning: "The roasting. Fires at night, and mohloane on the coals.",
      root: "From mmeso oa mohloane, the roasting of the mohloane grasshopper.",
      context: "The mohloane is so small that if you blink while roasting it, it burns. Herd boys make fires at night and eat roasted maize with it. The proverb Mmesa mohloane ha a panye — the grasshopper-roaster does not blink — is drawn from this, and is about keeping your attention on the task.",
      work: "Post-harvest; herding; gathering grasshoppers." },

    { st: "Motšeanong", en: "May", cal: 4, season: "mariha",
      meaning: "The one who laughs at the birds. The grain has hardened beyond them.",
      root: "A contraction of motšea linong, the one who laughs at the birds.",
      context: "The sorghum grains have hardened and opened, and the birds that wanted them can no longer take them. The plant has outlasted what was eating it.",
      work: "Grain hardening; approaching harvest readiness." },

    { st: "Phuptjane", en: "June", cal: 5, season: "mariha",
      meaning: "The little withholding. Winter begins and the land pulls back.",
      root: "The diminutive of Phupu — a small phupu.",
      context: "Plants appear to die and the wild animals move away. Nature begins to hold back on life, and the diminutive marks this as only the start of that withdrawal.",
      work: "End of the growing season; winter dormancy begins." },

    { st: "Phupu", en: "July", cal: 6, season: "mariha",
      meaning: "The withholding. Everything is still, and the year turns.",
      root: "From the verb -phupa, to withhold or restrain.",
      context: "Everything looks dead and nature is holding back completely. The moon enters darkness — hae kena fifing — before returning as a crescent to signal that the new year has dawned, and green leaves follow with Phato.",
      work: "Full winter dormancy; preparation for the year ahead." }
  ];

  // The moon phases that mark the turning of the traditional year.
  var MOON_PHASES = [
    { st: "Hae kena fifing", en: "When it enters into darkness", note: "New moon" },
    { st: "Hae thoasa, e entse lenala la pele", en: "When it shows the first nail", note: "First crescent" },
    { st: "Hae entse lehare", en: "When it displays a razor blade", note: "Waxing crescent — a new year has dawned" }
  ];

  // Two seasons are primary; the four-season terms exist alongside them.
  var SEASON_TERMS = {
    primary: [
      { st: "Selemo", en: "Spring and summer", root: "From the verb -lema, to plant. The same word means year." },
      { st: "Mariha", en: "Autumn and winter", root: "Reconstructs to Proto-Bantu *-tîka: cold weather, cold season, night." }
    ],
    four: [
      { st: "Selemo", en: "Spring" },
      { st: "Lehlabula", en: "Summer" },
      { st: "Lehoetla", en: "Autumn", root: "A word meaning harvest." },
      { st: "Mariha", en: "Winter" }
    ]
  };

  var CROPS = [
    { st: "Mabele", en: "Sorghum",
      why: "The backbone grain of the Basotho table. Deep roots ride out dry spells that break maize, and the harvest stores for years.",
      source: "Lost Crops of Africa, Vol I: Grains", plant: [9, 10], harvest: [1, 2] },
    { st: "Poone", en: "Maize",
      why: "The staple behind papa, and the crop most fields already carry. Planted with the first steady rains, left to dry down after the frost.",
      source: "FEWS NET Lesotho / USDA crop calendar", plant: [9, 10, 11], harvest: [4, 5] },
    { st: "Linaoa", en: "Dry beans (Phaseolus vulgaris)",
      why: "Lesotho's leading legume — sown into warm soil once the rains settle, dried in the pod for the winter store.",
      source: "FAO–WFP Crop & Food Supply Assessment, Lesotho", plant: [10, 11], harvest: [2, 3] },
    { st: "Koro", en: "Winter wheat",
      why: "The cold-season grain of the foothills and highlands: sown into moist autumn soil, harvested under the early-summer sun.",
      source: "FEWS NET Lesotho / USDA crop calendar", plant: [4, 5], harvest: [10, 11] },
    { st: "Erekisi", en: "Field peas",
      why: "One of the country's five principal crops — a frost-tolerant stand-by that fills the fields the summer grains leave empty.",
      source: "FAO–WFP Crop & Food Supply Assessment, Lesotho", plant: [6, 7], harvest: [10, 11] },
    { st: "Litapole", en: "Potatoes",
      why: "A smallholder favourite, especially in the cool highlands — bulking quietly underground while the summer storms pass over.",
      source: "FAO–WFP Crop & Food Supply Assessment, Lesotho", plant: [8, 9, 10], harvest: [0, 1, 2] },
    { st: "Mokopu", en: "Pumpkin",
      why: "Planted among the maize the old way — leaves picked young as moroho, fruits cured whole to last deep into Mariha.",
      source: "Local practice — intercropped with summer grain", plant: [9, 10], harvest: [2, 3, 4] },
    { st: "Cowpea", en: "Vigna unguiculata",
      why: "Protein for the plate, nitrogen for the soil. Intercropped with mabele it feeds the field that feeds you. Sesotho groups it with the beans as linaoa, so ask locally for the name your district uses.",
      source: "Lost Crops of Africa, Vol II: Vegetables", plant: [9, 10, 11], harvest: [1, 2, 3] },
    { st: "Theepe", en: "Amaranth",
      why: "Cut-and-come-again greens richer than spinach, ready weeks after sowing. Dry the leaves into powder for winter.",
      source: "Lost Crops of Africa, Vol II: Vegetables", plant: [8, 9, 10, 11, 0], harvest: [10, 11, 0, 1, 2] },
    { st: "Lerotho", en: "Spider plant (Cleome)",
      why: "A heat-loving traditional green that thrives where exotic vegetables wilt. Quick to harvest, quick to reseed.",
      source: "Lost Crops of Africa, Vol II: Vegetables", plant: [9, 10, 11], harvest: [11, 0, 1, 2] },
    { st: "Pigeon pea", en: "Cajanus cajan",
      why: "A living fence that pays rent: protein-rich peas for three to five years while fixing nitrogen along your boundary.",
      source: "Lost Crops of Africa, Vol I: Grains", plant: [9, 10], harvest: [3, 4, 5] },
    { st: "Moringa", en: "Moringa oleifera",
      why: "The perennial backbone. Fast-growing, with edible leaves and pods — plant once in Selemo, harvest for twenty years.",
      source: "Supplementary source — use discretion", plant: [8, 9, 10], harvest: [0, 1, 2, 3] }
  ];

  return {
    SEASONS: SEASONS,
    MONTHS: MONTHS,
    CROPS: CROPS,
    MOON_PHASES: MOON_PHASES,
    SEASON_TERMS: SEASON_TERMS
  };
})();
