window.initFestivalNavMenu = async function () {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const menuMobileList = document.getElementById('menuMobileList');
  const menuDesktopList = document.getElementById('menuDesktopList');

  if (!menuMobileList || !menuDesktopList) {
    console.warn('Contenedores de menú no encontrados');
    return;
  }

  try {
    const resp = await fetch('../data/menu.json');
    const menuData = await resp.json();
    const items = isLocalhost ? menuData.local : menuData.produccion;

    menuMobileList.innerHTML = '';
    menuDesktopList.innerHTML = '';

    items.forEach(item => {
      // Mobile: ítems como nav-link
      const mobileItem = document.createElement('li');
      mobileItem.className = 'nav-item';
      mobileItem.innerHTML = `<a class="nav-link" href="${item.href}">${item.label}</a>`;
      menuMobileList.appendChild(mobileItem);

      // Desktop: ítems como dropdown-item
      const desktopItem = document.createElement('li');
      desktopItem.innerHTML = `<a class="dropdown-item" href="${item.href}">${item.label}</a>`;
      menuDesktopList.appendChild(desktopItem);
    });
  } catch (err) {
    console.error('Error cargando menú:', err);
    menuMobileList.innerHTML = '<li class="nav-item"><span class="nav-link text-danger">Error al cargar menú</span></li>';
    menuDesktopList.innerHTML = '<li><span class="dropdown-item text-danger">Error al cargar menú</span></li>';
  }
};