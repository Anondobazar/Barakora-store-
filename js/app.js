import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
/* =========================================
   BARAKORA E-COMMERCE
   Main Application
   ========================================= */

"use strict";


/* =========================================
   APPLICATION STATE
   ========================================= */

const state = {
  products: [],
  categories: [],
  cart: loadCart(),
  selectedCategory: "all",
  searchQuery: ""
};


/* =========================================
   DOM ELEMENTS
   ========================================= */

const productGrid = document.getElementById("productGrid");
const categoryList = document.getElementById("categoryList");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");


/* =========================================
   INITIALIZE APPLICATION
   ========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  updateCartCount();

  setupSearch();
  setupCartButton();

  renderCategories();

  await initializeDatabase();
});
  /*
   * Products will be loaded from Firestore
   * after Firebase configuration is added.
   */
});


/* =========================================
   LOCAL STORAGE - CART
   ========================================= */

function loadCart() {
  try {
    const savedCart = localStorage.getItem("barakora_cart");

    if (!savedCart) {
      return [];
    }

    const cart = JSON.parse(savedCart);

    return Array.isArray(cart) ? cart : [];

  } catch (error) {
    console.error("Cart loading failed:", error);
    return [];
  }
}


function saveCart() {
  try {
    localStorage.setItem(
      "barakora_cart",
      JSON.stringify(state.cart)
    );

  } catch (error) {
    console.error("Cart saving failed:", error);
  }
}


/* =========================================
   CART COUNT
   ========================================= */

function updateCartCount() {

  const totalItems = state.cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  if (cartCount) {
    cartCount.textContent = totalItems;
  }
}


/* =========================================
   SEARCH
   ========================================= */

function setupSearch() {

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", () => {

    state.searchQuery =
      searchInput.value.trim().toLowerCase();

    renderProducts();
  });


  if (searchBtn) {

    searchBtn.addEventListener("click", () => {

      state.searchQuery =
        searchInput.value.trim().toLowerCase();

      renderProducts();
    });

  }
}


/* =========================================
   CATEGORY SYSTEM
   ========================================= */

function renderCategories() {

  if (!categoryList) {
    return;
  }

  categoryList.innerHTML = "";


  const allButton = createCategoryButton(
    "all",
    "সব পণ্য"
  );

  categoryList.appendChild(allButton);


  state.categories.forEach(category => {

    const button = createCategoryButton(
      category.id,
      category.name
    );

    categoryList.appendChild(button);

  });
}


function createCategoryButton(id, name) {

  const button = document.createElement("button");

  button.type = "button";
  button.className = "category-item";

  if (state.selectedCategory === id) {
    button.classList.add("active");
  }

  button.textContent = name;


  button.addEventListener("click", () => {

    state.selectedCategory = id;

    renderCategories();
    renderProducts();

  });


  return button;
}


/* =========================================
   PRODUCT FILTERING
   ========================================= */

function getFilteredProducts() {

  let products = [...state.products];


  if (state.selectedCategory !== "all") {

    products = products.filter(product => {

      return String(product.categoryId) ===
        String(state.selectedCategory);

    });

  }


  if (state.searchQuery) {

    products = products.filter(product => {

      const name =
        String(product.name || "").toLowerCase();

      const description =
        String(product.description || "").toLowerCase();

      const category =
        String(product.categoryName || "").toLowerCase();


      return (
        name.includes(state.searchQuery) ||
        description.includes(state.searchQuery) ||
        category.includes(state.searchQuery)
      );

    });

  }


  return products;
}


/* =========================================
   PRODUCT DISPLAY
   ========================================= */

function renderProducts() {

  if (!productGrid) {
    return;
  }


  const products = getFilteredProducts();


  productGrid.innerHTML = "";


  if (products.length === 0) {

    const empty = document.createElement("div");

    empty.className = "empty-state";

    empty.textContent =
      state.products.length === 0
        ? "এখনো কোনো পণ্য যোগ করা হয়নি।"
        : "আপনার খোঁজার সঙ্গে মিলছে এমন কোনো পণ্য পাওয়া যায়নি।";

    productGrid.appendChild(empty);

    return;
  }


  products.forEach(product => {

    const card = createProductCard(product);

    productGrid.appendChild(card);

  });
}


/* =========================================
   PRODUCT CARD
   ========================================= */

function createProductCard(product) {

  const card = document.createElement("article");

  card.className = "product-card";


  const image = document.createElement("img");

  image.className = "product-image";

  image.loading = "lazy";

  image.alt =
    product.name || "Barakora product";


  if (product.imageUrl) {

    image.src = product.imageUrl;

  } else {

    image.alt = "Product image unavailable";

  }


  const info = document.createElement("div");

  info.className = "product-info";


  const name = document.createElement("h3");

  name.className = "product-name";

  name.textContent =
    product.name || "Unnamed product";


  const price = document.createElement("div");

  price.className = "product-price";

  price.textContent =
    formatBDT(product.price);


  const actions = document.createElement("div");

  actions.className = "product-actions";


  const addCart = document.createElement("button");

  addCart.type = "button";

  addCart.className = "add-cart-btn";

  addCart.textContent = "কার্টে যোগ";

  addCart.addEventListener("click", () => {

    addToCart(product);

  });


  const buyNow = document.createElement("button");

  buyNow.type = "button";

  buyNow.className = "buy-now-btn";

  buyNow.textContent = "এখনই কিনুন";

  buyNow.addEventListener("click", () => {

    buyProductNow(product);

  });


  actions.appendChild(addCart);
  actions.appendChild(buyNow);


  info.appendChild(name);
  info.appendChild(price);
  info.appendChild(actions);


  card.appendChild(image);
  card.appendChild(info);


  return card;
}


/* =========================================
   ADD TO CART
   ========================================= */

function addToCart(product) {

  if (!product || !product.id) {

    console.error(
      "A valid product ID is required."
    );

    return;
  }


  const existingItem =
    state.cart.find(
      item => String(item.id) === String(product.id)
    );


  if (existingItem) {

    existingItem.quantity += 1;

  } else {

    state.cart.push({

      id: product.id,

      name: product.name || "",

      price: Number(product.price || 0),

      imageUrl: product.imageUrl || "",

      quantity: 1

    });

  }


  saveCart();

  updateCartCount();


  showMessage("পণ্যটি কার্টে যোগ হয়েছে।");
}


/* =========================================
   REMOVE FROM CART
   ========================================= */

function removeFromCart(productId) {

  state.cart =
    state.cart.filter(
      item => String(item.id) !== String(productId)
    );


  saveCart();

  updateCartCount();
}


/* =========================================
   CHANGE CART QUANTITY
   ========================================= */

function changeCartQuantity(productId, quantity) {

  const item =
    state.cart.find(
      cartItem =>
        String(cartItem.id) === String(productId)
    );


  if (!item) {
    return;
  }


  const newQuantity =
    Math.max(1, Number(quantity));


  item.quantity = newQuantity;


  saveCart();

  updateCartCount();
}


/* =========================================
   BUY NOW
   ========================================= */

function buyProductNow(product) {

  if (!product || !product.id) {
    return;
  }


  /*
   * The checkout page will be connected
   * in the next stages.
   */

  addToCart(product);


  window.location.href =
    "checkout.html";
}


/* =========================================
   CART BUTTON
   ========================================= */

function setupCartButton() {

  if (!cartBtn) {
    return;
  }


  cartBtn.addEventListener("click", () => {

    window.location.href =
      "cart.html";

  });
}


/* =========================================
   PRICE FORMAT
   ========================================= */

function formatBDT(price) {

  const amount =
    Number(price || 0);


  return "৳" +
    amount.toLocaleString("bn-BD");
}


/* =========================================
   USER MESSAGE
   ========================================= */

function showMessage(message) {

  const existing =
    document.getElementById(
      "barakora-message"
    );


  if (existing) {
    existing.remove();
  }


  const element =
    document.createElement("div");


  element.id =
    "barakora-message";


  element.textContent =
    message;


  element.style.position =
    "fixed";

  element.style.left =
    "50%";

  element.style.bottom =
    "25px";

  element.style.transform =
    "translateX(-50%)";

  element.style.zIndex =
    "9999";

  element.style.padding =
    "12px 18px";

  element.style.borderRadius =
    "8px";

  element.style.background =
    "#111827";

  element.style.color =
    "#ffffff";

  element.style.fontSize =
    "14px";

  element.style.boxShadow =
    "0 5px 20px rgba(0,0,0,.2)";


  document.body.appendChild(element);


  setTimeout(() => {

    element.remove();

  }, 2500);
}


/* =========================================
   FIRESTORE PRODUCT LOADER
   ========================================= */

/*
 * This function is intentionally separated
 * from the main application.
 *
 * Firebase will be connected here after
 * the Firebase configuration/module files
 * are added.
 */

async function loadProductsFromDatabase() {
  try {
    const productsSnapshot = await getDocs(
      collection(db, "products")
    );

    const products = [];

    productsSnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log("Products loaded:", products);

    return products;

  } catch (error) {
    console.error(
      "Product database loading failed:",
      error
    );

    return [];
  }
   }


/* =========================================
   DATABASE INITIALIZATION
   ========================================= */

async function initializeDatabase() {

  const products =
    await loadProductsFromDatabase();


  if (Array.isArray(products)) {

    state.products =
      products;

  }


  renderProducts();
}


/* =========================================
   PUBLIC APP API
   ========================================= */

window.BarakoraApp = {

  addToCart,

  removeFromCart,

  changeCartQuantity,

  buyProductNow,

  formatBDT,

  getCart: () => [...state.cart],

  getProducts: () => [...state.products]

};
