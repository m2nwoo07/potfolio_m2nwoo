/* ── URL 복사 기능 ── */
function copyURL() {
  const url = window.location.href;
  navigator.clipboard.writeText(url)
    .then(() => showToast('URL이 복사되었습니다 ✓'))
    .catch(() => {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('URL이 복사되었습니다 ✓');
    });
}

/* ── 토스트 알림 ── */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ── 스크롤 페이드인 ── */
const fadeEls = document.querySelectorAll('.fade-in');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 60);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
fadeEls.forEach(el => observer.observe(el));

/* ── 네비게이션 스크롤 그림자 ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    navbar.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
  } else {
    navbar.style.boxShadow = 'none';
  }
});
