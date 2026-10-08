

// ---------------------------------------------------------------
// Element references and URL state
// ---------------------------------------------------------------
// The grid where product cards are rendered.
const productGrid = document.querySelector("#featured .products");
// Category tabs (each has an id; the "all" tab shows everything).
const productTabs = document.querySelectorAll(".products-nav [id]");
// Mobile menu button and the nav it toggles.
const menuButton = document.getElementById("menu-btn");
const siteNav = document.getElementById("nav");
// Read ?product=... and ?category=... from the page URL.
const params = new URLSearchParams(window.location.search);
// If set, only that single product is shown.
let selectedProductId = params.get("product");
// Normalize a category name for comparison: trim, lowercase, and map
// alternate names ("clothing", "home") to the names used in the catalog.
const normalizeCategory = category => {
  const normalized = (category || "").trim().toLowerCase();
  if (normalized === "clothing") return "clothes";
  if (normalized === "home") return "house accessories";
  return normalized;
};
// Currently selected category; defaults to "all" when the URL has none.
let selectedCategory = normalizeCategory(params.get("category")) || "all";
 
// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
// Escape HTML special characters so values are safe to insert into template strings (prevents XSS).
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[character]);
 
// ---------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------
// Draw the product cards for the current filter (a single product, a category, or everything).
function renderProducts() {
  // A selected product takes priority; otherwise filter by category ("all" shows every product).
  const products = window.SiteStore.catalog.filter(product =>
    selectedProductId
      ? product.id === selectedProductId
      : selectedCategory === "all" || normalizeCategory(product.category) === selectedCategory
  );
 
  // Build the markup for each product. Falls back to a "no results" message if the list is empty.
  productGrid.innerHTML = products.map(product => `
    <article class="product">
      <div class="product-photo">
        <a class="product-image-link" href="/index.html?product=${encodeURIComponent(product.id)}#featured" aria-label="View ${escapeHTML(product.name)}">
          <img src="${escapeHTML(product.img)}" alt="${escapeHTML(product.name)}" loading="lazy">
        </a>
        ${product.badge ? `<span class="badge">${escapeHTML(product.badge)}</span>` : ""}
        <div class="quick">
          <button class="btn" type="button" data-add-to-cart="${escapeHTML(product.id)}">Add to Cart <span>+</span></button>
        </div>
      </div>
      <div class="product-info">
        <small class="product-category">${escapeHTML(product.category)}</small>
        <h3 class="product-comment"><a class="product-name-link" href="/index.html?product=${encodeURIComponent(product.id)}#featured">${escapeHTML(product.name)}</a></h3>
        <div class="price">k${Number(product.price).toFixed(2)}</div>
      </div>
    </article>
  `).join("") || '<p class="empty-products">No matching products found.</p>';
  // Mark the grid as ready (likely used by CSS to reveal it).
  productGrid.classList.add("is-ready");
}
 
// ---------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------
// Clicking a category tab filters the products without reloading the page.
productTabs.forEach(tab => {
  tab.addEventListener("click", event => {
    event.preventDefault();
    // Clear any single-product selection so the category filter applies.
    selectedProductId = null;
    // The "all" tab is identified by its id; other tabs use their label text as the category.
    selectedCategory = tab.id === "all" ? "all" : normalizeCategory(tab.textContent);
    renderProducts();
  });
});
 
// Event delegation: one listener on the grid handles every "Add to Cart" button.
productGrid.addEventListener("click", event => {
  // Ignore clicks that weren't on (or inside) an add-to-cart button.
  const button = event.target.closest("[data-add-to-cart]");
  if (!button) return;
 
  try {
    // Add the product, then briefly confirm on the button before restoring its label.
    window.SiteStore.add(button.dataset.addToCart);
    button.textContent = "Added to Cart";
    window.setTimeout(() => {
      button.innerHTML = 'Add to Cart <span>+</span>';
    }, 1200);
  } catch (error) {
    // Show a failure label on the button and log the details.
    console.error("Unable to add product to cart:", error);
    button.textContent = "Unable to add";
  }
});
 
// Toggle the mobile menu and keep aria-expanded in sync for screen readers.
menuButton.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", isOpen);
});
 
// ---------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------
// Render right away using whatever catalog is available now.
renderProducts();
// Re-render once the store finishes loading (the catalog may have been replaced).
// If loading fails, log the error and render again with the current catalog.
window.SiteStore.ready.then(renderProducts).catch(error => {
  console.error("Unable to load products:", error);
  renderProducts();
});
