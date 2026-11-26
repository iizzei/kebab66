/* ==========================================================================
   Datos iniciales y configuración de Kashi Kebab Sagasti (Arrandi) - Turca
   ========================================================================== */

window.KASHI_CONFIG = {
  restaurantName: 'Kashi Kebab Sagasti (Arrandi) - Turca',
  legalName: 'Kashi Kebab Sagasti (Arrandi) S.L.',
  nif: 'B-95847321',
  address: 'Calle Arrandi 25, 48901 Barakaldo (Bizkaia)',
  phone: '944 123 456',
  openHour: 13,  // 13:00
  closeHour: 1,  // 01:00 (cruce de medianoche)
  closingWarningMinutes: 30,
  deliveryFee: 2.00,
  deliveryMinOrder: 10.00,
  fetaPrice: 1.00,
  menuComboPrice: 2.50,
  comboFriesId: 'patatas-fritas',
  comboDrinks: [
    { label: 'Coca-Cola', productId: 'bebida-cocacola' },
    { label: 'Fanta', productId: 'bebida-fanta' },
    { label: 'Agua', productId: 'bebida-agua' },
    { label: 'Ayran', productId: 'bebida-ayran' }
  ],
  coupons: {
    KASHI10: { code: 'KASHI10', percent: 10, description: '10% dto. sobre base imponible' },
    BARAKALDO5: { code: 'BARAKALDO5', percent: 5, description: '5% dto. vecinos de Barakaldo' }
  },
  categories: [
    'Todos',
    'Platos Kebab',
    'Dürüms y Pitas',
    'Pizzas Turcas (Lahmacun)',
    'Raciones y Extras',
    'Bebidas'
  ],
  configuratorOptions: {
    meats: [
      { id: 'pollo', label: 'Pollo', note: 'Asado al corte' },
      { id: 'ternera', label: 'Ternera', note: 'Especiada tradicional' },
      { id: 'mixto', label: 'Mixto', note: 'Pollo y ternera' },
      { id: 'falafel', label: 'Falafel (Vegetariano)', note: 'Garbanzos y hierbas' }
    ],
    veggies: [
      { id: 'lechuga', label: 'Lechuga', price: 0, defaultChecked: true },
      { id: 'tomate', label: 'Tomate', price: 0, defaultChecked: true },
      { id: 'cebolla', label: 'Cebolla', price: 0, defaultChecked: true },
      { id: 'lombarda', label: 'Lombarda', price: 0, defaultChecked: true },
      { id: 'feta', label: 'Queso Feta', price: 1.00, defaultChecked: false }
    ],
    sauces: [
      { id: 'blanca', label: 'Salsa Blanca (Yogur)', defaultChecked: true },
      { id: 'picante', label: 'Salsa Picante', defaultChecked: false },
      { id: 'ketchup', label: 'Kétchup', defaultChecked: false },
      { id: 'mayonesa', label: 'Mayonesa', defaultChecked: false },
      { id: 'sin-salsa', label: 'Sin salsa', defaultChecked: false }
    ]
  }
};

window.INITIAL_PRODUCTS = [
  {
    id: 'plato-kebab-clasico',
    name: 'Plato Döner Kebab Clásico',
    category: 'Platos Kebab',
    description: 'Generosa ración de carne al corte acompañada de ensalada fresca de la huerta, pan pita templado y patatas.',
    price: 8.50,
    stock: 22,
    tags: ['Gluten', 'Lácteos', 'Sésamo'],
    customizable: true,
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'plato-iskender',
    name: 'Plato Kebab Iskender',
    category: 'Platos Kebab',
    description: 'Finas láminas de carne turca sobre base de pan tostado, bañadas en salsa de tomate especiada y yogur cremoso.',
    price: 9.80,
    stock: 14,
    tags: ['Gluten', 'Lácteos', 'Especialidad'],
    customizable: true,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'plato-falafel',
    name: 'Plato Falafel Artesanal',
    category: 'Platos Kebab',
    description: 'Crujientes croquetas de garbanzo con cilantro y comino, hummus suave, verduras frescas y pan de pita.',
    price: 8.20,
    stock: 12,
    tags: ['Vegetariano', 'Sésamo', 'Gluten'],
    customizable: true,
    image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'durum-tradicional',
    name: 'Dürüm Kebab Tradicional',
    category: 'Dürüms y Pitas',
    description: 'Torta fina de trigo recién planchada rellena de carne jugosa, lechuga, tomate, cebolla, lombarda y tus salsas.',
    price: 6.80,
    stock: 28,
    tags: ['Gluten', 'Lácteos'],
    customizable: true,
    image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'durum-xl-doble',
    name: 'Dürüm Doble Carne XL',
    category: 'Dürüms y Pitas',
    description: 'Para los más hambrientos: doble ración de carne asada al momento en rollo gigante con toque picante opcional.',
    price: 8.40,
    stock: 4,
    tags: ['Gluten', 'Picante opcional', 'XL'],
    customizable: true,
    image: 'https://images.unsplash.com/photo-1748955307113-992406078fee?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'pita-kebab',
    name: 'Pan Pita Kebab Sagasti',
    category: 'Dürüms y Pitas',
    description: 'Auténtico pan pita turco esponjoso abierto al horno, relleno de carne al gusto, verduras crujientes y salsa.',
    price: 6.50,
    stock: 19,
    tags: ['Gluten', 'Sésamo'],
    customizable: true,
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'lahmacun-clasico',
    name: 'Lahmacun Clásico (Pizza Turca)',
    category: 'Pizzas Turcas (Lahmacun)',
    description: 'Masa fina crujiente horneada a la piedra con picadillo especiado, tomate, pimiento, perejil y limón.',
    price: 7.20,
    stock: 16,
    tags: ['Gluten', 'Picante suave'],
    customizable: true,
    image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'lahmacun-kebab',
    name: 'Lahmacun Kebab Enrollado',
    category: 'Pizzas Turcas (Lahmacun)',
    description: 'Nuestra pizza turca artesanal enrollada con relleno extra de carne döner, verduras frescas y salsa blanca.',
    price: 8.90,
    stock: 15,
    tags: ['Gluten', 'Lácteos', 'Favorito'],
    customizable: true,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'patatas-fritas',
    name: 'Ración de Patatas Fritas',
    category: 'Raciones y Extras',
    description: 'Patatas doradas y crujientes con sal fina turca y especias de la casa. Incluidas en todos los menús combo.',
    price: 3.00,
    stock: 35,
    tags: ['Vegetariano', 'Sin gluten'],
    customizable: false,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'nuggets-pollo',
    name: 'Nuggets de Pollo (6 uds.)',
    category: 'Raciones y Extras',
    description: 'Bocados crujientes de pechuga de pollo dorados al momento, ideales para compartir o picar.',
    price: 4.50,
    stock: 14,
    tags: ['Gluten'],
    customizable: false,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'racion-falafel',
    name: 'Ración de Falafel (5 uds.)',
    category: 'Raciones y Extras',
    description: 'Cinco unidades de falafel casero recién frito acompañadas de salsa de yogur y hierbabuena.',
    price: 4.80,
    stock: 10,
    tags: ['Vegetariano', 'Sésamo'],
    customizable: false,
    image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'bebida-cocacola',
    name: 'Coca-Cola 33cl',
    category: 'Bebidas',
    description: 'Lata bien fría de Coca-Cola Original 330 ml.',
    price: 2.00,
    stock: 30,
    tags: ['Fría'],
    customizable: false,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'bebida-fanta',
    name: 'Fanta Naranja 33cl',
    category: 'Bebidas',
    description: 'Refresco burbujeante de naranja bien frío en lata de 330 ml.',
    price: 2.00,
    stock: 24,
    tags: ['Fría'],
    customizable: false,
    image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'bebida-agua',
    name: 'Agua Mineral 50cl',
    category: 'Bebidas',
    description: 'Botella de agua mineral natural fría de 500 ml.',
    price: 1.50,
    stock: 32,
    tags: ['Sin azúcar'],
    customizable: false,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=900&q=80'
  },
  {
    id: 'bebida-ayran',
    name: 'Ayran Turco Tradicional',
    category: 'Bebidas',
    description: 'Bebida refrescante típica de Turquía a base de yogur batido, agua fría y una pizca de sal.',
    price: 2.20,
    stock: 18,
    tags: ['Lácteos', 'Auténtico'],
    customizable: false,
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=900&q=80'
  }
];

/**
 * Genera una ilustración SVG elegante en caso de que la fotografía externa no cargue.
 */
window.getCategoryFallbackSvg = function getCategoryFallbackSvg(category, title) {
  const palette = {
    'Platos Kebab': { bg1: '#FFF7ED', bg2: '#FFEDD5', accent: '#F97316', label: 'PLATO KEBAB' },
    'Dürüms y Pitas': { bg1: '#FEF3C7', bg2: '#FDE68A', accent: '#EA580C', label: 'DÜRÜM & PITA' },
    'Pizzas Turcas (Lahmacun)': { bg1: '#FEE2E2', bg2: '#FED7AA', accent: '#DC2626', label: 'LAHMACUN' },
    'Raciones y Extras': { bg1: '#FEF9C3', bg2: '#FDE047', accent: '#D97706', label: 'RACIÓN' },
    'Bebidas': { bg1: '#EFF6FF', bg2: '#DBEAFE', accent: '#2563EB', label: 'BEBIDA FRÍA' }
  }[category] || { bg1: '#F3F4F6', bg2: '#E5E7EB', accent: '#F97316', label: 'KASHI TURCA' };

  const safeTitle = String(title || 'Especialidad Kashi').slice(0, 26).replace(/[<>&"]/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.bg1}"/>
          <stop offset="100%" stop-color="${palette.bg2}"/>
        </linearGradient>
      </defs>
      <rect width="640" height="400" fill="url(#g)"/>
      <circle cx="320" cy="175" r="96" fill="#FFFFFF" stroke="${palette.accent}" stroke-width="6" opacity="0.92"/>
      <circle cx="320" cy="175" r="70" fill="${palette.accent}" opacity="0.16"/>
      <path d="M275 188 C290 140, 350 140, 365 188 Z" fill="${palette.accent}" opacity="0.88"/>
      <circle cx="305" cy="168" r="10" fill="#1F2937" opacity="0.8"/>
      <circle cx="336" cy="172" r="8" fill="#16A34A" opacity="0.85"/>
      <text x="320" y="315" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${palette.accent}" letter-spacing="2">${palette.label}</text>
      <text x="320" y="346" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1F2937">${safeTitle}</text>
    </svg>
  `.trim();
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
};
