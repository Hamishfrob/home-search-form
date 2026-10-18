// The form's screens, in order. Questions are about her life and what she wants,
// never about settings. Where, and how much, come first: they decide what is
// searched at all.

export const FIRST_NAME_NOTE =
  "A first name is plenty. It only names your search on Hamish's computer.";

export const SUGGESTED_AREAS = ["Blackheath", "Greenwich", "Hither Green"];

export const STRETCH_CHOICES = [0, 5, 10, 15];

/** "£630,000" for a budget plus a tolerance, rounded to the nearest £1,000. */
export function ceilingFor(maxPrice, stretchPercent) {
  const value = Math.round(maxPrice * (1 + stretchPercent / 100) / 1000) * 1000;
  return "£" + value.toLocaleString("en-GB");
}

export const IMPORTANCE_LABELS = ["Doesn't matter", "A little", "A lot", "Essential"];

export const MATTERS = [
  { key: "space_per_sqm", title: "Getting plenty of space for the money",
    help: "We compare the price per square metre with what's usual nearby." },
  { key: "quiet_street", title: "A quiet street",
    help: "We measure the distance to main roads and railway lines. We can't hear the street itself." },
  { key: "tenure_and_lease", title: "A secure lease, and low service charges",
    help: "Short leases and high charges can cost thousands. Freeholds are never marked down." },
  { key: "price_vs_comparables", title: "A fair price compared with recent sales",
    help: "We use what similar homes actually sold for, from the Land Registry." },
  { key: "bedrooms", title: "Having at least the number of bedrooms you want", help: "" },
  { key: "nearby", title: "Being close to the places you pick next",
    help: "This sets how much the next screen matters overall." },
];

export const PLACE_CHOICES = [
  { category: "station", label: "A station", example: "Blackheath or Lewisham" },
  { category: "primary_school", label: "A primary school" },
  { category: "secondary_school", label: "A secondary school" },
  { category: "leisure_centre", label: "A leisure centre or swimming pool" },
  { category: "park", label: "A park" },
  { category: "supermarket", label: "A supermarket" },
  { category: "gp", label: "A GP surgery" },
];

export const WALK_CHOICES = [5, 10, 15, 20];

export const SCREENS = [
  { id: "intro", kind: "intro", title: "Let's find you somewhere to come home to",
    lead: "Twelve short questions. A window lights up in the terrace above for each one you answer, and it takes about ten minutes.",
    body: "A computer program reads the written descriptions of homes for sale, which anyone can see on Rightmove, to pick out things like a garden or a quiet street. It never sees anything about you. What you tell us here only decides how the homes are ordered." },
  { id: "name", kind: "text", field: "name", title: "What should we call you?", help: FIRST_NAME_NOTE },
  { id: "areas", kind: "areas", field: "areas", title: "Where would you like to live?",
    help: "Add as many areas as you like. We'll check each one is a real place before we search." },
  { id: "radius", kind: "choice", field: "radius", title: "How far around each area should we look?",
    options: [{ value: 0.25, label: "Just the area itself" },
              { value: 0.5, label: "A short walk around it" },
              { value: 1, label: "About a mile around it" }] },
  { id: "budget", kind: "amount", field: "maxPrice", title: "What's the most you'd spend?",
    help: "The price you'd be happy to pay. The next question is about going over it." },
  { id: "stretch", kind: "stretch", field: "stretch", title: "If a home is a little over that, would you still look?",
    help: "Sellers often take less than the asking price. Homes over your budget are marked as needing an offer." },
  { id: "beds", kind: "beds", title: "How many bedrooms?" },
  { id: "types", kind: "multi", field: "types", title: "What kinds of home would you consider?",
    options: [{ value: "flat", label: "Flat" }, { value: "maisonette", label: "Maisonette" },
              { value: "terraced", label: "Terraced house" }, { value: "semi", label: "Semi-detached house" },
              { value: "detached", label: "Detached house" }, { value: "bungalow", label: "Bungalow" }] },
  { id: "garden", kind: "choice", field: "garden", title: "Is a garden or outdoor space a must?",
    options: [{ value: "must", label: "It's a must" }, { value: "nice", label: "Nice to have" },
              { value: "dont", label: "I don't mind" }] },
  { id: "matters", kind: "matters", title: "How much do these matter to you?" },
  { id: "places", kind: "places", title: "What do you want to be close to?",
    help: "Choose up to six. For each, say how long a walk is fine. If you have a particular one in mind, such as a school, name it. If something isn't on the list, add it under Something else. Please don't name your home or workplace." },
  { id: "alerts", kind: "alerts", title: "Would you like an email when there's something new?",
    options: [{ value: "weekly", label: "One email each week" },
              { value: "weekly_plus", label: "That, and an extra one if something really special appears" },
              { value: "none", label: "No emails. I'll look at the page" }] },
  { id: "review", kind: "review", title: "Have a look over this" },
];
