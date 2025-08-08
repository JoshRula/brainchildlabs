document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navList = document.querySelector('nav ul');
  function closeMenu() {
    navList.classList.remove('show');
    document.removeEventListener('click', handleOutsideClick);
  }

  function handleOutsideClick(e) {
    if (!navList.contains(e.target) && !menuToggle.contains(e.target)) {
      closeMenu();
    }
  }

  if (menuToggle && navList) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navList.classList.toggle('show');
      if (navList.classList.contains('show')) {
        document.addEventListener('click', handleOutsideClick);
      } else {
        document.removeEventListener('click', handleOutsideClick);
      }
    });

    navList.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Thank you! We will contact you soon.');
      form.reset();
    });
  }
});
