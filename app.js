/* ==========================================================================
   Kashi Kebab Sagasti (Arrandi) - Lógica de Gestión Comercial, TPV y Stock
   ========================================================================== */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    products: 'kashi_products_v1',
    invoices: 'kashi_invoices_v1',
    invoiceSeq: 'kashi_invoice_seq_v1',
    cart: 'kashi_cart_v1'
  };

  const CFG = window.KASHI_CONFIG;

  const state = {
    products: [],
    cart: [],
    invoices: [],
    invoiceSeq: 1,
    activeTab: 'menu',
    activeCategory: 'Todos',
    menuSearch: '',
    stockFilter: 'all',
    stockSearch: '',
    invoiceFilter: 'all',
    invoiceSearch: '',
    deliveryMode: 'pickup', // 'pickup' | 'delivery'
    couponCode: null,
    ivaRate: 10,
    paymentMethod: 'cash',  // 'cash' | 'card'
    cashGiven: '',
    scheduleForOpening: false,
    useSimulatedTime: false,
    simulatedTimeStr: '21:30',
    activeConfiguratorProductId: null,
    activeTicketInvoice: null
  };

  /* -------------------- Utilidades de formato y cálculo -------------------- */
  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function formatEuro(amount) {
    return round2(amount).toFixed(2).replace('.', ',') + ' €';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 3400);
  }

  /* -------------------- Persistencia localStorage -------------------- */
  function loadState() {
    try {
      const savedProducts = localStorage.getItem(STORAGE_KEYS.products);
      state.products = savedProducts
        ? JSON.parse(savedProducts)
        : structuredClone(window.INITIAL_PRODUCTS);

      const savedInvoices = localStorage.getItem(STORAGE_KEYS.invoices);
      state.invoices = savedInvoices ? JSON.parse(savedInvoices) : [];

      const savedSeq = localStorage.getItem(STORAGE_KEYS.invoiceSeq);
      state.invoiceSeq = savedSeq ? Math.max(1, parseInt(savedSeq, 10)) : 1;

      const savedCart = localStorage.getItem(STORAGE_KEYS.cart);
      state.cart = savedCart ? JSON.parse(savedCart) : [];
    } catch (err) {
      console.warn('Error leyendo localStorage, usando valores iniciales:', err);
      state.products = structuredClone(window.INITIAL_PRODUCTS);
      state.invoices = [];
      state.invoiceSeq = 1;
      state.cart = [];
    }
  }

  function saveProducts() {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(state.products));
  }

  function saveCart() {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(state.cart));
  }

  function saveInvoices() {
    localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(state.invoices));
    localStorage.setItem(STORAGE_KEYS.invoiceSeq, String(state.invoiceSeq));
  }

  function getProductById(id) {
    return state.products.find((p) => p.id === id) || null;
  }

  /* -------------------- Horario Comercial (13:00 a 01:00) -------------------- */
  function getActiveDateTime() {
    const now = new Date();
    if (!state.useSimulatedTime || !state.simulatedTimeStr) {
      return now;
    }
    const [hh, mm] = state.simulatedTimeStr.split(':').map((x) => parseInt(x, 10));
    const sim = new Date(now);
    sim.setHours(Number.isFinite(hh) ? hh : 13, Number.isFinite(mm) ? mm : 0, 0, 0);
    return sim;
  }

  function evaluateSchedule() {
    const dt = getActiveDateTime();
    const hours = dt.getHours();
    const mins = dt.getMinutes();
    const totalMins = hours * 60 + mins;

    // Abierto de 13:00 (780 min) hasta 00:59 (< 60 min)
    const isOpen = totalMins >= CFG.openHour * 60 || totalMins < CFG.closeHour * 60;
    // Cierre próximo: entre 00:30 y 00:59 (< 30 min para la 01:00)
    const isClosingSoon = isOpen && totalMins >= (CFG.closeHour * 60 - CFG.closingWarningMinutes) && totalMins < CFG.closeHour * 60;
    const minutesToClose = isClosingSoon ? CFG.closeHour * 60 - totalMins : null;

    return {
      dt,
      timeLabel: `${pad2(hours)}:${pad2(mins)}`,
      isOpen,
      isClosingSoon,
      minutesToClose
    };
  }

  function renderScheduleStatus() {
    const sched = evaluateSchedule();

    const badge = document.getElementById('storeStatusBadge');
    const statusText = document.getElementById('storeStatusText');
    const clockVal = document.getElementById('clockTimeValue');
    const clockTag = document.getElementById('clockModeTag');
    const closingPill = document.getElementById('closingSoonBadge');
    const closingText = document.getElementById('closingSoonText');
    const simInput = document.getElementById('simTimeInput');

    clockVal.textContent = sched.timeLabel;
    if (!state.useSimulatedTime && document.activeElement !== simInput) {
      simInput.value = sched.timeLabel;
    }

    clockTag.textContent = state.useSimulatedTime ? 'Simulada' : 'Hora real';
    clockTag.classList.toggle('is-sim', state.useSimulatedTime);

    badge.classList.toggle('status-open', sched.isOpen);
    badge.classList.toggle('status-closed', !sched.isOpen);
    statusText.textContent = sched.isOpen ? 'Abierto ahora' : 'Cerrado';

    if (sched.isClosingSoon) {
      closingPill.classList.remove('hidden');
      closingText.textContent = `¡Últimos pedidos! Cerramos pronto (${sched.minutesToClose} min)`;
    } else {
      closingPill.classList.add('hidden');
    }

    const banner = document.getElementById('scheduleAlertBanner');
    const bannerTitle = document.getElementById('scheduleAlertTitle');
    const bannerDesc = document.getElementById('scheduleAlertDesc');
    const bannerIcon = document.getElementById('scheduleAlertIcon');

    banner.classList.remove('is-closed', 'is-closing-soon', 'hidden');
    if (!sched.isOpen) {
      banner.classList.add('is-closed');
      bannerIcon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      bannerTitle.textContent = 'Cerrado ahora. Nuestro horario es de 13:00 a 01:00';
      bannerDesc.textContent = 'El pago inmediato está desactivado fuera de horario. Puedes preparar tu carrito y marcarlo como "Programado para apertura (13:00)".';
    } else if (sched.isClosingSoon) {
      banner.classList.add('is-closing-soon');
      bannerIcon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      bannerTitle.textContent = `¡Últimos pedidos! Cerramos pronto (en ${sched.minutesToClose} minutos, a la 01:00)`;
      bannerDesc.textContent = 'Finaliza tu pedido cuanto antes para garantizar preparación y reparto antes del cierre.';
    } else {
      banner.classList.add('hidden');
    }

    if (sched.isOpen) {
      state.scheduleForOpening = false;
      const checkEl = document.getElementById('scheduleForOpeningCheck');
      if (checkEl) checkEl.checked = false;
    }

    updateCheckoutState();
  }

  /* -------------------- Cálculo de demanda de stock en carrito -------------------- */
  function computeCartStockDemand(cartItems = state.cart) {
    const demand = {};
    for (const item of cartItems) {
      demand[item.productId] = (demand[item.productId] || 0) + item.quantity;
      if (item.config && item.config.isMenu) {
        demand[CFG.comboFriesId] = (demand[CFG.comboFriesId] || 0) + item.quantity;
        if (item.config.drinkProductId) {
          demand[item.config.drinkProductId] = (demand[item.config.drinkProductId] || 0) + item.quantity;
        }
      }
    }
    return demand;
  }

  function canSatisfyItemIncrement(cartItem, deltaQty = 1) {
    const virtualCart = state.cart.map((it) =>
      it.uid === cartItem.uid ? { ...it, quantity: it.quantity + deltaQty } : it
    );
    const demand = computeCartStockDemand(virtualCart);
    for (const [prodId, needed] of Object.entries(demand)) {
      const prod = getProductById(prodId);
      if (!prod || prod.stock < needed) {
        return { ok: false, missingProduct: prod ? prod.name : prodId };
      }
    }
    return { ok: true };
  }

  /* -------------------- Renderizado de Categorías y Carta -------------------- */
  function renderCategoryTabs() {
    const bar = document.getElementById('categoryFilterBar');
    bar.innerHTML = CFG.categories
      .map((cat) => {
        const active = state.activeCategory === cat ? 'active' : '';
        return `<button type="button" class="cat-pill ${active}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
      })
      .join('');
  }

  function getTagClass(tag) {
    const lower = tag.toLowerCase();
    if (lower.includes('picante')) return 'tag-spicy';
    if (lower.includes('vegetar') || lower.includes('vegano')) return 'tag-veg';
    return '';
  }

  function renderMenuGrid() {
    const grid = document.getElementById('menuGrid');
    const search = state.menuSearch.trim().toLowerCase();

    const filtered = state.products.filter((prod) => {
      const catOk = state.activeCategory === 'Todos' || prod.category === state.activeCategory;
      const searchOk =
        !search ||
        prod.name.toLowerCase().includes(search) ||
        prod.description.toLowerCase().includes(search) ||
        prod.category.toLowerCase().includes(search);
      return catOk && searchOk;
    });

    document.getElementById('activeCategoryTitle').textContent =
      state.activeCategory === 'Todos' ? 'Toda la Carta' : state.activeCategory;
    document.getElementById('visibleDishCount').textContent =
      `${filtered.length} ${filtered.length === 1 ? 'plato' : 'platos'}`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="cart-empty" style="grid-column: 1 / -1;">
          No se han encontrado platos que coincidan con tu búsqueda.
        </div>`;
      return;
    }

    const demand = computeCartStockDemand();

    grid.innerHTML = filtered
      .map((prod) => {
        const inCartQty = demand[prod.id] || 0;
        const remainingStock = Math.max(0, prod.stock - inCartQty);
        const isOut = prod.stock <= 0;
        const isLow = prod.stock > 0 && prod.stock < 5;

        let stockBadge = `<span class="dish-stock-badge stock-ok">${prod.stock} uds. disponibles</span>`;
        if (isOut) {
          stockBadge = `<span class="dish-stock-badge stock-out">Agotado</span>`;
        } else if (isLow) {
          stockBadge = `<span class="dish-stock-badge stock-low">¡Últimas ${prod.stock} uds.!</span>`;
        }

        const tagsHtml = (prod.tags || [])
          .map((t) => `<span class="dish-tag ${getTagClass(t)}">${escapeHtml(t)}</span>`)
          .join('');

        const btnLabel = isOut
          ? 'Agotado'
          : prod.customizable
          ? 'Elegir / Añadir'
          : '+ Añadir';

        const fallbackSrc = window.getCategoryFallbackSvg(prod.category, prod.name);
        const imgSrc = prod.image || fallbackSrc;

        return `
          <article class="dish-card ${isOut ? 'is-out-of-stock' : ''}">
            ${isOut ? '<div class="sold-out-ribbon">Agotado</div>' : ''}
            <div class="dish-media">
              <img
                src="${escapeHtml(imgSrc)}"
                alt="${escapeHtml(prod.name)}"
                loading="lazy"
                data-fallback="${escapeHtml(fallbackSrc)}"
                onerror="if(!this.dataset.failed){this.dataset.failed='1';this.src=this.dataset.fallback;}"
              />
              <span class="dish-category-badge">${escapeHtml(prod.category)}</span>
              ${stockBadge}
            </div>
            <div class="dish-body">
              <h3 class="dish-title">${escapeHtml(prod.name)}</h3>
              <p class="dish-desc">${escapeHtml(prod.description)}</p>
              <div class="dish-tags">${tagsHtml}</div>
              <div class="dish-footer">
                <div class="dish-price-block">
                  <span class="dish-price">${formatEuro(prod.price)}</span>
                  <span class="dish-price-note">Precio base sin IVA${inCartQty > 0 && !isOut ? ` · ${remainingStock} disp.` : ''}</span>
                </div>
                <button
                  type="button"
                  class="btn-primary ${prod.customizable ? '' : 'btn-dark'}"
                  data-action="add-dish"
                  data-id="${escapeHtml(prod.id)}"
                  ${isOut ? 'disabled' : ''}
                >
                  ${btnLabel}
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  /* -------------------- Configurador Interactivo de 4 Pasos -------------------- */
  function openConfigurator(productId) {
    const product = getProductById(productId);
    if (!product || product.stock <= 0) {
      showToast('Este plato está agotado actualmente.', 'error');
      return;
    }

    const demand = computeCartStockDemand();
    if (product.stock - (demand[product.id] || 0) <= 0) {
      showToast(`Ya tienes todas las unidades disponibles de ${product.name} en tu carrito.`, 'error');
      return;
    }

    state.activeConfiguratorProductId = productId;
    document.getElementById('cfgCategoryLabel').textContent = product.category;
    document.getElementById('cfgDishTitle').textContent = product.name;
    document.getElementById('cfgDishDesc').textContent = product.description;

    // Paso 1: Carnes
    const meatDefault = product.id.includes('falafel') ? 'falafel' : 'mixto';
    document.getElementById('cfgMeatOptions').innerHTML = CFG.configuratorOptions.meats
      .map(
        (m) => `
        <label class="choice-card ${m.id === meatDefault ? 'active' : ''}">
          <input type="radio" name="cfgMeat" value="${m.id}" ${m.id === meatDefault ? 'checked' : ''} />
          <div>
            <strong>${escapeHtml(m.label)}</strong>
            <span>${escapeHtml(m.note)}</span>
          </div>
        </label>`
      )
      .join('');

    // Paso 2: Verduras
    document.getElementById('cfgVeggieOptions').innerHTML = CFG.configuratorOptions.veggies
      .map(
        (v) => `
        <label class="choice-card ${v.defaultChecked ? 'active' : ''}">
          <input type="checkbox" name="cfgVeggie" value="${v.id}" ${v.defaultChecked ? 'checked' : ''} />
          <div>
            <strong>${escapeHtml(v.label)}</strong>
            <span>${v.price > 0 ? '+' + formatEuro(v.price) : 'Incluido'}</span>
          </div>
        </label>`
      )
      .join('');

    // Paso 3: Salsas
    document.getElementById('cfgSauceOptions').innerHTML = CFG.configuratorOptions.sauces
      .map(
        (s) => `
        <label class="choice-card ${s.defaultChecked ? 'active' : ''}">
          <input type="checkbox" name="cfgSauce" value="${s.id}" ${s.defaultChecked ? 'checked' : ''} />
          <div>
            <strong>${escapeHtml(s.label)}</strong>
          </div>
        </label>`
      )
      .join('');

    // Paso 4: Combo Menú (verificando stock de Patatas + Bebidas)
    const friesProd = getProductById(CFG.comboFriesId);
    const friesRemaining = friesProd ? Math.max(0, friesProd.stock - (demand[friesProd.id] || 0)) : 0;

    const comboRadioSolo = document.querySelector('input[name="comboMode"][value="solo"]');
    const comboRadioMenu = document.getElementById('comboRadioMenu');
    const comboCard = document.getElementById('comboOptionCard');
    const friesLabel = document.getElementById('comboFriesStockLabel');

    comboRadioSolo.checked = true;
    document.querySelectorAll('#cfgComboModeOptions .choice-card').forEach((c) => c.classList.remove('active'));
    comboRadioSolo.closest('.choice-card').classList.add('active');
    document.getElementById('cfgDrinkSelectorBox').classList.add('hidden');

    const anyDrinkAvail = CFG.comboDrinks.some((d) => {
      const p = getProductById(d.productId);
      return p && p.stock - (demand[p.id] || 0) > 0;
    });

    if (friesRemaining <= 0 || !anyDrinkAvail) {
      comboRadioMenu.disabled = true;
      comboCard.classList.add('is-disabled');
      friesLabel.textContent = friesRemaining <= 0 ? 'Sin stock de Patatas Fritas' : 'Sin stock de bebidas';
    } else {
      comboRadioMenu.disabled = false;
      comboCard.classList.remove('is-disabled');
      friesLabel.textContent = `Incluye Patatas (${friesRemaining} disp.) + Bebida`;
    }

    // Bebidas del combo
    let firstAvailSelected = false;
    document.getElementById('cfgDrinkOptions').innerHTML = CFG.comboDrinks
      .map((d) => {
        const dp = getProductById(d.productId);
        const rem = dp ? Math.max(0, dp.stock - (demand[dp.id] || 0)) : 0;
        const disabled = rem <= 0;
        const checked = !disabled && !firstAvailSelected;
        if (checked) firstAvailSelected = true;
        return `
          <label class="choice-card ${checked ? 'active' : ''} ${disabled ? 'is-disabled' : ''}">
            <input type="radio" name="cfgDrink" value="${d.productId}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
            <div>
              <strong>${escapeHtml(d.label)}</strong>
              <span>${disabled ? 'Agotada' : `${rem} uds.`}</span>
            </div>
          </label>`;
      })
      .join('');

    updateConfiguratorPreview();
    document.getElementById('configuratorModal').classList.remove('hidden');
  }

  function closeConfigurator() {
    document.getElementById('configuratorModal').classList.add('hidden');
    state.activeConfiguratorProductId = null;
  }

  function readConfiguratorSelection() {
    const product = getProductById(state.activeConfiguratorProductId);
    if (!product) return null;

    const meatId = document.querySelector('input[name="cfgMeat"]:checked')?.value || 'mixto';
    const meatObj = CFG.configuratorOptions.meats.find((m) => m.id === meatId);

    const selectedVeggies = Array.from(document.querySelectorAll('input[name="cfgVeggie"]:checked')).map(
      (el) => CFG.configuratorOptions.veggies.find((v) => v.id === el.value)
    ).filter(Boolean);

    const selectedSauces = Array.from(document.querySelectorAll('input[name="cfgSauce"]:checked')).map(
      (el) => CFG.configuratorOptions.sauces.find((s) => s.id === el.value)
    ).filter(Boolean);

    const isMenu = document.querySelector('input[name="comboMode"]:checked')?.value === 'menu';
    const drinkProdId = isMenu ? document.querySelector('input[name="cfgDrink"]:checked')?.value : null;
    const drinkObj = drinkProdId ? CFG.comboDrinks.find((d) => d.productId === drinkProdId) : null;

    const veggiesExtra = selectedVeggies.reduce((sum, v) => sum + (v.price || 0), 0);
    const menuExtra = isMenu ? CFG.menuComboPrice : 0;
    const unitBasePrice = round2(product.price + veggiesExtra + menuExtra);

    return {
      product,
      unitBasePrice,
      config: {
        meat: meatObj ? meatObj.label : 'Mixto',
        veggies: selectedVeggies.map((v) => v.label),
        hasFeta: selectedVeggies.some((v) => v.id === 'feta'),
        sauces: selectedSauces.length > 0 ? selectedSauces.map((s) => s.label) : ['Sin salsa'],
        isMenu,
        drinkProductId: drinkProdId,
        drinkLabel: drinkObj ? drinkObj.label : null
      }
    };
  }

  function updateConfiguratorPreview() {
    // Sincronizar clases visuales activas en tarjetas
    document.querySelectorAll('#configuratorModal .choice-card input').forEach((inp) => {
      inp.closest('.choice-card').classList.toggle('active', inp.checked);
    });

    const isMenu = document.querySelector('input[name="comboMode"]:checked')?.value === 'menu';
    document.getElementById('cfgDrinkSelectorBox').classList.toggle('hidden', !isMenu);

    const sel = readConfiguratorSelection();
    if (sel) {
      document.getElementById('cfgUnitPrice').textContent = formatEuro(sel.unitBasePrice);
    }
  }

  function addSimpleProductToCart(productId) {
    const product = getProductById(productId);
    if (!product || product.stock <= 0) {
      showToast('Producto agotado en almacén.', 'error');
      return;
    }

    const existing = state.cart.find((item) => item.productId === productId && !item.config);
    const demand = computeCartStockDemand();
    const currentUsed = demand[productId] || 0;

    if (currentUsed + 1 > product.stock) {
      showToast(`No hay más stock disponible de ${product.name} (${product.stock} uds.).`, 'error');
      return;
    }

    if (existing) {
      existing.quantity += 1;
    } else {
      state.cart.push({
        uid: `simple-${product.id}`,
        productId: product.id,
        name: product.name,
        unitBasePrice: round2(product.price),
        quantity: 1,
        config: null
      });
    }

    saveCart();
    renderAllStoreViews();
    showToast(`${product.name} añadido al pedido`, 'success');
  }

  function confirmConfiguratorAdd() {
    const sel = readConfiguratorSelection();
    if (!sel) return;

    if (sel.config.isMenu && !sel.config.drinkProductId) {
      showToast('Selecciona una bebida disponible para completar el Menú.', 'error');
      return;
    }

    // Construir firma única para agrupar configuraciones idénticas
    const sigObj = {
      id: sel.product.id,
      meat: sel.config.meat,
      veggies: sel.config.veggies,
      sauces: sel.config.sauces,
      isMenu: sel.config.isMenu,
      drink: sel.config.drinkProductId
    };
    const uid = 'cfg-' + btoa(unescape(encodeURIComponent(JSON.stringify(sigObj)))).slice(0, 28);

    const existing = state.cart.find((it) => it.uid === uid);
    const nextCart = existing
      ? state.cart.map((it) => (it.uid === uid ? { ...it, quantity: it.quantity + 1 } : it))
      : [
          ...state.cart,
          {
            uid,
            productId: sel.product.id,
            name: sel.product.name,
            unitBasePrice: sel.unitBasePrice,
            quantity: 1,
            config: sel.config
          }
        ];

    const demand = computeCartStockDemand(nextCart);
    for (const [prodId, needed] of Object.entries(demand)) {
      const p = getProductById(prodId);
      if (!p || p.stock < needed) {
        showToast(`Stock insuficiente de ${p ? p.name : prodId} para añadir esta configuración.`, 'error');
        return;
      }
    }

    state.cart = nextCart;
    saveCart();
    closeConfigurator();
    renderAllStoreViews();
    showToast(`${sel.product.name} añadido al pedido`, 'success');
  }

  /* -------------------- Carrito, Impuestos y Pago -------------------- */
  function calculateCartTotals() {
    const productSubtotal = round2(
      state.cart.reduce((sum, it) => sum + it.unitBasePrice * it.quantity, 0)
    );
    const coupon = state.couponCode ? CFG.coupons[state.couponCode] : null;
    const discountAmount = coupon ? round2(productSubtotal * (coupon.percent / 100)) : 0;
    const baseImponible = round2(Math.max(0, productSubtotal - discountAmount));
    const ivaAmount = round2(baseImponible * (state.ivaRate / 100));
    const shippingFee = state.deliveryMode === 'delivery' && state.cart.length > 0 ? CFG.deliveryFee : 0;
    const total = round2(baseImponible + ivaAmount + shippingFee);

    return {
      productSubtotal,
      coupon,
      discountAmount,
      baseImponible,
      ivaRate: state.ivaRate,
      ivaAmount,
      shippingFee,
      total
    };
  }

  function formatItemConfigSummary(config) {
    if (!config) return 'Producto estándar';
    const parts = [`Carne: ${config.meat}`];
    if (config.veggies.length > 0) {
      parts.push(`Verduras: ${config.veggies.join(', ')}`);
    } else {
      parts.push('Sin verduras');
    }
    parts.push(`Salsas: ${config.sauces.join(', ')}`);
    if (config.isMenu) {
      parts.push(`MENÚ (+2,50 €): Patatas Fritas + ${config.drinkLabel}`);
    } else {
      parts.push('Solo plato');
    }
    return parts.join(' · ');
  }

  function renderCart() {
    const listEl = document.getElementById('cartItemsList');
    const clearBtn = document.getElementById('clearCartBtn');
    const totalQty = state.cart.reduce((s, i) => s + i.quantity, 0);

    document.getElementById('cartItemSummary').textContent =
      `${totalQty} ${totalQty === 1 ? 'artículo' : 'artículos'}`;
    document.getElementById('navCartCount').textContent = String(totalQty);
    document.getElementById('mobileFabCount').textContent = String(totalQty);

    clearBtn.classList.toggle('hidden', state.cart.length === 0);

    if (state.cart.length === 0) {
      listEl.innerHTML = `
        <div class="cart-empty">
          Tu carrito está vacío.<br />Elige un plato de la carta para empezar.
        </div>`;
    } else {
      listEl.innerHTML = state.cart
        .map((item) => {
          const lineTotal = round2(item.unitBasePrice * item.quantity);
          return `
            <div class="cart-item">
              <div class="cart-item-top">
                <div>
                  <div class="cart-item-title">${escapeHtml(item.name)}${item.config?.isMenu ? ' (Menú)' : ''}</div>
                  <div class="cart-item-options">${escapeHtml(formatItemConfigSummary(item.config))}</div>
                </div>
                <span class="cart-item-price">${formatEuro(lineTotal)}</span>
              </div>
              <div class="cart-item-actions">
                <div class="qty-stepper">
                  <button type="button" data-cart-action="dec" data-uid="${escapeHtml(item.uid)}" aria-label="Restar">−</button>
                  <span>${item.quantity}</span>
                  <button type="button" data-cart-action="inc" data-uid="${escapeHtml(item.uid)}" aria-label="Sumar">+</button>
                </div>
                <button type="button" class="btn-text-danger" data-cart-action="remove" data-uid="${escapeHtml(item.uid)}">Eliminar</button>
              </div>
            </div>`;
        })
        .join('');
    }

    // Desglose fiscal
    const totals = calculateCartTotals();
    document.getElementById('summarySubtotal').textContent = formatEuro(totals.productSubtotal);

    const discountRow = document.getElementById('summaryDiscountRow');
    if (totals.coupon && totals.discountAmount > 0) {
      discountRow.classList.remove('hidden');
      document.getElementById('summaryDiscountLabel').textContent =
        `Cupón ${totals.coupon.code} (-${totals.coupon.percent}%)`;
      document.getElementById('summaryDiscount').textContent = `-${formatEuro(totals.discountAmount)}`;
    } else {
      discountRow.classList.add('hidden');
    }

    document.getElementById('summaryBaseImponible').textContent = formatEuro(totals.baseImponible);
    document.getElementById('summaryIvaLabel').textContent = `IVA (${totals.ivaRate}%)`;
    document.getElementById('summaryIvaAmount').textContent = formatEuro(totals.ivaAmount);

    const shipRow = document.getElementById('summaryShippingRow');
    shipRow.classList.toggle('hidden', totals.shippingFee <= 0);
    document.getElementById('summaryShipping').textContent = formatEuro(totals.shippingFee);

    document.getElementById('summaryTotal').textContent = formatEuro(totals.total);
    document.getElementById('mobileFabTotal').textContent = formatEuro(totals.total);
    document.getElementById('mobileCartFab').classList.toggle('hidden', state.cart.length === 0);

    // Aviso de pedido mínimo a domicilio
    const minNotice = document.getElementById('deliveryMinNotice');
    if (state.deliveryMode === 'delivery') {
      const missing = round2(CFG.deliveryMinOrder - totals.productSubtotal);
      if (state.cart.length > 0 && missing > 0) {
        minNotice.classList.add('is-warning');
        minNotice.innerHTML = `Te faltan <strong>${formatEuro(missing)}</strong> en productos para el pedido mínimo de 10,00 € a domicilio.`;
      } else {
        minNotice.classList.remove('is-warning');
        minNotice.innerHTML = `Pedido mínimo a domicilio: <strong>10,00 €</strong> (productos). Envío: +2,00 €.`;
      }
    }

    updateCashCalculator(totals.total);
    updateCheckoutState();
  }

  function updateCashCalculator(total = calculateCartTotals().total) {
    const cashBox = document.getElementById('cashCalculatorBox');
    cashBox.classList.toggle('hidden', state.paymentMethod !== 'cash');

    const given = parseFloat(state.cashGiven);
    const changeEl = document.getElementById('cashChangeAmount');
    const warnEl = document.getElementById('cashWarning');

    if (!state.cashGiven || Number.isNaN(given)) {
      changeEl.textContent = formatEuro(0);
      warnEl.classList.add('hidden');
      return;
    }

    if (given < total) {
      changeEl.textContent = formatEuro(0);
      warnEl.classList.toggle('hidden', total === 0);
    } else {
      warnEl.classList.add('hidden');
      changeEl.textContent = formatEuro(given - total);
    }
  }

  function updateCheckoutState() {
    const btn = document.getElementById('checkoutBtn');
    const valMsg = document.getElementById('checkoutValidationMsg');
    const closedBox = document.getElementById('closedScheduleBox');
    const sched = evaluateSchedule();
    const totals = calculateCartTotals();

    closedBox.classList.toggle('hidden', sched.isOpen);

    let errorReason = '';
    if (state.cart.length === 0) {
      errorReason = '';
    } else if (!sched.isOpen && !state.scheduleForOpening) {
      errorReason = 'Local cerrado. Marca "Programar pedido para apertura (13:00)" para continuar.';
    } else if (state.deliveryMode === 'delivery' && totals.productSubtotal < CFG.deliveryMinOrder) {
      errorReason = `El pedido mínimo a domicilio es de ${formatEuro(CFG.deliveryMinOrder)}.`;
    } else if (
      state.deliveryMode === 'delivery' &&
      !document.getElementById('customerAddressInput').value.trim()
    ) {
      errorReason = 'Introduce una dirección de entrega en Barakaldo.';
    } else if (state.paymentMethod === 'cash' && state.cashGiven !== '') {
      const given = parseFloat(state.cashGiven);
      if (!Number.isNaN(given) && given < totals.total) {
        errorReason = 'El efectivo recibido es menor que el total a pagar.';
      }
    }

    const canSubmit = state.cart.length > 0 && !errorReason;
    btn.disabled = !canSubmit;

    if (!sched.isOpen && state.scheduleForOpening) {
      btn.textContent = 'Programar Pedido (13:00) y Generar Ticket';
    } else {
      btn.textContent = 'Confirmar Pedido y Generar Ticket';
    }

    if (errorReason) {
      valMsg.textContent = errorReason;
      valMsg.classList.remove('hidden');
    } else {
      valMsg.classList.add('hidden');
    }
  }

  function handleCartAction(action, uid) {
    const idx = state.cart.findIndex((i) => i.uid === uid);
    if (idx === -1) return;

    if (action === 'remove') {
      state.cart.splice(idx, 1);
    } else if (action === 'dec') {
      if (state.cart[idx].quantity > 1) {
        state.cart[idx].quantity -= 1;
      } else {
        state.cart.splice(idx, 1);
      }
    } else if (action === 'inc') {
      const check = canSatisfyItemIncrement(state.cart[idx], 1);
      if (!check.ok) {
        showToast(`Stock insuficiente de ${check.missingProduct}.`, 'error');
        return;
      }
      state.cart[idx].quantity += 1;
    }

    saveCart();
    renderAllStoreViews();
  }

  function applyCoupon(rawCode) {
    const code = (rawCode || '').trim().toUpperCase();
    const feedback = document.getElementById('couponFeedback');

    if (!code) {
      state.couponCode = null;
      feedback.className = 'coupon-feedback';
      feedback.innerHTML = 'Prueba <button type="button" class="coupon-hint-btn" data-coupon="KASHI10">KASHI10</button> (-10% base)';
      renderCart();
      return;
    }

    const found = CFG.coupons[code];
    if (found) {
      state.couponCode = found.code;
      document.getElementById('couponInput').value = found.code;
      feedback.className = 'coupon-feedback is-valid';
      feedback.textContent = `Cupón ${found.code} aplicado: ${found.description}.`;
      showToast(`Cupón ${found.code} aplicado`, 'success');
    } else {
      state.couponCode = null;
      feedback.className = 'coupon-feedback is-invalid';
      feedback.textContent = 'Cupón no válido. Usa KASHI10 o BARAKALDO5.';
    }
    renderCart();
  }

  /* -------------------- Confirmación de Pedido y Descuento de Stock -------------------- */
  function confirmOrder() {
    if (state.cart.length === 0) return;

    // 1. Verificar stock final de todos los componentes
    const demand = computeCartStockDemand();
    for (const [prodId, needed] of Object.entries(demand)) {
      const prod = getProductById(prodId);
      if (!prod || prod.stock < needed) {
        showToast(`Stock insuficiente para ${prod ? prod.name : prodId}. Revisa tu carrito.`, 'error');
        return;
      }
    }

    // 2. Descontar del almacén
    for (const [prodId, needed] of Object.entries(demand)) {
      const prod = getProductById(prodId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - needed);
      }
    }
    saveProducts();

    // 3. Crear objeto factura
    const sched = evaluateSchedule();
    const totals = calculateCartTotals();
    const year = sched.dt.getFullYear();
    const invoiceNum = `FAC-${year}-${String(state.invoiceSeq).padStart(4, '0')}`;
    state.invoiceSeq += 1;

    const customerName = document.getElementById('customerNameInput').value.trim() || 'Cliente Mostrador';
    const customerAddress =
      state.deliveryMode === 'delivery'
        ? document.getElementById('customerAddressInput').value.trim()
        : '';

    let cashGivenNum = totals.total;
    let cashChangeNum = 0;
    if (state.paymentMethod === 'cash') {
      const parsed = parseFloat(state.cashGiven);
      if (!Number.isNaN(parsed) && parsed >= totals.total) {
        cashGivenNum = round2(parsed);
        cashChangeNum = round2(cashGivenNum - totals.total);
      }
    }

    const invoice = {
      id: invoiceNum,
      dateIso: sched.dt.toISOString(),
      dateLabel: `${pad2(sched.dt.getDate())}/${pad2(sched.dt.getMonth() + 1)}/${year} ${sched.timeLabel}`,
      scheduledForOpening: !sched.isOpen && state.scheduleForOpening,
      customerName,
      customerAddress,
      deliveryMode: state.deliveryMode,
      estimatedTime: !sched.isOpen && state.scheduleForOpening
        ? 'Apertura 13:00'
        : state.deliveryMode === 'delivery'
        ? '30-40 min'
        : '15 min',
      paymentMethod: state.paymentMethod,
      cashGiven: state.paymentMethod === 'cash' ? cashGivenNum : null,
      cashChange: state.paymentMethod === 'cash' ? cashChangeNum : null,
      items: structuredClone(state.cart),
      subtotal: totals.productSubtotal,
      couponCode: totals.coupon ? totals.coupon.code : null,
      discountAmount: totals.discountAmount,
      baseImponible: totals.baseImponible,
      ivaRate: totals.ivaRate,
      ivaAmount: totals.ivaAmount,
      shippingFee: totals.shippingFee,
      total: totals.total
    };

    state.invoices.unshift(invoice);
    saveInvoices();

    // 4. Limpiar carrito y campos transitorios
    state.cart = [];
    state.cashGiven = '';
    state.couponCode = null;
    state.scheduleForOpening = false;
    document.getElementById('cashGivenInput').value = '';
    document.getElementById('couponInput').value = '';
    document.getElementById('couponFeedback').className = 'coupon-feedback';
    document.getElementById('couponFeedback').innerHTML =
      'Prueba <button type="button" class="coupon-hint-btn" data-coupon="KASHI10">KASHI10</button> (-10% base)';
    document.getElementById('scheduleForOpeningCheck').checked = false;
    saveCart();

    renderAll();
    openTicketModal(invoice);
    showToast(`Pedido ${invoice.id} confirmado. Stock actualizado.`, 'success');
  }

  /* -------------------- Ticket Visual, PDF, TXT e Impresión -------------------- */
  function openTicketModal(invoice) {
    state.activeTicketInvoice = invoice;
    const area = document.getElementById('ticketPrintArea');

    const itemsHtml = invoice.items
      .map((it) => {
        const lineTotal = round2(it.unitBasePrice * it.quantity);
        const detail = it.config ? formatItemConfigSummary(it.config) : '';
        return `
          <div class="ticket-item-block">
            <div class="ticket-row">
              <strong>${it.quantity}x ${escapeHtml(it.name)}</strong>
              <span>${formatEuro(lineTotal)}</span>
            </div>
            ${detail ? `<div class="ticket-item-meta">${escapeHtml(detail)}</div>` : ''}
          </div>`;
      })
      .join('');

    area.innerHTML = `
      <div class="ticket-center">
        <div class="ticket-title">KASHI KEBAB SAGASTI</div>
        <div>${escapeHtml(CFG.legalName)}</div>
        <div>NIF: ${escapeHtml(CFG.nif)}</div>
        <div>${escapeHtml(CFG.address)}</div>
        <div>Tel: ${escapeHtml(CFG.phone)}</div>
      </div>

      <hr class="ticket-divider" />

      <div class="ticket-row"><span>FACTURA SIMPLIF.:</span><strong>${escapeHtml(invoice.id)}</strong></div>
      <div class="ticket-row"><span>FECHA Y HORA:</span><span>${escapeHtml(invoice.dateLabel)}</span></div>
      <div class="ticket-row"><span>CLIENTE:</span><span>${escapeHtml(invoice.customerName)}</span></div>
      <div class="ticket-row"><span>MODALIDAD:</span><span>${invoice.deliveryMode === 'delivery' ? 'Domicilio Barakaldo' : 'Recoger en local'}</span></div>
      ${invoice.customerAddress ? `<div class="ticket-row"><span>DIRECCIÓN:</span><span>${escapeHtml(invoice.customerAddress)}</span></div>` : ''}
      <div class="ticket-row"><span>ENTREGA EST.:</span><span>${escapeHtml(invoice.estimatedTime)}</span></div>

      ${invoice.scheduledForOpening ? '<div class="ticket-scheduled-tag">PROGRAMADO PARA APERTURA (13:00)</div>' : ''}

      <hr class="ticket-divider" />

      ${itemsHtml}

      <hr class="ticket-divider" />

      <div class="ticket-row"><span>Subtotal productos (sin IVA)</span><span>${formatEuro(invoice.subtotal)}</span></div>
      ${invoice.discountAmount > 0 ? `<div class="ticket-row"><span>Descuento (${escapeHtml(invoice.couponCode)})</span><span>-${formatEuro(invoice.discountAmount)}</span></div>` : ''}
      <div class="ticket-row"><strong>Base Imponible</strong><strong>${formatEuro(invoice.baseImponible)}</strong></div>
      <div class="ticket-row"><span>Cuota IVA (${invoice.ivaRate}%)</span><span>${formatEuro(invoice.ivaAmount)}</span></div>
      ${invoice.shippingFee > 0 ? `<div class="ticket-row"><span>Envío a domicilio</span><span>${formatEuro(invoice.shippingFee)}</span></div>` : ''}
      <div class="ticket-row ticket-total-row"><span>TOTAL PAGADO</span><span>${formatEuro(invoice.total)}</span></div>

      <hr class="ticket-divider" />

      <div class="ticket-row"><span>MÉTODO DE PAGO:</span><strong>${invoice.paymentMethod === 'cash' ? 'EFECTIVO' : 'TARJETA BANCARIA'}</strong></div>
      ${invoice.paymentMethod === 'cash' ? `
        <div class="ticket-row"><span>Entregado:</span><span>${formatEuro(invoice.cashGiven)}</span></div>
        <div class="ticket-row"><span>Cambio devuelto:</span><span>${formatEuro(invoice.cashChange)}</span></div>
      ` : ''}

      <hr class="ticket-divider" />

      <div class="ticket-center">
        <div>¡Gracias por su visita a Kashi Kebab!</div>
        <div>Horario: 13:00 a 01:00 todos los días</div>
        <div>IVA incluido según normativa vigente</div>
      </div>
    `;

    document.getElementById('ticketModal').classList.remove('hidden');
  }

  function closeTicketModal() {
    document.getElementById('ticketModal').classList.add('hidden');
  }

  function buildPlainTextTicket(inv) {
    const W = 44;
    const line = (ch = '-') => ch.repeat(W);
    const padRow = (left, right) => {
      const l = String(left);
      const r = String(right);
      const space = Math.max(1, W - l.length - r.length);
      return l + ' '.repeat(space) + r;
    };
    const center = (txt) => {
      const s = String(txt);
      const pad = Math.max(0, Math.floor((W - s.length) / 2));
      return ' '.repeat(pad) + s;
    };

    const rows = [
      center('KASHI KEBAB SAGASTI (ARRANDI)'),
      center(CFG.legalName),
      center(`NIF: ${CFG.nif} | Tel: ${CFG.phone}`),
      center('Calle Arrandi 25, 48901 Barakaldo'),
      line('='),
      padRow('Factura:', inv.id),
      padRow('Fecha:', inv.dateLabel),
      padRow('Cliente:', inv.customerName),
      padRow('Modalidad:', inv.deliveryMode === 'delivery' ? 'Domicilio' : 'Recoger en local')
    ];

    if (inv.customerAddress) rows.push(`Direccion: ${inv.customerAddress}`);
    if (inv.scheduledForOpening) rows.push(center('*** PROGRAMADO APERTURA 13:00 ***'));
    rows.push(line('-'));

    for (const it of inv.items) {
      const amt = formatEuro(round2(it.unitBasePrice * it.quantity));
      rows.push(padRow(`${it.quantity}x ${it.name}`.slice(0, 32), amt));
      if (it.config) {
        rows.push(`   ${formatItemConfigSummary(it.config)}`);
      }
    }

    rows.push(line('-'));
    rows.push(padRow('Subtotal (sin IVA):', formatEuro(inv.subtotal)));
    if (inv.discountAmount > 0) {
      rows.push(padRow(`Dto. (${inv.couponCode}):`, `-${formatEuro(inv.discountAmount)}`));
    }
    rows.push(padRow('Base Imponible:', formatEuro(inv.baseImponible)));
    rows.push(padRow(`IVA (${inv.ivaRate}%):`, formatEuro(inv.ivaAmount)));
    if (inv.shippingFee > 0) {
      rows.push(padRow('Envio Barakaldo:', formatEuro(inv.shippingFee)));
    }
    rows.push(line('='));
    rows.push(padRow('TOTAL A PAGAR:', formatEuro(inv.total)));
    rows.push(line('-'));
    rows.push(padRow('Forma de pago:', inv.paymentMethod === 'cash' ? 'EFECTIVO' : 'TARJETA'));
    if (inv.paymentMethod === 'cash') {
      rows.push(padRow('Entregado:', formatEuro(inv.cashGiven)));
      rows.push(padRow('Cambio devuelto:', formatEuro(inv.cashChange)));
    }
    rows.push(line('='));
    rows.push(center('Gracias por su pedido'));
    rows.push(center('Horario: Todos los dias 13:00 - 01:00'));

    return rows.join('\n');
  }

  function downloadTicketTxt(inv) {
    if (!inv) return;
    const text = buildPlainTextTicket(inv);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Ticket ${inv.id}.txt descargado`, 'success');
  }

  function downloadTicketPdf(inv) {
    if (!inv) return;
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('Librería PDF no disponible sin conexión. Usando impresión del sistema.', 'info');
      window.print();
      return;
    }

    const { jsPDF } = window.jspdf;
    // Calcular altura dinámica aproximada para ticket térmico de 80mm
    const estimatedLines = inv.items.reduce((acc, it) => acc + (it.config ? 4 : 2), 0);
    const pageHeight = Math.max(155, 115 + estimatedLines * 6.2);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, pageHeight]
    });

    const left = 5;
    const right = 75;
    let y = 8;

    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.text('KASHI KEBAB SAGASTI', 40, y, { align: 'center' });
    y += 4.5;

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.text(CFG.legalName, 40, y, { align: 'center' });
    y += 3.6;
    doc.text(`NIF: ${CFG.nif}  Tel: ${CFG.phone}`, 40, y, { align: 'center' });
    y += 3.6;
    doc.text('Calle Arrandi 25, 48901 Barakaldo', 40, y, { align: 'center' });
    y += 4;

    doc.line(left, y, right, y);
    y += 4;

    const addPair = (l, r, bold = false) => {
      doc.setFont('courier', bold ? 'bold' : 'normal');
      doc.text(String(l), left, y);
      doc.text(String(r), right, y, { align: 'right' });
      y += 3.8;
    };

    addPair('Factura:', inv.id, true);
    addPair('Fecha:', inv.dateLabel);
    addPair('Cliente:', inv.customerName.slice(0, 24));
    addPair('Modalidad:', inv.deliveryMode === 'delivery' ? 'Domicilio' : 'Recoger local');
    if (inv.customerAddress) {
      const addrLines = doc.splitTextToSize(`Dir: ${inv.customerAddress}`, 70);
      doc.text(addrLines, left, y);
      y += addrLines.length * 3.5;
    }
    if (inv.scheduledForOpening) {
      doc.setFont('courier', 'bold');
      doc.text('** PROGRAMADO APERTURA 13:00 **', 40, y, { align: 'center' });
      y += 4;
    }

    doc.line(left, y, right, y);
    y += 4;

    for (const it of inv.items) {
      const amt = formatEuro(round2(it.unitBasePrice * it.quantity));
      addPair(`${it.quantity}x ${it.name}`.slice(0, 27), amt, true);
      if (it.config) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(6.8);
        const wrapped = doc.splitTextToSize(formatItemConfigSummary(it.config), 67);
        doc.text(wrapped, left + 2, y);
        y += wrapped.length * 3.1 + 1;
        doc.setFontSize(7.5);
      }
    }

    doc.line(left, y, right, y);
    y += 4;

    addPair('Subtotal (sin IVA):', formatEuro(inv.subtotal));
    if (inv.discountAmount > 0) {
      addPair(`Dto. (${inv.couponCode}):`, `-${formatEuro(inv.discountAmount)}`);
    }
    addPair('Base Imponible:', formatEuro(inv.baseImponible), true);
    addPair(`IVA (${inv.ivaRate}%):`, formatEuro(inv.ivaAmount));
    if (inv.shippingFee > 0) {
      addPair('Envio domicilio:', formatEuro(inv.shippingFee));
    }

    doc.line(left, y, right, y);
    y += 4.5;
    doc.setFontSize(9.5);
    addPair('TOTAL PAGADO:', formatEuro(inv.total), true);
    doc.setFontSize(7.5);

    doc.line(left, y, right, y);
    y += 4;

    addPair('Pago:', inv.paymentMethod === 'cash' ? 'EFECTIVO' : 'TARJETA', true);
    if (inv.paymentMethod === 'cash') {
      addPair('Entregado:', formatEuro(inv.cashGiven));
      addPair('Cambio:', formatEuro(inv.cashChange));
    }

    y += 3;
    doc.setFont('courier', 'normal');
    doc.text('Gracias por su pedido - 13:00 a 01:00', 40, y, { align: 'center' });

    doc.save(`${inv.id}.pdf`);
    showToast(`Ticket ${inv.id}.pdf descargado`, 'success');
  }

  /* -------------------- Gestión de Almacén (Stock) -------------------- */
  function renderWarehouse() {
    const totalRefs = state.products.length;
    const totalUnits = state.products.reduce((s, p) => s + p.stock, 0);
    const lowStock = state.products.filter((p) => p.stock > 0 && p.stock < 5).length;
    const outStock = state.products.filter((p) => p.stock === 0).length;

    document.getElementById('kpiTotalProducts').textContent = String(totalRefs);
    document.getElementById('kpiTotalUnits').textContent = String(totalUnits);
    document.getElementById('kpiLowStock').textContent = String(lowStock);
    document.getElementById('kpiOutOfStock').textContent = String(outStock);

    const lowOrOut = lowStock + outStock;
    const navLowBadge = document.getElementById('navLowStockCount');
    navLowBadge.textContent = String(lowOrOut);
    navLowBadge.classList.toggle('hidden', lowOrOut === 0);

    const search = state.stockSearch.trim().toLowerCase();
    const rows = state.products.filter((p) => {
      const searchOk = !search || p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search);
      if (!searchOk) return false;
      if (state.stockFilter === 'low') return p.stock < 5;
      if (state.stockFilter === 'ok') return p.stock >= 5;
      return true;
    });

    const tbody = document.getElementById('warehouseTableBody');
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#6B7280;padding:24px;">No hay productos que coincidan con el filtro.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((p) => {
        let badge = '<span class="stock-badge-pill badge-ok">Óptimo</span>';
        if (p.stock === 0) {
          badge = '<span class="stock-badge-pill badge-out">Agotado</span>';
        } else if (p.stock < 5) {
          badge = '<span class="stock-badge-pill badge-low">Stock bajo</span>';
        }

        const fallbackSrc = window.getCategoryFallbackSvg(p.category, p.name);
        return `
          <tr>
            <td>
              <div class="table-product-cell">
                <img
                  class="table-thumb"
                  src="${escapeHtml(p.image || fallbackSrc)}"
                  alt="${escapeHtml(p.name)}"
                  data-fallback="${escapeHtml(fallbackSrc)}"
                  onerror="if(!this.dataset.failed){this.dataset.failed='1';this.src=this.dataset.fallback;}"
                />
                <div>
                  <strong>${escapeHtml(p.name)}</strong>
                  <div class="muted-text" style="font-size:0.74rem;">${p.customizable ? 'Configurable en Menú' : 'Venta directa'}</div>
                </div>
              </div>
            </td>
            <td>${escapeHtml(p.category)}</td>
            <td>
              <input
                type="number"
                class="price-edit-input"
                min="0.50"
                step="0.10"
                value="${p.price.toFixed(2)}"
                data-price-id="${escapeHtml(p.id)}"
                aria-label="Editar precio de ${escapeHtml(p.name)}"
              /> €
            </td>
            <td><strong style="font-family:var(--font-mono);">${p.stock} uds.</strong></td>
            <td>${badge}</td>
            <td>
              <div class="restock-actions">
                <button type="button" class="btn-mini" data-restock-id="${escapeHtml(p.id)}" data-delta="-1" title="Restar 1">-1</button>
                <button type="button" class="btn-mini btn-mini-add" data-restock-id="${escapeHtml(p.id)}" data-delta="5">+5</button>
                <button type="button" class="btn-mini btn-mini-add" data-restock-id="${escapeHtml(p.id)}" data-delta="10">+10</button>
              </div>
            </td>
          </tr>`;
      })
      .join('');
  }

  /* -------------------- Historial de Facturas y Cierre de Caja -------------------- */
  function renderInvoices() {
    document.getElementById('navInvoicesCount').textContent = String(state.invoices.length);

    let totalRev = 0;
    let cashRev = 0;
    let cardRev = 0;
    let totalIva = 0;
    let totalBase = 0;
    let scheduledCount = 0;
    const dishCounter = {};

    for (const inv of state.invoices) {
      totalRev = round2(totalRev + inv.total);
      totalIva = round2(totalIva + inv.ivaAmount);
      totalBase = round2(totalBase + inv.baseImponible);
      if (inv.paymentMethod === 'cash') cashRev = round2(cashRev + inv.total);
      else cardRev = round2(cardRev + inv.total);
      if (inv.scheduledForOpening) scheduledCount += 1;

      for (const it of inv.items) {
        dishCounter[it.name] = (dishCounter[it.name] || 0) + it.quantity;
      }
    }

    let topDish = '—';
    let topUnits = 0;
    for (const [name, qty] of Object.entries(dishCounter)) {
      if (qty > topUnits) {
        topUnits = qty;
        topDish = name;
      }
    }

    document.getElementById('finTotalRevenue').textContent = formatEuro(totalRev);
    document.getElementById('finPaymentSplit').textContent =
      `Efectivo: ${formatEuro(cashRev)} · Tarjeta: ${formatEuro(cardRev)}`;
    document.getElementById('finTotalIva').textContent = formatEuro(totalIva);
    document.getElementById('finBaseImponible').textContent = `Base imponible: ${formatEuro(totalBase)}`;
    document.getElementById('finTopDish').textContent = topDish;
    document.getElementById('finTopDishUnits').textContent =
      topUnits > 0 ? `${topUnits} unidades vendidas` : 'Sin ventas registradas aún';
    document.getElementById('finOrderCount').textContent = String(state.invoices.length);
    document.getElementById('finScheduledCount').textContent = `${scheduledCount} programados para apertura`;

    const search = state.invoiceSearch.trim().toLowerCase();
    const filtered = state.invoices.filter((inv) => {
      const searchOk =
        !search ||
        inv.id.toLowerCase().includes(search) ||
        inv.customerName.toLowerCase().includes(search);
      if (!searchOk) return false;
      if (state.invoiceFilter === 'cash') return inv.paymentMethod === 'cash';
      if (state.invoiceFilter === 'card') return inv.paymentMethod === 'card';
      if (state.invoiceFilter === 'delivery') return inv.deliveryMode === 'delivery';
      return true;
    });

    const tbody = document.getElementById('invoicesTableBody');
    if (filtered.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;color:#6B7280;padding:28px;">No hay facturas registradas con los filtros actuales.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered
      .map((inv) => {
        const modeText = inv.deliveryMode === 'delivery' ? 'Domicilio' : 'Recoger';
        const schedTag = inv.scheduledForOpening
          ? '<span class="stock-badge-pill badge-low" style="margin-left:4px;">Prog. 13:00</span>'
          : '';
        return `
          <tr>
            <td><strong style="font-family:var(--font-mono);">${escapeHtml(inv.id)}</strong></td>
            <td>${escapeHtml(inv.dateLabel)} ${schedTag}</td>
            <td>
              <strong>${escapeHtml(inv.customerName)}</strong>
              <div class="muted-text" style="font-size:0.75rem;">${modeText}${inv.customerAddress ? ' · ' + escapeHtml(inv.customerAddress) : ''}</div>
            </td>
            <td>${inv.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</td>
            <td style="font-family:var(--font-mono);">${formatEuro(inv.baseImponible)}</td>
            <td style="font-family:var(--font-mono);">${formatEuro(inv.ivaAmount)} (${inv.ivaRate}%)</td>
            <td><strong style="font-family:var(--font-mono);">${formatEuro(inv.total)}</strong></td>
            <td>
              <div class="restock-actions">
                <button type="button" class="btn-mini" data-inv-action="view" data-inv-id="${escapeHtml(inv.id)}">Ver</button>
                <button type="button" class="btn-mini btn-mini-add" data-inv-action="pdf" data-inv-id="${escapeHtml(inv.id)}">PDF</button>
                <button type="button" class="btn-mini" data-inv-action="txt" data-inv-id="${escapeHtml(inv.id)}">TXT</button>
              </div>
            </td>
          </tr>`;
      })
      .join('');
  }

  function renderAllStoreViews() {
    renderCategoryTabs();
    renderMenuGrid();
    renderCart();
  }

  function renderAll() {
    renderScheduleStatus();
    renderAllStoreViews();
    renderWarehouse();
    renderInvoices();
  }

  /* -------------------- Enlace de Eventos -------------------- */
  function bindEvents() {
    // Navegación principal por pestañas
    document.querySelectorAll('.nav-tab').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        const target = tabBtn.dataset.tab;
        state.activeTab = target;
        document.querySelectorAll('.nav-tab').forEach((b) => b.classList.toggle('active', b === tabBtn));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${target}`));
      });
    });

    // Simulador de Hora
    const simInput = document.getElementById('simTimeInput');
    simInput.addEventListener('change', (e) => {
      if (e.target.value) {
        state.useSimulatedTime = true;
        state.simulatedTimeStr = e.target.value;
        renderScheduleStatus();
      }
    });

    document.querySelectorAll('[data-sim-time]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.useSimulatedTime = true;
        state.simulatedTimeStr = btn.dataset.simTime;
        simInput.value = btn.dataset.simTime;
        renderScheduleStatus();
        showToast(`Reloj simulado a las ${btn.dataset.simTime}`, 'info');
      });
    });

    document.getElementById('resetRealClockBtn').addEventListener('click', () => {
      state.useSimulatedTime = false;
      renderScheduleStatus();
      showToast('Reloj sincronizado con la hora real del dispositivo', 'info');
    });

    // Filtros de categorías y búsqueda en carta
    document.getElementById('categoryFilterBar').addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-pill');
      if (!btn) return;
      state.activeCategory = btn.dataset.category;
      renderAllStoreViews();
    });

    document.getElementById('menuSearchInput').addEventListener('input', (e) => {
      state.menuSearch = e.target.value;
      renderMenuGrid();
    });

    // Botones de platos en la carta
    document.getElementById('menuGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="add-dish"]');
      if (!btn) return;
      const prod = getProductById(btn.dataset.id);
      if (!prod) return;
      if (prod.customizable) {
        openConfigurator(prod.id);
      } else {
        addSimpleProductToCart(prod.id);
      }
    });

    // Configurador modal
    document.getElementById('closeConfiguratorBtn').addEventListener('click', closeConfigurator);
    document.getElementById('cancelConfiguratorBtn').addEventListener('click', closeConfigurator);
    document.getElementById('confirmConfiguratorBtn').addEventListener('click', confirmConfiguratorAdd);

    document.getElementById('configuratorModal').addEventListener('change', (e) => {
      // Exclusión mutua para "Sin salsa"
      if (e.target.name === 'cfgSauce') {
        const allSauces = Array.from(document.querySelectorAll('input[name="cfgSauce"]'));
        if (e.target.value === 'sin-salsa' && e.target.checked) {
          allSauces.forEach((cb) => {
            if (cb.value !== 'sin-salsa') cb.checked = false;
          });
        } else if (e.target.value !== 'sin-salsa' && e.target.checked) {
          const noSauce = allSauces.find((cb) => cb.value === 'sin-salsa');
          if (noSauce) noSauce.checked = false;
        }
      }
      updateConfiguratorPreview();
    });

    // Carrito: acciones de cantidad y vaciar
    document.getElementById('cartItemsList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cart-action]');
      if (!btn) return;
      handleCartAction(btn.dataset.cartAction, btn.dataset.uid);
    });

    document.getElementById('clearCartBtn').addEventListener('click', () => {
      state.cart = [];
      saveCart();
      renderAllStoreViews();
    });

    // Modalidad de entrega
    document.querySelectorAll('.delivery-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.deliveryMode = btn.dataset.delivery;
        document.querySelectorAll('.delivery-option').forEach((b) => b.classList.toggle('active', b === btn));
        document.getElementById('deliveryAddressBox').classList.toggle('hidden', state.deliveryMode !== 'delivery');
        renderCart();
      });
    });

    document.getElementById('customerAddressInput').addEventListener('input', updateCheckoutState);

    // Cupón e IVA
    document.getElementById('applyCouponBtn').addEventListener('click', () => {
      applyCoupon(document.getElementById('couponInput').value);
    });

    document.getElementById('cartSidebar').addEventListener('click', (e) => {
      const hintBtn = e.target.closest('.coupon-hint-btn');
      if (hintBtn) {
        applyCoupon(hintBtn.dataset.coupon);
      }
    });

    document.getElementById('ivaRateSelect').addEventListener('change', (e) => {
      state.ivaRate = parseInt(e.target.value, 10) || 10;
      renderCart();
    });

    // Pago y calculadora de cambio
    document.querySelectorAll('.payment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.paymentMethod = btn.dataset.payment;
        document.querySelectorAll('.payment-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderCart();
      });
    });

    document.querySelectorAll('[data-cash]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.cashGiven = btn.dataset.cash;
        document.getElementById('cashGivenInput').value = btn.dataset.cash;
        updateCashCalculator();
        updateCheckoutState();
      });
    });

    document.getElementById('exactCashBtn').addEventListener('click', () => {
      const total = calculateCartTotals().total;
      state.cashGiven = total.toFixed(2);
      document.getElementById('cashGivenInput').value = total.toFixed(2);
      updateCashCalculator(total);
      updateCheckoutState();
    });

    document.getElementById('cashGivenInput').addEventListener('input', (e) => {
      state.cashGiven = e.target.value;
      updateCashCalculator();
      updateCheckoutState();
    });

    document.getElementById('scheduleForOpeningCheck').addEventListener('change', (e) => {
      state.scheduleForOpening = e.target.checked;
      updateCheckoutState();
    });

    document.getElementById('checkoutBtn').addEventListener('click', confirmOrder);

    document.getElementById('mobileCartFab').addEventListener('click', () => {
      document.getElementById('cartSidebar').scrollIntoView({ behavior: 'smooth' });
    });

    // Almacén (Stock, precios y nuevos platos)
    document.getElementById('stockFilterBar').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-stock-filter]');
      if (!btn) return;
      state.stockFilter = btn.dataset.stockFilter;
      document.querySelectorAll('#stockFilterBar .btn-chip').forEach((b) => b.classList.toggle('active', b === btn));
      renderWarehouse();
    });

    document.getElementById('stockSearchInput').addEventListener('input', (e) => {
      state.stockSearch = e.target.value;
      renderWarehouse();
    });

    document.getElementById('warehouseTableBody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-restock-id]');
      if (!btn) return;
      const prod = getProductById(btn.dataset.restockId);
      if (!prod) return;
      const delta = parseInt(btn.dataset.delta, 10);
      prod.stock = Math.max(0, prod.stock + delta);
      saveProducts();
      renderWarehouse();
      renderMenuGrid();
      showToast(`Stock de ${prod.name}: ${prod.stock} uds.`, 'info');
    });

    document.getElementById('warehouseTableBody').addEventListener('change', (e) => {
      const inp = e.target.closest('[data-price-id]');
      if (!inp) return;
      const prod = getProductById(inp.dataset.priceId);
      const val = parseFloat(inp.value);
      if (prod && !Number.isNaN(val) && val >= 0.5) {
        prod.price = round2(val);
        saveProducts();
        renderMenuGrid();
        showToast(`Precio actualizado: ${prod.name} -> ${formatEuro(prod.price)}`, 'success');
      }
    });

    document.getElementById('newDishForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('newDishName').value.trim();
      const category = document.getElementById('newDishCategory').value;
      const price = parseFloat(document.getElementById('newDishPrice').value);
      const stock = parseInt(document.getElementById('newDishStock').value, 10);
      const tagsRaw = document.getElementById('newDishTags').value.trim();
      const image = document.getElementById('newDishImage').value.trim();
      const description = document.getElementById('newDishDesc').value.trim();
      const customizable = document.getElementById('newDishCustomizable').checked;

      if (!name || Number.isNaN(price) || Number.isNaN(stock) || !description) return;

      const newProduct = {
        id: 'custom-' + Date.now(),
        name,
        category,
        description,
        price: round2(price),
        stock: Math.max(0, stock),
        tags: tagsRaw ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean) : ['Nuevo'],
        customizable,
        image: image || ''
      };

      state.products.unshift(newProduct);
      saveProducts();
      e.target.reset();
      document.getElementById('newDishStock').value = '15';
      document.getElementById('newDishCustomizable').checked = true;

      renderAll();
      showToast(`"${name}" añadido a la carta y al almacén`, 'success');
    });

    document.getElementById('resetDataBtn').addEventListener('click', () => {
      if (!window.confirm('¿Restaurar inventario inicial, precios y borrar el historial de facturas?')) {
        return;
      }
      localStorage.removeItem(STORAGE_KEYS.products);
      localStorage.removeItem(STORAGE_KEYS.invoices);
      localStorage.removeItem(STORAGE_KEYS.invoiceSeq);
      localStorage.removeItem(STORAGE_KEYS.cart);
      loadState();
      renderAll();
      showToast('Valores iniciales restaurados correctamente', 'info');
    });

    // Historial de Facturas
    document.getElementById('invoiceFilterBar').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-invoice-filter]');
      if (!btn) return;
      state.invoiceFilter = btn.dataset.invoiceFilter;
      document.querySelectorAll('#invoiceFilterBar .btn-chip').forEach((b) => b.classList.toggle('active', b === btn));
      renderInvoices();
    });

    document.getElementById('invoiceSearchInput').addEventListener('input', (e) => {
      state.invoiceSearch = e.target.value;
      renderInvoices();
    });

    document.getElementById('invoicesTableBody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-inv-action]');
      if (!btn) return;
      const inv = state.invoices.find((i) => i.id === btn.dataset.invId);
      if (!inv) return;
      if (btn.dataset.invAction === 'view') openTicketModal(inv);
      else if (btn.dataset.invAction === 'pdf') downloadTicketPdf(inv);
      else if (btn.dataset.invAction === 'txt') downloadTicketTxt(inv);
    });

    // Modal Ticket
    document.getElementById('closeTicketModalBtn').addEventListener('click', closeTicketModal);
    document.getElementById('downloadPdfBtn').addEventListener('click', () => downloadTicketPdf(state.activeTicketInvoice));
    document.getElementById('downloadTxtBtn').addEventListener('click', () => downloadTicketTxt(state.activeTicketInvoice));
    document.getElementById('printTicketBtn').addEventListener('click', () => window.print());

    // Cerrar modales al hacer clic fuera
    document.getElementById('configuratorModal').addEventListener('click', (e) => {
      if (e.target.id === 'configuratorModal') closeConfigurator();
    });
    document.getElementById('ticketModal').addEventListener('click', (e) => {
      if (e.target.id === 'ticketModal') closeTicketModal();
    });
  }

  /* -------------------- Arranque -------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    bindEvents();
    renderAll();

    // Actualizar reloj real cada 15 segundos si no está en modo simulado
    setInterval(() => {
      if (!state.useSimulatedTime) {
        renderScheduleStatus();
      }
    }, 15000);
  });
})();
