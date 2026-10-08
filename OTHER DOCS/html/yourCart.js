
const btn=document.getElementById('menu-btn'),nav=document.getElementById('nav');
btn.addEventListener('click',()=>{const o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o)});

const FREE_SHIPPING_AT = 75;
// Sample data. Replace with your real cart (localStorage, API, etc.).
let items = [
  {id:'golden-hour', cat:'Jewelry', name:'Golden Hour', price:26, qty:2, img:'/images/bongiwe/jewerlyWatch.jpg', alt:'Golden Hour gold watch', stock:'In stock'},
  {id:'sunday-best-heels', cat:'Shoes', name:'Sunday Best Heels', price:48, qty:1, img:'/images/bongiwe/sundayBestHeels.jpg', alt:'Sunday Best white heels', stock:'In stock'}
];
const MAX_QTY = 10;
const $ = id => document.getElementById(id);
const money = n => 'k' + n.toFixed(2);
const MINUS = '<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M0 256c0-17.7 14.3-32 32-32h384c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z"/></svg>';
const PLUS = '<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M256 64c0-17.7-14.300-32-32-32s-32 14.300-32 32v160H32c-17.700 0-32 14.300-32 32s14.300 32 32 32h160v160c0 17.700 14.300 32 32 32s32-14.300 32-32V288h160c17.700 0 32-14.300 32-32s-14.300-32-32-32H256V64z"/></svg>';

function lineHTML(it){
  return `<li class="line" data-id="${it.id}">
    <div class="thumb"><img src="${it.img}" alt="${it.alt}" onerror="this.style.display='none'"></div>
    <div class="line-main">
      <small class="cat">${it.cat}</small>
      <h3 class="name">${it.name}</h3>
      <p class="meta">${money(it.price)} each &middot; <span class="ok">${it.stock}</span></p>
    </div>
    <div class="line-total" data-total></div>
    <div class="ctrl">
      <div class="stepper" role="group" aria-label="Quantity for ${it.name}">
        <button type="button" data-act="minus" aria-label="Decrease quantity">${MINUS}</button>
        <output data-qty aria-live="polite"></output>
        <button type="button" data-act="plus" aria-label="Increase quantity">${PLUS}</button>
      </div>
      <button type="button" class="remove" data-act="remove" aria-label="Remove ${it.name} from cart">Remove</button>
    </div>
  </li>`;
}

function update(){
  const count = items.reduce((s,i)=>s+i.qty,0);
  const sub = items.reduce((s,i)=>s+i.qty*i.price,0);
  const has = items.length>0;
  $('basket').hidden = !has;
  $('empty').hidden = has;
  $('cart-lede').textContent = has ? `${count} ${count===1?'item':'items'} ready for checkout.` : 'Nothing here yet.';
  items.forEach(it=>{
    const row = document.querySelector(`[data-id="${it.id}"]`);
    if(!row) return;
    row.querySelector('[data-qty]').textContent = it.qty;
    row.querySelector('[data-total]').textContent = money(it.qty*it.price);
    row.querySelector('[data-act="minus"]').disabled = it.qty<=1;
    row.querySelector('[data-act="plus"]').disabled = it.qty>=MAX_QTY;
  });
  $('subtotal').textContent = money(sub);
  $('total').textContent = money(sub);
  const left = FREE_SHIPPING_AT - sub;
  const free = left <= 0;
  $('shipping').textContent = free ? 'Free' : 'Calculated at checkout';
  $('ship-msg').innerHTML = free ? "<strong>You've unlocked free shipping.</strong>" : `Add <strong>${money(left)}</strong> more for free shipping.`;
  const pct = Math.min(100, Math.round(sub/FREE_SHIPPING_AT*100));
  $('ship-fill').style.width = pct+'%';
  $('ship-bar').setAttribute('aria-valuenow', Math.min(sub,FREE_SHIPPING_AT));
  $('checkout-count').textContent = `(${count} ${count===1?'item':'items'})`;
  const badge = document.querySelector('.cart');
  if(badge){ badge.lastChild.textContent = count; badge.setAttribute('aria-label',`Cart, ${count} ${count===1?'item':'items'}`); }
}

$('lines').innerHTML = items.map(lineHTML).join('');
$('lines').addEventListener('click', e=>{
  const btn = e.target.closest('button[data-act]');
  if(!btn) return;
  const row = btn.closest('.line');
  const it = items.find(i=>i.id===row.dataset.id);
  const act = btn.dataset.act;
  if(act==='plus' && it.qty<MAX_QTY) it.qty++;
  if(act==='minus' && it.qty>1) it.qty--;
  if(act==='remove'){
    items = items.filter(i=>i!==it);
    row.remove();
    update();
    $('page-title').focus();
    return;
  }
  update();
});
update();