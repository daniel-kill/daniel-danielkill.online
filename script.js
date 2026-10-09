const root = document.documentElement;
const toggleButton = document.querySelector('.theme-toggle');
const themeIcon = document.querySelector('.theme-toggle__icon');

const getPreferredTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme) => {
  root.dataset.theme = theme;
  document.body.dataset.theme = theme;

  const isDark = theme === 'dark';
  if (themeIcon) {
    themeIcon.textContent = isDark ? '🌙' : '☀️';
  }

  if (toggleButton) {
    toggleButton.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggleButton.setAttribute('aria-pressed', String(isDark));
  }

  localStorage.setItem('theme', theme);
};

const initializeTheme = () => {
  const currentTheme = getPreferredTheme();
  applyTheme(currentTheme);
};

if (toggleButton) {
  toggleButton.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  });
}

initializeTheme();
