

// Wrap everything in an IIFE so internal variables stay private; only window.SiteStore is exposed.
(function () {
  "use strict";
 
  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  // localStorage key under which the cart is saved.
  const CART_KEY = "abd_cart";
  // Maximum quantity allowed per product.
  const MAX_QTY = 10;
  // Built-in product list, used when Supabase isn't configured or fails to load.
  const PRODUCT_IMAGE_BASE = new URL("../images/bongiwe/", document.currentScript.src);
  const productImage = fileName => new URL(fileName, PRODUCT_IMAGE_BASE).href;
  const DEFAULT_CATALOG = [
    { id: "sunday-best-heels", category: "Shoes", name: "Sunday Best Heels", price: 48, img: productImage("whiteHeels.JPG"), badge: "Bestseller" },
    { id: "best-heels", category: "Shoes", name: "Best heels", price: 44, img: productImage("whiteHeels2.jpg"), badge: "Just lovely" },
    { id: "soft-life", category: "Clothes", name: "Soft Life", price: 62, img: productImage("WhiteDress.jpg"), badge: "New in" },
    { id: "softest-life", category: "Clothes", name: "Softest Life", price: 62, img: productImage("GoldenDress.jpg"), badge: "New in" },
    { id: "black-shirt", category: "Clothes", name: "Black shirt for a serious occasion", price: 62, img: productImage("shirt.jpg"), badge: "New in" },
    { id: "wig-one", category: "Wigs", name: "Perfect hair for a perfect day", price: 500, img: productImage("wigs.jpg"), badge: "New in" },
    { id: "wig-two", category: "Wigs", name: "Perfect hair for a perfect day", price: 500, img: productImage("wigs2.jpg"), badge: "New in" },
    { id: "golden-hoops", category: "Jewelry", name: "Golden Hoops", price: 26, img: productImage("jewerlyNecklace.jpg") },
    { id: "golden-hour", category: "Jewelry", name: "Golden Hour", price: 26, img: productImage("jewerlyWatch.jpg") },
    { id: "everywhere-mini-tote", category: "Bags", name: "Everywhere Mini Tote", price: 54, img: productImage("whiteBack.JPG"), badge: "Just lovely" },
    { id: "everywhere-mini-tote-two", category: "Bags", name: "Everywhere Mini Tote ya mamizo", price: 54, img: productImage("whiteBack.JPG"), badge: "Just lovely" },
    { id: "more-than-a-chair", category: "House Accessories", name: "It's more than a chair", price: 554, img: productImage("chair.jpg"), badge: "Just lovely" },
    { id: "armchair", category: "House Accessories", name: "It's more than a chair", price: 554, img: productImage("armchair.jpg"), badge: "Just lovely" }
  ];
 
  // ---------------------------------------------------------------
  // Supabase client
  // ---------------------------------------------------------------
  // Create a Supabase client if config is present and the library has loaded.
  // Returns null otherwise, in which case the site falls back to browser-only storage.
  function getClient() {
    const config = window.SUPABASE_CONFIG;
    // Bail out if config is missing, incomplete, or still contains placeholder values.
    if (!config || !config.url || !config.anonKey || config.url.includes("YOUR_")) {
      return null;
    }
    // Config is fine but the Supabase script didn't load (e.g. blocked or offline).
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.error("Supabase client failed to load; using browser-only cart storage.");
      return null;
    }
    return window.supabase.createClient(config.url, config.anonKey);
  }
 
  // The client (or null) and the active catalog, which starts as the built-in list.
  const client = getClient();
  let catalog = DEFAULT_CATALOG;
 
  // ---------------------------------------------------------------
  // Cart storage
  // ---------------------------------------------------------------
  // Read the cart from localStorage. Returns [] if nothing is saved or the data is invalid.
  function readCart() {
    try {
      const serialized = localStorage.getItem(CART_KEY);
      // Nothing saved yet: empty cart.
      if (serialized === null) return [];
      const value = JSON.parse(serialized);
      // Reject anything that isn't an array (jumps to the catch block below).
      if (!Array.isArray(value)) throw new Error("Saved cart data is not an array.");
      // Keep only well-formed items: string id and name, positive whole-number qty, finite price.
      // This guards against corrupted or hand-edited storage.
      return value.filter(item =>
        item && typeof item.id === "string" &&
        Number.isInteger(item.qty) && item.qty > 0 &&
        Number.isFinite(item.price) && typeof item.name === "string"
      );
    } catch (error) {
      // Corrupt JSON or storage unavailable: log it and fall back to an empty cart.
      console.error("Unable to read the saved cart:", error);
      return [];
    }
  }
 
  // Save the cart to localStorage. Throws a user-friendly error if saving fails
  // (e.g. storage is full or disabled), which the cart page displays.
  function writeCart(items) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Unable to save the cart in this browser:", error);
      throw new Error("Your browser could not save the cart. Check storage settings and try again.");
    }
  }
 
  // Update the cart count in the site header and the cart link's accessible label.
  function updateBadge() {
    // Total units across all cart lines.
    const count = readCart().reduce((total, item) => total + item.qty, 0);
    const badge = document.getElementById("cart-count");
    const link = document.querySelector(".site-header .cart");
    // Both elements are optional, since not every page may have them.
    if (badge) badge.textContent = count;
    if (link) link.setAttribute("aria-label", `Cart, ${count} ${count === 1 ? "item" : "items"}`);
  }
 
  // Add one unit of a product to the cart, enforcing the quantity cap.
  // Throws an error with a user-facing message if the product is unknown or the cap is reached.
  function add(productId) {
    const product = catalog.find(item => item.id === productId);
    if (!product) throw new Error("That product is no longer available.");
 
    const items = readCart();
    const current = items.find(item => item.id === productId);
    if (current) {
      // Already in the cart: increase quantity unless the maximum has been reached.
      if (current.qty >= MAX_QTY) throw new Error(`You can add up to ${MAX_QTY} of this item.`);
      current.qty += 1;
    } else {
      // New item: copy the product's details into the cart with quantity 1.
      items.push({ ...product, qty: 1 });
    }
    writeCart(items);
    updateBadge();
  }
 
  // ---------------------------------------------------------------
  // Catalog loading
  // ---------------------------------------------------------------
  // Load active products from Supabase and replace the built-in catalog.
  // If there is no client or the request fails, the built-in catalog stays in use.
  async function loadCatalog() {
    if (!client) return;
    try {
      // Fetch active products, newest first.
      const { data, error } = await client
        .from("products")
        .select("id, category, name, price, image_url, badge")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Convert database rows into the shape the site uses
      // (image_url becomes img, price becomes a number, missing badge becomes an empty string).
      catalog = data.map(product => ({
        id: product.id,
        category: product.category,
        name: product.name,
        price: Number(product.price),
        img: product.image_url,
        badge: product.badge || ""
      }));
    } catch (error) {
      console.error("Unable to load products from Supabase; using the built-in catalog:", error);
    }
  }
 
  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------
  // Expose the store on window so other scripts (like the cart page) can use it.
  window.SiteStore = {
    // Getter so callers always see the current catalog, even after loadCatalog() replaces it.
    get catalog() { return catalog; },
    client,
    // Promise that resolves once the catalog has finished loading.
    ready: loadCatalog(),
    readCart,
    writeCart,
    updateBadge,
    add
  };
 
  // Show the correct cart count in the header as soon as the script runs.
  updateBadge();
})();
 
