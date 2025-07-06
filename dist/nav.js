// nav.js: Injects nav.html into #nav
(function() {
  const navContainer = document.getElementById('nav');
  if (!navContainer) return;
  fetch('/nav.html')
    .then(r => r.text())
    .then(html => {
      navContainer.innerHTML = html;
      const burger = navContainer.querySelector('.nav-burger');
      const navLinks = navContainer.querySelector('.nav-links');
      function updateNavDisplay() {
        if (window.innerWidth <= 700) {
          navLinks.style.display = 'none';
          burger.style.display = 'flex';
          burger.setAttribute('aria-expanded', 'false');
          burger.classList.remove('open');
        } else {
          navLinks.style.display = 'flex';
          burger.style.display = 'none';
          burger.setAttribute('aria-expanded', 'false');
          burger.classList.remove('open');
        }
      }
      if (burger && navLinks) {
        updateNavDisplay();
        burger.addEventListener('click', function() {
          const isOpen = navLinks.style.display === 'flex';
          if (isOpen) {
            navLinks.style.display = 'none';
            burger.setAttribute('aria-expanded', 'false');
            burger.classList.remove('open');
          } else {
            navLinks.style.display = 'flex';
            burger.setAttribute('aria-expanded', 'true');
            burger.classList.add('open');
          }
        });
        window.addEventListener('resize', updateNavDisplay);
      }
    });
})(); 