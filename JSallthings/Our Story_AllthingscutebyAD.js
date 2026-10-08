
// ---- DOM element references ----
// Hamburger/menu toggle button
const menuButton = document.getElementById("menu-btn");
// Site navigation container that gets shown/hidden
const siteNav = document.getElementById("nav");
// Element used to display status/error messages about the story content
const storyStatus = document.getElementById("story-status");

// Maps each database column name (key) to the id of the page element (value)
// that should display its text. Used later to fill in the story section in a loop.
const storyFields = {
  eyebrow: "story-eyebrow",
  title: "story-title",
  intro: "story-intro",
  heading: "story-heading",
  body_one: "story-body-one",
  body_two: "story-body-two",
  quote: "story-quote",
  body_three: "story-body-three"
};

// ---- Mobile menu toggle ----
menuButton.addEventListener("click", () => {
  // Toggle the "open" class on the nav; toggle() returns true if the class is now present
  const isOpen = siteNav.classList.toggle("open");
  // Keep the aria-expanded attribute in sync so screen readers know the menu state
  menuButton.setAttribute("aria-expanded", isOpen);
});

// ---- Load story content from the database ----
// Wait until the shared site store (SiteStore) has finished initializing
window.SiteStore.ready.then(async () => {
  // Refresh the badge display (e.g. a cart or counter badge in the header)
  window.SiteStore.updateBadge();
  // Database client (looks like Supabase); stop here if it isn't available
  const client = window.SiteStore.client;
  if (!client) return;

  // Fetch the single story row (id = "main") from the story_content table
  const { data, error } = await client
    .from("story_content")
    .select("eyebrow, title, intro, heading, body_one, body_two, quote, body_three, photo_url")
    .eq("id", "main")
    .maybeSingle(); // returns null (not an error) if no row is found
  // Throw on a query error so it is handled by the .catch() below
  if (error) throw error;
  // Nothing saved yet, so keep the page's default content
  if (!data) return;

  // Loop over each field/element pair and write the saved text into the page.
  // Null values are skipped so the default text stays in place.
  Object.entries(storyFields).forEach(([field, elementId]) => {
    if (data[field] !== null) document.getElementById(elementId).textContent = data[field];
  });

  // If a photo URL was saved, display the photo
  if (data.photo_url) {
    // Container for the photo
    const photo = document.getElementById("story-photo");
    // The <img> element itself
    const image = document.getElementById("story-photo-img");
    image.src = data.photo_url;
    image.alt = "AllthingscutebyAD story"; // Alt text for accessibility
    image.hidden = false; // Reveal the image
    // Give the container the same accessible label as the image
    photo.setAttribute("aria-label", image.alt);
    // Hide the placeholder that shows when there is no photo
    document.getElementById("story-photo-placeholder").hidden = true;
  }
}).catch(error => {
  // Log the technical details for debugging
  console.error("Unable to load the saved story content:", error);
  // Show a friendly message to visitors
  storyStatus.textContent = "The latest story content could not be loaded.";
});
//documents referece for the cards that points to the home
const shoesCat = document.getElementById("shoes-cat");
const clothingCat = document.getElementById("clothing-cat");
const jewelryCat = document.getElementById("jewelry-cat");
const wigsCat = document.getElementById("wigs-cat");
const bagsCat = document.getElementById("bags-cat");
const homeCat = document.getElementById("home-cat");


shoesCat.addEventListener("click", () => {
  window.location.href = "/index.html?category=shoesItem";
});