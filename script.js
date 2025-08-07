document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navList = document.querySelector('nav ul');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      navList.classList.toggle('show');
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
