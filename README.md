# Kashi Kebab Sagasti (Arrandi) - Turca

Aplicación web interactiva de gestión comercial, tienda online con configurador de menú y control de almacén para **Kashi Kebab Sagasti (Arrandi) - Turca** (`Calle Arrandi 25, Barakaldo, 48901`).

## Funcionalidades principales

- **Control de horario comercial (13:00 a 01:00):** Detección automática de hora real con cruce de medianoche, alerta de cierre próximo (`< 30 min`) y **Simulador de Hora** en la barra superior (`11:30`, `21:30`, `00:40`, hora personalizada o real).
- **Carta interactiva y configurador en 4 pasos:** Filtros por categoría, búsqueda, badges de stock/alérgenos y configurador de carne, verduras (`Queso Feta +1,00 €`), salsas y opción **Hacerlo Menú (+2,50 €)** con descuento automático de patatas y bebida.
- **Carrito inteligente y cálculo fiscal (IVA España):** Modalidad *Recoger en local* o *Pide a domicilio* (pedido mínimo `10,00 €`, envío `+2,00 €`), cupón `KASHI10`, selector de IVA (`10%`, `21%`, `4%`), calculadora de cambio en efectivo y reserva programada para apertura (`13:00`) cuando el local está cerrado.
- **Facturación y descarga de tickets:** Generación de ticket térmico con numeración correlativa (`FAC-YYYY-XXXX`), descarga en **PDF** (`jsPDF`), **TXT** e impresión directa (`window.print()`).
- **Gestión de Almacén (Backoffice) e Historial:** Control de stock bajo (`< 5 uds.`), reposición rápida (`+5`, `+10`), edición de precios, alta de nuevos platos, métricas de cierre de caja y persistencia en `localStorage`.

## Uso

Abre `index.html` directamente en cualquier navegador moderno o publícalo con **GitHub Pages** desde la rama principal (`main`).
