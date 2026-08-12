import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*
  Seed data.

  All three brands are fictional. Names, copy, colours and imagery are invented for
  this project — no real company's marks or assets appear anywhere in this repo.

  Two tiers of product data:
    - A hand-written set per brand. These are what a visitor actually sees and
      clicks, so they get real copy.
    - A generated tail, several thousand rows per brand, dated older so it sits
      behind the hand-written set in every listing. Its job is to make the index
      benchmark honest: measuring a lookup against 30 rows would prove nothing.
*/

const FILLER_PER_TENANT = 5_000;

type SeedProduct = {
  slug: string;
  name: string;
  blurb: string;
  description: string;
  category: string;
  priceCents: number;
  featured?: boolean;
};

// ---------------------------------------------------------------------------
// Rook & Ridge — specialty coffee roaster
// ---------------------------------------------------------------------------

const rookRidge = {
  slug: "rook-and-ridge",
  name: "Rook & Ridge",
  shortName: "Rook & Ridge",
  tagline: "Coffee roasted in small lots, a short walk from wherever you are.",
  about:
    "We roast in twelve-kilo batches above our Dundas West bar, which means the bag on the shelf was almost certainly roasted this week. Nine locations across Toronto, one roastery, no shortcuts.",
  itemNoun: "Menu",
  itemNounSingular: "Item",
  ctaLabel: "See the menu",
  catalogSlug: "menu",
  theme: {
    primary: "#4A3428",
    primaryInk: "#FFFFFF",
    accent: "#C67B47",
    surface: "#FBF8F3",
    surfaceRaise: "#FFFFFF",
    ink: "#241C16",
    inkMuted: "#6B5D52",
    border: "#E5DCD0",
    fontDisplay: "fraunces",
    fontBody: "inter",
    radius: "0.5rem",
    imagery: "arc",
  },
  categories: ["Espresso", "Filter", "Whole Bean", "Cold", "Kitchen"],
  products: [
    {
      slug: "ridge-house-espresso",
      name: "Ridge House Espresso",
      blurb: "Cocoa, dried fig, and a long finish.",
      description:
        "Our everyday espresso and the only blend we have never reformulated. Brazilian naturals for body, a Guatemalan washed lot for structure. Pulls forgiving, which matters when a bar is three deep.",
      category: "Espresso",
      priceCents: 380,
      featured: true,
    },
    {
      slug: "cortado",
      name: "Cortado",
      blurb: "Two ounces, cut with steamed milk.",
      description:
        "Equal parts espresso and milk, served in glass. The drink we use to check a new roast on the bar every morning.",
      category: "Espresso",
      priceCents: 450,
    },
    {
      slug: "flat-white",
      name: "Flat White",
      blurb: "Double ristretto, microfoam, no dry foam.",
      description:
        "Six ounces, poured to the rim. Steamed to 55°C rather than scalded, so you can taste the coffee under the milk.",
      category: "Espresso",
      priceCents: 520,
    },
    {
      slug: "kenya-nyeri-aa",
      name: "Kenya Nyeri AA",
      blurb: "Blackcurrant, tomato leaf, grapefruit acidity.",
      description:
        "A washed lot from the Nyeri highlands, roasted light for filter. Loud and structured — the coffee we hand people who say they do not like fruity coffee, because this is what they actually mean by it.",
      category: "Filter",
      priceCents: 620,
      featured: true,
    },
    {
      slug: "colombia-huila-decaf",
      name: "Colombia Huila Decaf",
      blurb: "Sugarcane process. Caramel and red apple.",
      description:
        "Decaffeinated with sugarcane-derived ethyl acetate rather than solvent, which keeps the sweetness intact. Roasted for both filter and espresso.",
      category: "Filter",
      priceCents: 580,
    },
    {
      slug: "batch-brew",
      name: "Batch Brew",
      blurb: "Whatever is on filter today, ground fresh per batch.",
      description:
        "Brewed every twenty minutes and dumped at thirty. Ask what is on — it rotates weekly and the bar staff will tell you honestly if the current lot is not for you.",
      category: "Filter",
      priceCents: 340,
    },
    {
      slug: "ridge-house-1kg",
      name: "Ridge House — 1kg",
      blurb: "Wholesale bag of the house espresso.",
      description:
        "The same blend we pull on bar, in a one-kilo valve bag. Roasted Tuesdays and Fridays. If you are within our delivery radius it arrives within forty-eight hours of the roast date printed on the bag.",
      category: "Whole Bean",
      priceCents: 4200,
      featured: true,
    },
    {
      slug: "rotating-single-origin-340g",
      name: "Rotating Single Origin — 340g",
      blurb: "This month's featured lot.",
      description:
        "One farm, one process, one roast profile, changed monthly. Includes the producer's name, altitude, and the cupping notes we actually wrote rather than the ones on the importer's sheet.",
      category: "Whole Bean",
      priceCents: 2400,
    },
    {
      slug: "cold-brew-tap",
      name: "Cold Brew, On Tap",
      blurb: "Eighteen-hour steep, nitrogen line.",
      description:
        "Steeped cold for eighteen hours, never heated, poured from a nitro line for texture. Served black; we will add milk but we would rather you tried it without first.",
      category: "Cold",
      priceCents: 540,
    },
    {
      slug: "iced-filter",
      name: "Iced Filter",
      blurb: "Brewed hot onto ice. Bright, not bitter.",
      description:
        "Japanese-style flash chill — brewed at full strength directly onto ice, so it keeps the acidity that cold steeping flattens out.",
      category: "Cold",
      priceCents: 480,
    },
    {
      slug: "cardamom-morning-bun",
      name: "Cardamom Morning Bun",
      blurb: "Laminated overnight, baked at five.",
      description:
        "Made downstairs, out of the oven by five thirty, gone most days by eleven. Not available at the Ossington location.",
      category: "Kitchen",
      priceCents: 520,
    },
    {
      slug: "sourdough-and-cultured-butter",
      name: "Sourdough & Cultured Butter",
      blurb: "Two thick slices, sea salt.",
      description:
        "Country loaf from a bakery four doors down, cultured butter, flaky salt. The entire menu item is three ingredients and it is the second best thing we sell.",
      category: "Kitchen",
      priceCents: 680,
    },
  ] satisfies SeedProduct[],
  pages: [
    {
      slug: "about",
      title: "About",
      heading: "One roastery, nine bars, twelve kilos at a time.",
      body: "Rook & Ridge started as a single machine in a shared kitchen on Sterling Road. We still roast in twelve-kilo batches because it is the largest size where one person can taste every lot that leaves the building. We buy through three importers we have worked with since the beginning, pay above market for lots we intend to repeat, and publish what we paid. Nothing about that is a marketing position — it is just the only way we know how to keep the coffee consistent.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Northaven Motors — automotive retail group
// ---------------------------------------------------------------------------

const northaven = {
  slug: "northaven",
  name: "Northaven Motors",
  shortName: "Northaven",
  tagline: "Every vehicle inspected on a 210-point checklist before it is listed.",
  about:
    "A five-location dealer group serving the GTA since 1994. We publish the full inspection report and accident history for every unit on the lot, before you ask for it.",
  itemNoun: "Inventory",
  itemNounSingular: "Vehicle",
  ctaLabel: "Browse inventory",
  catalogSlug: "inventory",
  theme: {
    primary: "#1B2A3D",
    primaryInk: "#FFFFFF",
    accent: "#2E6BE6",
    surface: "#F7F8FA",
    surfaceRaise: "#FFFFFF",
    ink: "#101828",
    inkMuted: "#5A6472",
    border: "#DDE2E9",
    fontDisplay: "spaceGrotesk",
    fontBody: "plexSans",
    radius: "0.125rem",
    imagery: "grid",
  },
  categories: ["Sedan", "SUV", "Truck", "Electric", "Certified Pre-Owned"],
  products: [
    {
      slug: "meridian-ex-sedan",
      name: "Meridian EX",
      blurb: "Mid-size sedan. 2.0L turbo, front-wheel drive.",
      description:
        "The volume seller on our lot and the car we recommend to anyone commuting more than sixty kilometres a day. Real-world consumption lands around 7.4 L/100km in mixed driving, which is close enough to the sticker that we will put it in writing.",
      category: "Sedan",
      priceCents: 3190000,
      featured: true,
    },
    {
      slug: "meridian-ex-touring",
      name: "Meridian EX Touring",
      blurb: "Sedan, higher trim. Leather, adaptive cruise.",
      description:
        "Same drivetrain as the EX with the driver-assistance package standard. Worth the step up only if you drive highway regularly — in the city you will not use half of it.",
      category: "Sedan",
      priceCents: 3640000,
    },
    {
      slug: "kestrel-awd",
      name: "Kestrel AWD",
      blurb: "Compact SUV. All-wheel drive standard.",
      description:
        "Our most-requested unit between October and March, for obvious reasons. Ground clearance is modest — this is an all-weather commuter, not an off-road vehicle, and we would rather say so than let you find out in April.",
      category: "SUV",
      priceCents: 3875000,
      featured: true,
    },
    {
      slug: "kestrel-awd-seven",
      name: "Kestrel AWD Seven",
      blurb: "Three-row variant. Seats seven.",
      description:
        "The third row is genuinely usable for adults on short trips and genuinely not for long ones. Cargo volume behind row three is 340 litres, which is one stroller or four grocery bags.",
      category: "SUV",
      priceCents: 4520000,
    },
    {
      slug: "haulmark-1500",
      name: "Haulmark 1500",
      blurb: "Half-ton pickup. 3.5L V6, 4x4.",
      description:
        "Rated to 4,700 kg towing with the factory package. We sell these mostly to trades, and we will spec the hitch and brake controller correctly rather than selling you the package with the biggest number.",
      category: "Truck",
      priceCents: 5240000,
    },
    {
      slug: "haulmark-2500-hd",
      name: "Haulmark 2500 HD",
      blurb: "Three-quarter ton. Diesel.",
      description:
        "Heavy-duty chassis, turbodiesel, integrated exhaust brake. Overkill for most buyers — if you are towing under 3,000 kg the 1500 is the better vehicle and several thousand dollars cheaper.",
      category: "Truck",
      priceCents: 6890000,
    },
    {
      slug: "volta-e40",
      name: "Volta e40",
      blurb: "Battery electric. 412 km rated range.",
      description:
        "Rated 412 km; we observe roughly 320 km in Ontario winter conditions with the cabin heated, and we tell every buyer that number before they sign. 150 kW DC fast charging, 10–80% in about 28 minutes on a working charger.",
      category: "Electric",
      priceCents: 5590000,
      featured: true,
    },
    {
      slug: "volta-e40-long-range",
      name: "Volta e40 Long Range",
      blurb: "Larger pack. 540 km rated range.",
      description:
        "The bigger battery is worth it if you regularly drive intercity and not otherwise — it adds mass and the efficiency penalty shows up in city driving.",
      category: "Electric",
      priceCents: 6420000,
    },
    {
      slug: "meridian-ex-cpo-2022",
      name: "Meridian EX — Certified, 2022",
      blurb: "48,200 km. One owner. No accidents.",
      description:
        "Off a three-year lease, serviced with us for its whole life, so we have the complete record rather than a summary. Certification covers powertrain to 160,000 km.",
      category: "Certified Pre-Owned",
      priceCents: 2410000,
    },
    {
      slug: "kestrel-cpo-2021",
      name: "Kestrel AWD — Certified, 2021",
      blurb: "71,900 km. Two owners. Minor rear panel repair.",
      description:
        "Reported rear quarter panel repair from a parking-lot impact in 2023, repaired at our body shop, photographs of the work included in the listing. Priced accordingly.",
      category: "Certified Pre-Owned",
      priceCents: 2180000,
    },
    {
      slug: "volta-e40-cpo-2023",
      name: "Volta e40 — Certified, 2023",
      blurb: "29,400 km. Battery health 97%.",
      description:
        "Battery state-of-health measured at 97% on our diagnostic, report included. Remaining factory battery warranty transfers to you — eight years or 160,000 km from original in-service date.",
      category: "Certified Pre-Owned",
      priceCents: 4190000,
    },
    {
      slug: "haulmark-1500-cpo-2020",
      name: "Haulmark 1500 — Certified, 2020",
      blurb: "112,000 km. Fleet-maintained.",
      description:
        "Ex-fleet, which means high mileage and unusually complete service records. Mechanically the strongest used truck on the lot; cosmetically it looks its history.",
      category: "Certified Pre-Owned",
      priceCents: 2890000,
    },
  ] satisfies SeedProduct[],
  pages: [
    {
      slug: "about",
      title: "About",
      heading: "Thirty years, five locations, one inspection standard.",
      body: "Northaven has been family-owned since 1994. The thing we do differently is boring and it is the whole business: every vehicle gets the same 210-point inspection whether it is a two-year-old certified unit or a fifteen-year-old trade-in, and the full report goes on the listing before anyone asks for it. If a vehicle has a repaired panel, a branded title, or a battery that has lost capacity, that is on the page. We lose some sales that way and keep the customers.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Foundry Athletic — fitness studio
// ---------------------------------------------------------------------------

const foundry = {
  slug: "foundry",
  name: "Foundry Athletic",
  shortName: "Foundry",
  tagline: "Coached strength training in groups of twelve or fewer.",
  about:
    "Two studios in Toronto. Every session is programmed and coached — no open gym floor, no guessing what to do next, and a hard cap of twelve people per class.",
  itemNoun: "Schedule",
  itemNounSingular: "Class",
  ctaLabel: "View the schedule",
  catalogSlug: "schedule",
  theme: {
    primary: "#16302A",
    primaryInk: "#FFFFFF",
    accent: "#E4572E",
    surface: "#F6F7F5",
    surfaceRaise: "#FFFFFF",
    ink: "#14201C",
    inkMuted: "#5B6B64",
    border: "#DCE3DE",
    fontDisplay: "outfit",
    fontBody: "inter",
    radius: "1rem",
    imagery: "geometric",
  },
  categories: ["Strength", "Conditioning", "Mobility", "Cycle", "Recovery"],
  products: [
    {
      slug: "barbell-fundamentals",
      name: "Barbell Fundamentals",
      blurb: "60 min. Squat, hinge, press. No experience needed.",
      description:
        "The entry point for everything else we run. Six weeks, same coach, same twelve people, building to a competent squat, deadlift and overhead press. If you have never held a barbell, start here — genuinely, not as a formality.",
      category: "Strength",
      priceCents: 3200,
      featured: true,
    },
    {
      slug: "strength-block",
      name: "Strength Block",
      blurb: "75 min. Programmed progressive loading.",
      description:
        "Twelve-week linear progression with a deload every fourth week. You will lift the same four movements the whole cycle, which is the point. Requires Fundamentals or an assessment.",
      category: "Strength",
      priceCents: 3800,
    },
    {
      slug: "posterior-chain",
      name: "Posterior Chain",
      blurb: "50 min. Hinge-dominant accessory work.",
      description:
        "Built for people who sit for a living. Hamstrings, glutes, upper back, in that order. Pairs well with Strength Block on alternating days.",
      category: "Strength",
      priceCents: 3200,
    },
    {
      slug: "engine",
      name: "Engine",
      blurb: "45 min. Intervals on rower, bike, ski.",
      description:
        "Aerobic capacity work at genuinely controlled intensity — we cap effort by pace, not by feel, so the last interval matches the first. Harder than it sounds and less punishing than it looks.",
      category: "Conditioning",
      priceCents: 3000,
      featured: true,
    },
    {
      slug: "circuit-45",
      name: "Circuit 45",
      blurb: "45 min. Full body, moderate load, continuous.",
      description:
        "Six stations, three rounds, short rests. The class most people take when they have forty-five minutes and want to be told exactly what to do.",
      category: "Conditioning",
      priceCents: 3000,
    },
    {
      slug: "hill-intervals",
      name: "Hill Intervals",
      blurb: "40 min. Treadmill, graded, coached pacing.",
      description:
        "Incline work at prescribed heart-rate zones. Bring shoes you can run in; this is the one class where the equipment matters.",
      category: "Conditioning",
      priceCents: 3000,
    },
    {
      slug: "mobility-reset",
      name: "Mobility Reset",
      blurb: "40 min. Loaded ranges, not stretching.",
      description:
        "End-range strength work for hips, shoulders and thoracic spine. It is not a yoga class and it is not relaxing, but it is why our members keep squatting into their sixties.",
      category: "Mobility",
      priceCents: 2600,
    },
    {
      slug: "shoulders-and-t-spine",
      name: "Shoulders & T-Spine",
      blurb: "35 min. Overhead position work.",
      description:
        "Specifically for people whose overhead press stalls because of position rather than strength. Diagnostic first session, then targeted work.",
      category: "Mobility",
      priceCents: 2600,
    },
    {
      slug: "cycle-45",
      name: "Cycle 45",
      blurb: "45 min. Power-metered, no choreography.",
      description:
        "Every bike reads power in watts and every interval is prescribed as a percentage of your tested threshold. No dancing on the pedals, no lights, no numbers that mean nothing.",
      category: "Cycle",
      priceCents: 2800,
      featured: true,
    },
    {
      slug: "threshold-test",
      name: "Threshold Test",
      blurb: "30 min. Establishes your training zones.",
      description:
        "A twenty-minute effort that sets the wattage targets used in every Cycle class after it. Retest quarterly. Free for members.",
      category: "Cycle",
      priceCents: 0,
    },
    {
      slug: "recovery-flow",
      name: "Recovery Flow",
      blurb: "50 min. Low intensity, breath-led.",
      description:
        "Deliberately easy. Programmed for the day after a heavy session, and the class our coaches most often have to talk people into taking.",
      category: "Recovery",
      priceCents: 2400,
    },
    {
      slug: "sauna-and-contrast",
      name: "Sauna & Contrast",
      blurb: "45 min. Booked in blocks of four.",
      description:
        "Sauna and cold plunge on a timed rotation, supervised. We make no performance claims about it. People sleep better and they keep booking it.",
      category: "Recovery",
      priceCents: 2200,
    },
  ] satisfies SeedProduct[],
  pages: [
    {
      slug: "about",
      title: "About",
      heading: "Twelve people, one coach, a written program.",
      body: "Foundry started because both founders were tired of gyms that sold access and called it coaching. Every session here is programmed in advance and coached in person, class size is capped at twelve, and the progression is written down so you can see where you are going. We are not the cheapest option in the city and we are explicitly not for everyone — if you want to train alone on your own schedule, a commercial gym will serve you better and we will say so on the tour.",
    },
  ],
};

const TENANTS = [rookRidge, northaven, foundry];

// ---------------------------------------------------------------------------

/*
  Generated tail. Deterministic — same input always produces the same rows, so the
  benchmark is comparing like with like across runs.
*/
function makeFiller(
  tenantIdx: number,
  tenantId: string,
  categories: string[],
  priceFloor: number,
  priceCeil: number,
  count: number,
) {
  const rows = [];
  // Cheap deterministic PRNG. Math.random() would make the seeded dataset — and
  // therefore the benchmark's table statistics — differ between runs.
  let state = 1_000_003 * (tenantIdx + 1);
  const next = () => {
    state = (state * 1_103_515_245 + 12_345) & 0x7fffffff;
    return state / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const n = i + 1;
    rows.push({
      tenantId,
      slug: `archive-${category.toLowerCase().replace(/[^a-z]+/g, "-")}-${n}`,
      name: `${category} Archive ${n}`,
      blurb: "Archived listing retained for catalogue history.",
      description:
        "This record is part of the historical catalogue. It is retained so that listing, filtering and lookup performance are measured against a realistic table size rather than a demo-sized one.",
      category,
      priceCents: Math.floor(priceFloor + next() * (priceCeil - priceFloor)),
      featured: false,
      artSeed: Math.floor(next() * 100_000),
      // Dated into the past so generated rows always sort behind the written ones.
      createdAt: new Date(Date.now() - (i + 30) * 86_400_000),
    });
  }
  return rows;
}

async function main() {
  console.log("Resetting…");
  // Order matters: children first, or the FK constraints reject the delete.
  await prisma.product.deleteMany();
  await prisma.page.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.tenant.deleteMany();

  for (const [idx, t] of TENANTS.entries()) {
    const tenant = await prisma.tenant.create({
      data: {
        slug: t.slug,
        name: t.name,
        shortName: t.shortName,
        tagline: t.tagline,
        about: t.about,
        itemNoun: t.itemNoun,
        itemNounSingular: t.itemNounSingular,
        ctaLabel: t.ctaLabel,
        catalogSlug: t.catalogSlug,
        theme: { create: t.theme },
        pages: { create: t.pages },
      },
    });

    // Hand-written rows, newest-first so they lead every listing.
    await prisma.product.createMany({
      data: t.products.map((p, i) => ({
        tenantId: tenant.id,
        slug: p.slug,
        name: p.name,
        blurb: p.blurb,
        description: p.description,
        category: p.category,
        priceCents: p.priceCents,
        featured: p.featured ?? false,
        artSeed: (idx + 1) * 977 + i * 131,
        createdAt: new Date(Date.now() - i * 3_600_000),
      })),
    });

    const priceRange: Record<string, [number, number]> = {
      "rook-and-ridge": [280, 4800],
      northaven: [1_800_000, 9_500_000],
      foundry: [1800, 4600],
    };
    const [floor, ceil] = priceRange[t.slug];

    const filler = makeFiller(
      idx,
      tenant.id,
      t.categories,
      floor,
      ceil,
      FILLER_PER_TENANT,
    );

    // Chunked — a single createMany with 5k rows builds a query string large
    // enough to upset the pooler.
    const CHUNK = 1_000;
    for (let i = 0; i < filler.length; i += CHUNK) {
      await prisma.product.createMany({ data: filler.slice(i, i + CHUNK) });
    }

    const total = await prisma.product.count({ where: { tenantId: tenant.id } });
    console.log(`  ${t.name.padEnd(18)} ${total.toLocaleString()} products`);
  }

  const grand = await prisma.product.count();
  console.log(`\nSeeded ${grand.toLocaleString()} products across ${TENANTS.length} tenants.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
