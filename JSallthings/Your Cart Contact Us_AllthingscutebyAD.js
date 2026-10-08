
// ---------------------------------------------------------------
// Mobile nav toggle
// ---------------------------------------------------------------
// Grab the hamburger button and the nav container.
const btn=document.getElementById('menu-btn'),nav=document.getElementById('nav');
// Toggle the "open" class on click and mirror the state to aria-expanded
// so screen readers know whether the menu is open.
btn.addEventListener('click',()=>{const o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
 
// ---------------------------------------------------------------
// Constants and helpers
// ---------------------------------------------------------------
// FREE_AT: subtotal at which shipping becomes free. MAX_QTY: per-item quantity cap.
const FREE_AT=75, MAX_QTY=10;
// Shorthand for getElementById.
const $=id=>document.getElementById(id);
// Format a number as a price, e.g. 12 -> "k12.00".
const money=n=>'k'+n.toFixed(2);
// Escape HTML special characters so values are safe to put inside template strings (prevents XSS).
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Inline SVG icons for the quantity stepper buttons (decorative, hidden from screen readers).
const MINUS='<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M0 256c0-17.7 14.3-32 32-32h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z"/></svg>';
const PLUS='<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32v160H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h160v160c0 17.7 14.3 32 32 32s32-14.3 32-32V288h160c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V64z"/></svg>';
 
// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
// The current cart: an array of line items (id, name, price, qty, img, category).
let items=[];
// Live-region element used to announce cart errors to the user.
const cartStatus=$('cart-status');
// Log an error to the console and show a readable message in the status area.
function reportCartError(error) {
  console.error(error);
  cartStatus.textContent=error.message || 'Unable to update your cart.';
}
 
// ---------------------------------------------------------------
// HTML templates
// ---------------------------------------------------------------
// Build the markup for one cart line. Quantity and line total are left empty here;
// update() fills them in afterwards.
function lineHTML(it){
  return `<article class="line" role="listitem" data-id="${esc(it.id)}">
    <div class="product-photo"><img src="${esc(it.img)}" alt="${esc(it.name)}" loading="lazy" onerror="this.style.display='none'"></div>
    <div class="line-info">
      <small class="product-category">${esc(it.category || it.cat || "")}</small>
      <h3 class="product-name">${esc(it.name)}</h3>
      <div class="price">${money(it.price)} each</div>
      <div class="ctrl">
        <div class="stepper" role="group" aria-label="Quantity for ${esc(it.name)}">
          <button type="button" data-act="minus" aria-label="Decrease quantity">${MINUS}</button>
          <output data-qty aria-live="polite"></output>
          <button type="button" data-act="plus" aria-label="Increase quantity">${PLUS}</button>
        </div>
        <button type="button" class="remove" data-act="remove" aria-label="Remove ${esc(it.name)} from cart">Remove</button>
      </div>
    </div>
    <div class="line-total" data-total></div>
  </article>`;
}
// Build the markup for one "You may also like" product card with an Add to Cart button.
function suggestHTML(p){
  return `<article class="product" data-id="${esc(p.id)}">
    <div class="product-photo"><img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'">
      <div class="quick"><button type="button" class="btn" data-add="${esc(p.id)}">Add to Cart <span>+</span></button></div>
    </div>
    <div class="product-info"><small class="product-category">${esc(p.category)}</small><h3 class="product-name">${esc(p.name)}</h3><div class="price">${money(p.price)}</div></div>
  </article>`;
}
 
// ---------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------
// Re-render every cart line from the items array.
function renderLines(){ $('lines').innerHTML=items.map(lineHTML).join(''); }
// Render up to 4 catalog products that are not already in the cart.
function renderSuggest(){
  // Set of ids currently in the cart, for quick lookup.
  const inCart=new Set(items.map(i=>i.id));
  const list=window.SiteStore.catalog.filter(p=>!inCart.has(p.id)).slice(0,4);
  // Hide the whole suggestions section when there is nothing to suggest.
  $('more').hidden=list.length===0;
  $('suggest').innerHTML=list.map(suggestHTML).join('');
}
// Refresh everything that depends on cart contents: counts, per-line values,
// totals, the free-shipping progress bar, and the header badge.
function update(){
  // Total number of units and the subtotal price across all lines.
  const count=items.reduce((s,i)=>s+i.qty,0);
  const sub=items.reduce((s,i)=>s+i.qty*i.price,0);
  const has=items.length>0;
  // Show the basket when there are items, otherwise show the empty state.
  $('basket').hidden=!has; $('empty').hidden=has;
  // Summary line under the page title (handles singular/plural).
  $('cart-lede').textContent=has?`${count} ${count===1?'item':'items'} ready for checkout.`:'Nothing here yet.';
  // Fill in quantity and line total for each rendered row.
  items.forEach(it=>{
    // CSS.escape keeps ids with special characters safe inside the selector.
    const row=document.querySelector(`.line[data-id="${CSS.escape(it.id)}"]`); if(!row) return;
    row.querySelector('[data-qty]').textContent=it.qty;
    row.querySelector('[data-total]').textContent=money(it.qty*it.price);
    // Disable minus at quantity 1 and plus at the maximum.
    row.querySelector('[data-act="minus"]').disabled=it.qty<=1;
    row.querySelector('[data-act="plus"]').disabled=it.qty>=MAX_QTY;
  });
  // Order summary totals (shipping is not added, so total equals subtotal).
  $('subtotal').textContent=money(sub); $('total').textContent=money(sub);
  // How much more is needed for free shipping, and whether it's already unlocked.
  const left=FREE_AT-sub, free=left<=0;
  $('shipping').textContent=free?'Free':'Calculated at checkout';
  $('ship-msg').innerHTML=free?"<strong>You've unlocked free shipping.</strong>":`You're <strong>${money(left)}</strong> away from free shipping.`;
  // Progress bar fill (capped at 100%) and its ARIA value for accessibility.
  $('ship-fill').style.width=Math.min(100,Math.round(sub/FREE_AT*100))+'%';
  $('ship-bar').setAttribute('aria-valuenow',Math.min(sub,FREE_AT));
  // Item count shown on the checkout button.
  $('checkout-count').textContent=`(${count} ${count===1?'item':'items'})`;
  // Sync the cart badge in the site header.
  window.SiteStore.updateBadge();
}
// Persist the cart, then refresh the UI. Any failure is shown via reportCartError.
function commit(){
  try {
    window.SiteStore.writeCart(items);
    window.SiteStore.updateBadge();
    cartStatus.textContent='';
    update();
  } catch(error) {
    reportCartError(error);
  }
}
 
// ---------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------
// Event delegation: one listener on the cart list handles plus, minus and remove buttons.
$('lines').addEventListener('click',e=>{
  // Ignore clicks that aren't on (or inside) an action button.
  const b=e.target.closest('button[data-act]'); if(!b) return;
  // Find the clicked row, its matching item, and the requested action.
  const row=b.closest('.line'); const it=items.find(i=>i.id===row.dataset.id); const a=b.dataset.act;
  if(a==='plus'&&it.qty<MAX_QTY) it.qty++;
  if(a==='minus'&&it.qty>1) it.qty--;
  // Remove: drop the item, remove its row, refresh suggestions (the product may now be suggested),
  // save, and move focus to the page title so keyboard users don't lose their place.
  if(a==='remove'){ items=items.filter(i=>i!==it); row.remove(); renderSuggest(); commit(); $('page-title').focus(); return; }
  commit();
});
// Event delegation for the "Add to Cart" buttons in the suggestions section.
$('suggest').addEventListener('click',e=>{
  const b=e.target.closest('button[data-add]'); if(!b) return;
  try {
    // Add the product through the shared store, then reload the cart from storage and redraw.
    window.SiteStore.add(b.dataset.add);
    items=window.SiteStore.readCart();
    renderLines(); renderSuggest(); update();
    cartStatus.textContent='';
  } catch(error) {
    reportCartError(error);
  }
});
 
// ---------------------------------------------------------------
// Initial load
// ---------------------------------------------------------------
// Render immediately from whatever cart data is available now.
items=window.SiteStore.readCart();
renderLines(); renderSuggest(); update();
// Once the store finishes loading (e.g. the catalog), refresh suggestions and totals.
// Errors during loading are reported to the user.
window.SiteStore.ready.then(()=>{
  renderSuggest(); update();
}).catch(reportCartError);
