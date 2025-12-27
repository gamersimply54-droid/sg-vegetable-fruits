// ---------- Supabase Init ----------
const SUPABASE_URL = 'https://gkxiujmyfsdyxnwhgyzc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreGl1am15ZnNkeXhud2hneXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NzU3MzUsImV4cCI6MjA4MjM1MTczNX0.oNv2crqvx94abVYFrNhnlQ_ACIdBe1UxMkIDHeBeH7U';

const client = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ---------- State ----------
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let productsCache = [];

// ---------- Helpers ----------
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function cartTotal() {
  return cart.reduce(
    (sum, item) => sum + item.price_per_250g * item.quantity,
    0
  );
}

function getProductById(id) {
  return productsCache.find(p => p.id === id);
}

// ---------- Cart Logic ----------
function addToCartById(id) {
  const product = getProductById(id);
  if (!product) return;

  const existing = cart.find(i => i.id === id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price_per_250g: product.price_per_250g,
      quantity: 1
    });
  }

  saveCart();
  renderCatalogView();
}

function increase(id) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.quantity += 1;
  saveCart();
  renderCatalogView();
}

function decrease(id) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.quantity -= 1;
  if (item.quantity <= 0) {
    cart = cart.filter(i => i.id !== id);
  }

  saveCart();
  renderCatalogView();
}

// ---------- Render Catalog ----------
async function renderCatalogView() {
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="header">Fresh Market</div>
    <div class="catalog" id="catalog"></div>
    <div class="cart-badge" onclick="renderCartView()">🛒 ${cart.length}</div>
  `;

  const { data: products, error } = await client
    .from('products')
    .select('*')
    .eq('available', true);

  if (error) {
    document.getElementById('catalog').innerText = 'Error loading products';
    console.error(error);
    return;
  }

  productsCache = products;
  const catalog = document.getElementById('catalog');

  products.forEach(product => {
    const cartItem = cart.find(i => i.id === product.id);

    const card = document.createElement('div');
    card.className = 'product-card';

    card.innerHTML = `
      <img src="${product.image}" />
      <h3>${product.name}</h3>
      <div class="price">₹${product.price_per_250g} / 250g</div>

      ${
        cartItem
          ? `
            <div style="display:flex;justify-content:center;gap:12px;align-items:center;margin-top:10px;">
              <button onclick="decrease('${product.id}')">−</button>
              <strong>${cartItem.quantity}</strong>
              <button onclick="increase('${product.id}')">+</button>
            </div>
          `
          : `
            <button class="btn" onclick="addToCartById('${product.id}')">
              Add to Cart
            </button>
          `
      }
    `;

    catalog.appendChild(card);
  });
}

// ---------- Render Cart ----------
function renderCartView() {
  const main = document.getElementById('main-content');

  if (cart.length === 0) {
    main.innerHTML = `
      <div class="header">Your Cart</div>
      <p style="padding:10px;">Cart is empty</p>
      <button class="btn" onclick="renderCatalogView()">Back to Shop</button>
    `;
    return;
  }

  const itemsHtml = cart
    .map(
      item => `
        <div class="product-card">
          <h3>${item.name}</h3>
          <div>₹${item.price_per_250g} × ${item.quantity}</div>
          <div style="margin-top:8px;">
            <button onclick="decrease('${item.id}')">−</button>
            <button onclick="increase('${item.id}')">+</button>
          </div>
        </div>
      `
    )
    .join('');

  main.innerHTML = `
    <div class="header">Your Cart</div>
    <div class="catalog">${itemsHtml}</div>
    <div style="padding:10px;font-weight:bold;">
      Total: ₹${cartTotal()}
    </div>
    <button class="btn" onclick="renderCheckoutView()">Proceed to Checkout</button>
    <button class="btn" style="margin-top:8px;background:#777;"
      onclick="renderCatalogView()">Continue Shopping</button>
  `;
}

// ---------- Checkout ----------
function renderCheckoutView() {
  const main = document.getElementById('main-content');

  main.innerHTML = `
    <div class="header">Checkout</div>

    <div class="catalog">
      <input id="cust-name" placeholder="Your Name" />
      <input id="cust-phone" placeholder="Phone Number" />
      <input id="cust-house" placeholder="House / Flat No." />

      <div style="margin:10px 0;font-weight:bold;">
        Total: ₹${cartTotal()}
      </div>

      <button class="btn" onclick="placeOrder()">Place Order</button>
      <button class="btn" style="margin-top:8px;background:#777;"
        onclick="renderCartView()">Back to Cart</button>
    </div>
  `;
}

async function placeOrder() {
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const house = document.getElementById('cust-house').value.trim();

  if (!name || !phone || !house) {
    alert('Please fill all details');
    return;
  }

  const { error } = await client.from('orders').insert({
    customer_name: name,
    customer_phone: phone,
    house_number: house,
    items: cart,
    total_amount: cartTotal()
  });

  if (error) {
    alert('Error placing order');
    console.error(error);
    return;
  }

  alert('Order placed successfully!');
  cart = [];
  saveCart();
  renderCatalogView();
}

// ---------- Start App ----------
document.addEventListener('DOMContentLoaded', () => {
  renderCatalogView();
});