// ===== API 설정 =====
const API_KEY = '7a59042dc9d4fc423e8d95ddbe0d775b';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const POSTER_SIZE = '/w500';
const BACKDROP_SIZE = '/original';

// ===== 탭 설정 =====
const TAB_CONFIG = {
  home:    { label: '현재 상영 중', icon: '🔥', badge: '상영 중',   type: 'movie', endpoint: '/movie/now_playing' },
  movies:  { label: '인기 영화',    icon: '🎬', badge: '인기',     type: 'movie', endpoint: '/movie/popular' },
  series:  { label: '방영 중인 시리즈', icon: '📺', badge: '방영 중', type: 'tv',    endpoint: '/tv/on_the_air' },
};
let activeTab = 'home';

// ===== 상태 관리 =====
let allMovies = [];
let filteredMovies = [];
let displayedCount = 0;
const MOVIES_PER_PAGE = 20;
let currentHeroMovie = null;
let heroRotateInterval = null;

// ===== DOM 요소 =====
const elements = {
  header: document.getElementById('header'),
  heroBackdrop: document.getElementById('heroBackdrop'),
  heroTitle: document.getElementById('heroTitle'),
  heroOverview: document.getElementById('heroOverview'),
  heroMeta: document.getElementById('heroMeta'),
  heroPlayBtn: document.getElementById('heroPlayBtn'),
  heroInfoBtn: document.getElementById('heroInfoBtn'),
  heroSection: document.getElementById('hero'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  errorMessage: document.getElementById('errorMessage'),
  movieGrid: document.getElementById('movieGrid'),
  movieCount: document.getElementById('movieCount'),
  loadMore: document.getElementById('loadMore'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  modal: document.getElementById('modal'),
  modalBackdropImg: document.getElementById('modalBackdropImg'),
  modalTitle: document.getElementById('modalTitle'),
  modalMeta: document.getElementById('modalMeta'),
  modalOverview: document.getElementById('modalOverview'),
  modalPoster: document.getElementById('modalPoster'),
  modalDetails: document.getElementById('modalDetails'),
  modalClose: document.getElementById('modalClose'),
  searchToggle: document.getElementById('searchToggle'),
  searchBar: document.getElementById('searchBar'),
  searchInput: document.getElementById('searchInput'),
  sectionLabel: document.getElementById('sectionLabel'),
  sectionIcon: document.getElementById('sectionIcon'),
  heroBadge: document.getElementById('heroBadge'),
};

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  fetchMovies();
  setupEventListeners();
});

// ===== 이벤트 리스너 설정 =====
function setupEventListeners() {
  // 헤더 스크롤 효과
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      elements.header.classList.add('scrolled');
    } else {
      elements.header.classList.remove('scrolled');
    }
  });

  // 네비게이션 탭 클릭
  document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.dataset.tab;
      if (tab === activeTab) return;
      switchTab(tab);
    });
  });

  // 더 보기 버튼
  elements.loadMoreBtn.addEventListener('click', loadMoreMovies);

  // 모달 닫기
  elements.modalClose.addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);

  // 키보드 ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // 검색 토글
  elements.searchToggle.addEventListener('click', () => {
    elements.searchBar.classList.toggle('active');
    if (elements.searchBar.classList.contains('active')) {
      elements.searchInput.focus();
    }
  });

  // 검색 입력
  elements.searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    filterMovies(query);
  });

  // 히어로 버튼
  elements.heroInfoBtn.addEventListener('click', () => {
    if (currentHeroMovie) openModal(currentHeroMovie);
  });

  elements.heroPlayBtn.addEventListener('click', () => {
    if (currentHeroMovie) {
      const config = TAB_CONFIG[activeTab];
      const path = config.type === 'tv' ? 'tv' : 'movie';
      window.open(
        `https://www.themoviedb.org/${path}/${currentHeroMovie.id}`,
        '_blank'
      );
    }
  });
}

// ===== 탭 전환 =====
function switchTab(tab) {
  activeTab = tab;
  const config = TAB_CONFIG[tab];

  // 네비 active 상태 변경
  document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tab);
  });

  // 섹션 제목/아이콘 및 히어로 배지 변경
  elements.sectionLabel.textContent = config.label;
  elements.sectionIcon.textContent = config.icon;
  elements.heroBadge.textContent = config.badge;

  // 검색창 초기화
  elements.searchInput.value = '';
  elements.searchBar.classList.remove('active');

  // 히어로: 홈/영화는 보여주고 시리즈도 보여줌 (항상 표시)
  elements.heroSection.style.display = 'flex';

  // 데이터 새로 불러오기
  fetchMovies();
}

// ===== API 호출 =====
async function fetchMovies() {
  showLoading(true);
  hideError();

  try {
    const [page1, page2] = await Promise.all([
      fetchPage(1),
      fetchPage(2),
    ]);

    const movies1 = page1.results || [];
    const movies2 = page2.results || [];
    allMovies = [...movies1, ...movies2];
    filteredMovies = [...allMovies];

    if (allMovies.length === 0) {
      throw new Error('영화 데이터가 없습니다.');
    }

    setupHero();
    renderMovies();
    updateMovieCount();

  } catch (err) {
    console.error('영화 데이터 불러오기 실패:', err);
    showError(err.message || '영화 정보를 불러오는 데 실패했습니다.');
  } finally {
    showLoading(false);
  }
}

async function fetchPage(page) {
  const { endpoint, type } = TAB_CONFIG[activeTab];
  const region = type === 'movie' ? '&region=KR' : '';
  const url = `${BASE_URL}${endpoint}?api_key=${API_KEY}&language=ko-KR&page=${page}${region}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) throw new Error('API 키가 유효하지 않습니다.');
    if (response.status === 404) throw new Error('요청한 데이터를 찾을 수 없습니다.');
    throw new Error(`서버 오류 (${response.status})`);
  }

  return response.json();
}

// ===== 히어로 섹션 =====
function setupHero() {
  const moviesWithBackdrop = allMovies.filter(m => m.backdrop_path);
  if (moviesWithBackdrop.length === 0) return;

  const topMovies = moviesWithBackdrop
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 5);

  let heroIndex = 0;
  setHeroMovie(topMovies[heroIndex]);

  // 8초마다 히어로 영화 교체
  if (heroRotateInterval) clearInterval(heroRotateInterval);
  heroRotateInterval = setInterval(() => {
    heroIndex = (heroIndex + 1) % topMovies.length;
    fadeHeroTransition(() => setHeroMovie(topMovies[heroIndex]));
  }, 8000);
}

function setHeroMovie(movie) {
  currentHeroMovie = movie;

  const backdropUrl = `${IMG_BASE}${BACKDROP_SIZE}${movie.backdrop_path}`;
  elements.heroBackdrop.style.backgroundImage = `url(${backdropUrl})`;

  elements.heroTitle.textContent = getItemTitle(movie);
  elements.heroOverview.textContent = movie.overview || '줄거리 정보가 없습니다.';

  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const year = getItemYear(movie);
  const lang = getLanguageName(movie.original_language);

  elements.heroMeta.innerHTML = `
    <span class="rating">⭐ ${rating}</span>
    ${year ? `<span class="year">${year}</span>` : ''}
    ${lang ? `<span class="lang">${lang}</span>` : ''}
  `;
}

function fadeHeroTransition(callback) {
  elements.heroBackdrop.style.opacity = '0';
  setTimeout(() => {
    callback();
    elements.heroBackdrop.style.opacity = '1';
  }, 400);
}

// ===== 영화 렌더링 =====
function renderMovies(reset = true) {
  if (reset) {
    elements.movieGrid.innerHTML = '';
    displayedCount = 0;
  }

  if (filteredMovies.length === 0) {
    elements.movieGrid.innerHTML = `
      <div class="no-results">
        <div class="no-results__icon">🔍</div>
        <p>검색 결과가 없습니다.</p>
      </div>
    `;
    elements.loadMore.style.display = 'none';
    return;
  }

  const slice = filteredMovies.slice(displayedCount, displayedCount + MOVIES_PER_PAGE);

  slice.forEach((movie, index) => {
    const card = createMovieCard(movie, displayedCount + index);
    elements.movieGrid.appendChild(card);
  });

  displayedCount += slice.length;

  elements.loadMore.style.display =
    displayedCount < filteredMovies.length ? 'flex' : 'none';
}

function getItemTitle(item) {
  return item.title || item.name || item.original_title || item.original_name || '제목 없음';
}

function getItemYear(item) {
  const date = item.release_date || item.first_air_date || '';
  return date ? date.substring(0, 4) : '';
}

function createMovieCard(movie, index) {
  const card = document.createElement('div');
  card.className = 'movie-card';
  card.style.animationDelay = `${(index % MOVIES_PER_PAGE) * 0.04}s`;

  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const year = getItemYear(movie);
  const title = getItemTitle(movie);
  const badge = TAB_CONFIG[activeTab].badge;

  const playBtnSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>`;

  const overlayContent = `
    <div class="movie-card__title">${escapeHtml(title)}</div>
    <div class="movie-card__meta">
      <span class="movie-card__rating">⭐ ${rating}</span>
      ${year ? `<span class="movie-card__year">${year}</span>` : ''}
    </div>
    <button class="movie-card__play">${playBtnSvg} 상세 보기</button>
  `;

  if (movie.poster_path) {
    const posterUrl = `${IMG_BASE}${POSTER_SIZE}${movie.poster_path}`;
    card.innerHTML = `
      <img
        class="movie-card__poster"
        src="${posterUrl}"
        alt="${escapeHtml(title)}"
        loading="lazy"
        onerror="this.parentElement.querySelector('.movie-card__overlay').style.opacity='1'; this.style.display='none';"
      />
      <div class="movie-card__badge">${escapeHtml(badge)}</div>
      <div class="movie-card__overlay">${overlayContent}</div>
    `;
  } else {
    card.innerHTML = `
      <div class="movie-card__no-poster">
        <div class="no-poster-icon">🎬</div>
        <div class="no-poster-title">${escapeHtml(title)}</div>
      </div>
      <div class="movie-card__badge">${escapeHtml(badge)}</div>
      <div class="movie-card__overlay" style="opacity:1; background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%);">${overlayContent}</div>
    `;
  }

  card.addEventListener('click', () => openModal(movie));
  return card;
}

function loadMoreMovies() {
  renderMovies(false);
}

// ===== 필터링 (검색) =====
function filterMovies(query) {
  if (!query) {
    filteredMovies = [...allMovies];
  } else {
    filteredMovies = allMovies.filter(movie => {
      const title = (movie.title || '').toLowerCase();
      const originalTitle = (movie.original_title || '').toLowerCase();
      return title.includes(query) || originalTitle.includes(query);
    });
  }

  updateMovieCount();
  renderMovies(true);
}

function updateMovieCount() {
  elements.movieCount.textContent = `총 ${filteredMovies.length}편`;
}

// ===== 모달 =====
function openModal(movie) {
  const title = getItemTitle(movie);
  const originalTitle = movie.original_title || movie.original_name || '-';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const rawDate = movie.release_date || movie.first_air_date || '';
  const year = rawDate ? rawDate.substring(0, 4) : '정보 없음';
  const lang = getLanguageName(movie.original_language);
  const voteCount = movie.vote_count ? movie.vote_count.toLocaleString() : '0';
  const isSeries = TAB_CONFIG[activeTab].type === 'tv';

  // 백드롭 이미지
  if (movie.backdrop_path) {
    elements.modalBackdropImg.src = `${IMG_BASE}/w1280${movie.backdrop_path}`;
    elements.modalBackdropImg.alt = title;
  } else if (movie.poster_path) {
    elements.modalBackdropImg.src = `${IMG_BASE}/w780${movie.poster_path}`;
    elements.modalBackdropImg.alt = title;
  } else {
    elements.modalBackdropImg.src = '';
  }

  // 포스터
  if (movie.poster_path) {
    elements.modalPoster.src = `${IMG_BASE}${POSTER_SIZE}${movie.poster_path}`;
    elements.modalPoster.alt = title;
    elements.modalPoster.style.display = 'block';
  } else {
    elements.modalPoster.style.display = 'none';
  }

  elements.modalTitle.textContent = title;

  elements.modalMeta.innerHTML = `
    <span class="rating">⭐ ${rating}</span>
    <span class="tag">${year}년</span>
    ${lang ? `<span class="tag">${lang}</span>` : ''}
    <span class="tag">평가 ${voteCount}건</span>
  `;

  elements.modalOverview.textContent = movie.overview || '줄거리 정보가 제공되지 않습니다.';

  elements.modalDetails.innerHTML = `
    <p><strong>원제</strong> ${escapeHtml(originalTitle)}</p>
    <p><strong>${isSeries ? '첫 방영일' : '개봉일'}</strong> ${formatDate(rawDate)}</p>
    <p><strong>평점</strong> ${rating} / 10 (${voteCount}건)</p>
    <p><strong>언어</strong> ${lang || movie.original_language || '-'}</p>
    ${!isSeries && movie.adult ? '<p><strong>등급</strong> 성인 (19+)</p>' : ''}
  `;

  elements.modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  elements.modal.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== UI 상태 =====
function showLoading(show) {
  elements.loading.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.error.style.display = 'flex';
  elements.movieGrid.style.display = 'none';
}

function hideError() {
  elements.error.style.display = 'none';
  elements.movieGrid.style.display = 'grid';
}

// ===== 유틸리티 =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '정보 없음';
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

function getLanguageName(code) {
  const langs = {
    ko: '한국어', en: '영어', ja: '일본어', zh: '중국어',
    fr: '프랑스어', de: '독일어', es: '스페인어', it: '이탈리아어',
    pt: '포르투갈어', ru: '러시아어', hi: '힌디어', ar: '아랍어',
    th: '태국어', tr: '터키어', nl: '네덜란드어', sv: '스웨덴어',
  };
  return langs[code] || code?.toUpperCase() || '';
}
