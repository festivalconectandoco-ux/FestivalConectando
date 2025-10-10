console.log('festival-conectando-nav.js cargado');

document.addEventListener("DOMContentLoaded", async function () {
    console.log('DOMContentLoaded ejecutado');
  // Verificar si estamos en localhost
  console.log('window.location.hostname: ', window.location.hostname);
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Lista de elementos que solo se mostrarán en producción
  const productionOnlyItems = [
    'ventaBoleteria.html',
    'verBoletas.html',
    'ventaEmprendimientos.html',
    'verEmprendimientos.html',
    'Reportes.html'
    // Agrega aquí más URLs de páginas que quieres que solo aparezcan en producción
  ];

  // Ocultar elementos según el entorno
  if (!isLocalhost) {
    document.querySelectorAll('.dropdown-item').forEach(item => {
      const href = item.getAttribute('href');
      if (!productionOnlyItems.includes(href)) {
        item.style.display = 'none';
      }
    });
  }

  const menuList = document.getElementById('menuDropdownList');
  if (!menuList) return;

  try {
    const resp = await fetch('data/menu.json');
    const menuData = await resp.json();
    const items = isLocalhost ? menuData.local : menuData.produccion;
    menuList.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'dropdown-item';
      a.href = item.href;
      a.textContent = item.label;
      li.appendChild(a);
      menuList.appendChild(li);
    });
  } catch (err) {
    console.error('Error cargando menú:', err);
    menuList.innerHTML = '<li><span class="dropdown-item text-danger">Error al cargar menú</span></li>';
  }
});
