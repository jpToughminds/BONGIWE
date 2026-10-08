"use strict";

const client = window.SiteStore.client;
const status = document.getElementById("admin-status");
const loginPanel = document.getElementById("login-panel");
const dashboard = document.getElementById("dashboard");
const productForm = document.getElementById("product-form");
const storyForm = document.getElementById("story-form");
const productList = document.getElementById("product-list");
const messageList = document.getElementById("message-list");
let storyPhotoUrl = null;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showError(error) {
  console.error(error);
  status.textContent = error.message || "The request could not be completed.";
}

function slugify(value) {
  return value.normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readFile(form, field) {
  const input = form.elements.namedItem(field);
  const file = input.files[0];
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");
  return file;
}

async function uploadImage(file, folder) {
  const extension = ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif"
  })[file.type];
  if (!extension) throw new Error("Use a JPEG, PNG, WebP, GIF, or AVIF image.");
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from("site-images").upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;
  return client.storage.from("site-images").getPublicUrl(path).data.publicUrl;
}

function setBusy(form, busy) {
  form.querySelectorAll("button").forEach(button => {
    button.disabled = busy;
  });
}

function showDashboard(user) {
  loginPanel.hidden = true;
  dashboard.hidden = false;
  document.getElementById("admin-email").textContent = user.email;
}

function resetProductForm() {
  productForm.reset();
  productForm.elements.namedItem("originalId").value = "";
  productForm.elements.namedItem("currentImage").value = "";
  document.getElementById("cancel-product-edit").hidden = true;
}

async function loadProducts() {
  const { data, error } = await client
    .from("products")
    .select("id, category, name, price, image_url, badge, active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  productList.innerHTML = data.length ? data.map(product => `
    <article class="record">
      <strong>${escapeHTML(product.name)}</strong>
      <p>${escapeHTML(product.category)} · k${Number(product.price).toFixed(2)}${product.active ? "" : " · Hidden"}</p>
      <p>${escapeHTML(product.id)}</p>
      <div class="record-actions">
        <button class="button button-secondary" type="button" data-edit-product="${escapeHTML(product.id)}">Edit</button>
        <button class="button button-secondary" type="button" data-delete-product="${escapeHTML(product.id)}">Delete</button>
      </div>
    </article>
  `).join("") : "<p>No products yet. Add one using the form above.</p>";
}

async function loadMessages() {
  const { data, error } = await client
    .from("contact_messages")
    .select("id, name, email, message, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  messageList.innerHTML = data.length ? data.map(message => `
    <article class="record">
      <strong>${escapeHTML(message.name)}</strong>
      <p><a href="mailto:${escapeHTML(message.email)}">${escapeHTML(message.email)}</a></p>
      <p>${escapeHTML(message.message)}</p>
      <small>${escapeHTML(new Date(message.created_at).toLocaleString())}</small>
    </article>
  `).join("") : "<p>No messages received yet.</p>";
}

async function loadStory() {
  const { data, error } = await client
    .from("story_content")
    .select("eyebrow, title, intro, heading, body_one, body_two, quote, body_three, photo_url")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  Object.keys(data).forEach(field => {
    if (field === "photo_url") {
      storyPhotoUrl = data.photo_url;
    } else if (storyForm.elements.namedItem(field)) {
      storyForm.elements.namedItem(field).value = data[field] || "";
    }
  });
}

async function authorize(user) {
  if (!user) {
    loginPanel.hidden = false;
    dashboard.hidden = true;
    return;
  }
  const { data, error } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    await client.auth.signOut();
    loginPanel.hidden = false;
    dashboard.hidden = true;
    throw new Error("This account is not authorized to administer the store.");
  }

  showDashboard(user);
  status.textContent = "Loading store data...";
  await Promise.all([loadProducts(), loadMessages(), loadStory()]);
  status.textContent = "";
}

if (!client) {
  status.textContent = "Set the Supabase project URL and anon key in JSallthings/supabase-config.js, then apply supabase/setup.sql.";
} else {
  document.getElementById("login-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    status.textContent = "Signing in...";
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: form.elements.namedItem("email").value.trim(),
        password: form.elements.namedItem("password").value
      });
      if (error) throw error;
      await authorize(data.user);
    } catch (error) {
      showError(error);
    } finally {
      setBusy(form, false);
    }
  });

  client.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    return authorize(data.session && data.session.user);
  }).catch(showError);

  document.getElementById("sign-out").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) return showError(error);
    dashboard.hidden = true;
    loginPanel.hidden = false;
    status.textContent = "Signed out.";
  });

  productForm.addEventListener("submit", async event => {
    event.preventDefault();
    setBusy(productForm, true);
    status.textContent = "Saving product...";
    try {
      const name = productForm.elements.namedItem("name").value.trim();
      const category = productForm.elements.namedItem("category").value;
      const price = Number(productForm.elements.namedItem("price").value);
      const badge = productForm.elements.namedItem("badge").value.trim();
      const oldId = productForm.elements.namedItem("originalId").value;
      const id = oldId || slugify(name);
      if (!id) throw new Error("Enter a product name with at least one letter or number.");
      let imageUrl = productForm.elements.namedItem("currentImage").value;
      const file = readFile(productForm, "image");
      if (file) imageUrl = await uploadImage(file, "products");
      if (!imageUrl) throw new Error("Choose a product image before saving.");

      const { error } = await client.from("products").upsert({
        id,
        category,
        name,
        price,
        image_url: imageUrl,
        badge: badge || null,
        active: true
      });
      if (error) throw error;
      resetProductForm();
      await loadProducts();
      await window.SiteStore.ready;
      status.textContent = "Product saved.";
    } catch (error) {
      showError(error);
    } finally {
      setBusy(productForm, false);
    }
  });

  productList.addEventListener("click", async event => {
    const edit = event.target.closest("[data-edit-product]");
    const remove = event.target.closest("[data-delete-product]");
    try {
      if (edit) {
        const { data, error } = await client
          .from("products")
          .select("id, category, name, price, image_url, badge")
          .eq("id", edit.dataset.editProduct)
          .single();
        if (error) throw error;
        productForm.elements.namedItem("originalId").value = data.id;
        productForm.elements.namedItem("currentImage").value = data.image_url;
        productForm.elements.namedItem("name").value = data.name;
        productForm.elements.namedItem("category").value = data.category;
        productForm.elements.namedItem("price").value = data.price;
        productForm.elements.namedItem("badge").value = data.badge || "";
        document.getElementById("cancel-product-edit").hidden = false;
        productForm.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (remove && window.confirm("Delete this product from the store?")) {
        const { error } = await client.from("products").delete().eq("id", remove.dataset.deleteProduct);
        if (error) throw error;
        await loadProducts();
        status.textContent = "Product deleted.";
      }
    } catch (error) {
      showError(error);
    }
  });

  document.getElementById("cancel-product-edit").addEventListener("click", resetProductForm);

  storyForm.addEventListener("submit", async event => {
    event.preventDefault();
    setBusy(storyForm, true);
    status.textContent = "Saving Our Story...";
    try {
      const content = Object.fromEntries(
        ["eyebrow", "title", "intro", "heading", "body_one", "body_two", "quote", "body_three"]
          .map(field => [field, storyForm.elements.namedItem(field).value.trim()])
      );
      const file = readFile(storyForm, "photo");
      if (file) storyPhotoUrl = await uploadImage(file, "story");
      const { error } = await client.from("story_content").upsert({
        id: "main",
        ...content,
        photo_url: storyPhotoUrl
      });
      if (error) throw error;
      status.textContent = "Our Story content saved.";
    } catch (error) {
      showError(error);
    } finally {
      setBusy(storyForm, false);
    }
  });
}
