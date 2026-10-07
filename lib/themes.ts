// A fixed weekly rotation of food themes, shown as a banner for inspiration.
const THEMES = [
    { name: "Sunday Brunch", blurb: "Eggs, pancakes, anything you'd eat at 11am in pajamas." },
    { name: "Meatless Monday", blurb: "Veggie-forward plates that don't feel like a compromise." },
    { name: "Taco Tuesday", blurb: "Tacos, burritos, quesadillas — tortillas welcome." },
    { name: "Pasta Wednesday", blurb: "Noodles of every shape. Leftover sauce counts." },
    { name: "Stir-Fry Thursday", blurb: "One pan, high heat, whatever's in the fridge." },
    { name: "Fakeout Friday", blurb: "Homemade takes on your favorite takeout order." },
    { name: "Sweet Saturday", blurb: "Desserts and baked goods. Box mixes absolutely count." },
];

export function getTodaysTheme(date = new Date()) {
    // Use New York time so the theme flips at local midnight, not UTC.
    const weekday = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "America/New_York",
    }).format(date);

    const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);

    return THEMES[index === -1 ? 0 : index];
}
