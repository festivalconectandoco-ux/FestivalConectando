window.initFestivalNavMenu = async function () {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const menuList = document.getElementById('menuDropdownList');
  if (!menuList) {
    console.warn('menuDropdownList no encontrado');
    return;
  }
  try {
    const resp = await fetch('../data/menu.json');
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
};
