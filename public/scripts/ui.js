(function () {
  'use strict';

  const POSTS = window.__SEARCH_POSTS__ || [];

  const html = document.documentElement;
  const btnTheme = document.getElementById('btn-theme');
  const header = document.getElementById('site-header');
  const btnSearchOpen = document.getElementById('btn-search-open');
  const btnSearchClose = document.getElementById('btn-search-close');
  const searchInput = document.getElementById('search-input');
  const resultsPanel = document.getElementById('search-results-panel');
  const resultsList = document.getElementById('search-results-list');
  const hamburger = document.getElementById('btn-hamburger');
  const mobileNavEl = document.getElementById('mobile-nav');
  const iconMenu = document.getElementById('icon-hamburger');
  const iconClose = document.getElementById('icon-hamburger-close');
  let focusedIdx = -1;
  let lastFocusedElement = null;

  function createBrandWord(match) {
    const word = document.createElement('span');
    word.className = 'brand-word';
    word.setAttribute('aria-label', match);

    Array.from(match).forEach((char, index, chars) => {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = char;
      if (char.toLowerCase() === 'q' && index === chars.length - 1) {
        span.className = 'brand-q';
      }
      word.appendChild(span);
    });

    return word;
  }

  function enhanceBrandWords(root = document.body) {
    const skipTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'SVG']);
    const matcher = /\b(?:GinkgoQ|GINKGOQ)\b/g;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || skipTags.has(parent.tagName) || parent.closest('.brand-word')) {
          return NodeFilter.FILTER_REJECT;
        }
        matcher.lastIndex = 0;
        return matcher.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const text = node.nodeValue || '';
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      matcher.lastIndex = 0;
      text.replace(matcher, (match, offset) => {
        if (offset > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        }
        fragment.appendChild(createBrandWord(match));
        lastIndex = offset + match.length;
        return match;
      });

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      node.parentNode?.replaceChild(fragment, node);
    });
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('gq-theme', theme);
    btnTheme?.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  const storedTheme = localStorage.getItem('gq-theme');
  const initialTheme = storedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initialTheme);
  enhanceBrandWords();

  btnTheme?.addEventListener('click', () => {
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  function normalizePath(path) {
    return path.replace(/\/+/g, '/').replace(/(^\/|\/$)/g, '') || '/';
  }

  function setActiveNavigation() {
    const current = normalizePath(window.location.pathname);
    document.querySelectorAll('.site-nav a, .mobile-nav a').forEach((link) => {
      const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
      const isHomeLink = linkPath === '/';
      const isMatch = isHomeLink
        ? current === '/'
        : current === linkPath || current.startsWith(`${linkPath}/`);

      const inDesktop = !!link.closest('.site-nav');
      const inMobile = !!link.closest('.mobile-nav');

      link.classList.toggle('active', isMatch && inDesktop);
      link.classList.toggle('active-mobile', isMatch && inMobile);

      if (isMatch && inDesktop) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
      if (isMatch && inMobile) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  setActiveNavigation();
  window.addEventListener('popstate', setActiveNavigation);

  function setInertOverlay(state) {
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    [main, footer].forEach((el) => {
      if (!el) return;
      if ('inert' in el) el.inert = state;
      if (state) {
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('aria-hidden');
      }
    });
  }

  function closeMobileNav() {
    mobileNavEl?.classList.remove('open');
    mobileNavEl?.setAttribute('aria-hidden', 'true');
    hamburger?.setAttribute('aria-expanded', 'false');
    if (iconMenu) iconMenu.style.display = '';
    if (iconClose) iconClose.style.display = 'none';
    setInertOverlay(false);
    if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  hamburger?.addEventListener('click', () => {
    const isOpen = mobileNavEl?.classList.toggle('open') ?? false;
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    mobileNavEl?.setAttribute('aria-hidden', String(!isOpen));
    if (iconMenu) iconMenu.style.display = isOpen ? 'none' : '';
    if (iconClose) iconClose.style.display = isOpen ? '' : 'none';
    setInertOverlay(isOpen);
    if (isOpen) {
      lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      mobileNavEl?.querySelector('a')?.focus();
    }
  });

  function renderResults(queryValue) {
    if (!resultsList || !searchInput) return;
    const query = queryValue.trim().toLowerCase();
    const hasQuery = query.length >= 2;
    const items = hasQuery
      ? POSTS.filter((post) =>
          post.title.toLowerCase().includes(query) ||
          post.description.toLowerCase().includes(query) ||
          post.category.toLowerCase().includes(query)
        )
      : [];

    resultsList.textContent = '';
    focusedIdx = -1;
    searchInput.removeAttribute('aria-activedescendant');

    const appendState = (title, copy) => {
      const li = document.createElement('li');
      li.className = 'search-empty-state';
      const titleEl = document.createElement('p');
      titleEl.className = 'search-empty-title';
      titleEl.textContent = title;
      const copyEl = document.createElement('p');
      copyEl.className = 'search-empty-copy';
      copyEl.textContent = copy;
      li.append(titleEl, copyEl);
      resultsList.appendChild(li);
    };

    if (!query.length) {
      appendState('Search posts and notes', 'Start typing to find articles, research notes, and AI system writing.');
      return;
    }

    if (!hasQuery) {
      appendState('Keep typing', 'Enter at least 2 characters to search the site effectively.');
      return;
    }

    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'search-no-results';
      li.textContent = 'No results found. Try a broader keyword or simplify your query.';
      resultsList.appendChild(li);
      return;
    }

    items.forEach((post, index) => {
      const li = document.createElement('li');
      li.className = 'search-result';
      li.setAttribute('role', 'option');
      li.id = `sr-${index}`;

      const anchor = document.createElement('a');
      anchor.href = post.href;
      anchor.tabIndex = -1;
      anchor.setAttribute('aria-label', `${post.title}. ${post.category}. ${post.description}`);

      const category = document.createElement('span');
      category.className = 'sr-cat';
      category.textContent = post.category;

      const title = document.createElement('span');
      title.className = 'sr-title';
      title.textContent = post.title;

      const desc = document.createElement('span');
      desc.className = 'sr-desc';
      desc.textContent = post.description;

      anchor.append(category, title, desc);
      li.appendChild(anchor);
      resultsList.appendChild(li);
    });
  }

  function openSearch() {
    header?.classList.add('search-open');
    resultsPanel?.classList.add('open');
    resultsPanel?.removeAttribute('hidden');
    btnSearchOpen?.setAttribute('aria-expanded', 'true');
    searchInput?.setAttribute('aria-expanded', 'true');
    btnSearchClose?.removeAttribute('hidden');
    if (searchInput) {
      searchInput.value = '';
      renderResults('');
      setTimeout(() => searchInput.focus(), 120);
    }
  }

  function closeSearch() {
    header?.classList.remove('search-open');
    resultsPanel?.classList.remove('open');
    btnSearchOpen?.setAttribute('aria-expanded', 'false');
    searchInput?.setAttribute('aria-expanded', 'false');
    searchInput?.removeAttribute('aria-activedescendant');
    btnSearchClose?.setAttribute('hidden', '');
    focusedIdx = -1;
    if (resultsPanel) {
      setTimeout(() => {
        if (!header?.classList.contains('search-open')) resultsPanel.setAttribute('hidden', '');
      }, 300);
    }
  }

  function moveFocus(dir) {
    if (!resultsList || !searchInput) return;
    const items = resultsList.querySelectorAll('.search-result');
    if (!items.length) return;
    if (focusedIdx >= 0) items[focusedIdx]?.classList.remove('focused');
    focusedIdx = Math.max(0, Math.min(items.length - 1, focusedIdx + dir));
    items[focusedIdx].classList.add('focused');
    searchInput.setAttribute('aria-activedescendant', items[focusedIdx].id);
    items[focusedIdx].querySelector('a')?.focus();
  }

  btnSearchOpen?.addEventListener('click', openSearch);
  btnSearchClose?.addEventListener('click', closeSearch);

  searchInput?.addEventListener('input', (event) => renderResults(event.target.value));
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(1); }
    if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(-1); }
    if (event.key === 'Escape') closeSearch();
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    }
    if (event.key === '/' && document.activeElement === document.body) {
      event.preventDefault();
      openSearch();
    }
    if (event.key === 'Escape') {
      if (header?.classList.contains('search-open')) closeSearch();
      closeMobileNav();
    }
  });

  document.addEventListener('click', (event) => {
    if (header?.classList.contains('search-open') && !header.contains(event.target) && !resultsPanel?.contains(event.target)) {
      closeSearch();
    }
    if (event.target.closest('.mobile-nav a')) closeMobileNav();
  });

  const sentinel = document.getElementById('scroll-sentinel');
  if (sentinel && header) {
    new IntersectionObserver(
      ([entry]) => header.classList.toggle('scrolled', !entry.isIntersecting),
      { threshold: 1 }
    ).observe(sentinel);
  }

  const progressBar = document.getElementById('reading-progress');
  function updateProgress() {
    if (!progressBar) return;
    const article = document.querySelector('.prose');
    if (!article) {
      progressBar.classList.remove('active');
      progressBar.style.transform = 'scaleX(0)';
      return;
    }
    const rect = article.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) {
      progressBar.classList.remove('active');
      return;
    }
    const pct = Math.max(0, Math.min(1, -rect.top / total));
    progressBar.classList.add('active');
    progressBar.style.transform = `scaleX(${pct})`;
    progressBar.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
  }

  window.addEventListener('scroll', updateProgress, { passive: true });

  document.querySelectorAll('.code-block').forEach((block) => {
    const btn = block.querySelector('.copy-btn');
    const code = block.querySelector('code');
    if (!btn || !code) return;
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(code.innerText).then(() => {
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 1800);
      });
    });
  });

  const bttBtn = document.getElementById('back-to-top');
  if (bttBtn) {
    window.addEventListener('scroll', () => {
      bttBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    bttBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  const tocLinks = document.querySelectorAll('.toc a');
  const headings = document.querySelectorAll('.prose h2[id], .prose h3[id]');
  if (tocLinks.length && headings.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = document.querySelector(`.toc a[href="#${entry.target.id}"]`);
        link?.classList.toggle('active', entry.isIntersecting);
      });
    }, { rootMargin: '-10% 0% -82% 0%', threshold: 0 });
    headings.forEach((heading) => obs.observe(heading));
  }

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    const original = shareBtn.innerHTML;
    shareBtn.addEventListener('click', async () => {
      const title = document.querySelector('.article-header h1')?.textContent?.trim() || document.title;
      const url = location.href;
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
        } else {
          await navigator.clipboard.writeText(url);
          shareBtn.textContent = 'Link copied';
          setTimeout(() => { shareBtn.innerHTML = original; }, 1800);
        }
      } catch (_) {
        // User cancelled native share.
      }
    });
  }

  document.querySelectorAll('.prose h2[id], .prose h3[id]').forEach((heading) => {
    const link = `#${heading.id}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'heading-link';
    button.setAttribute('aria-label', 'Copy link to section');
    button.innerHTML = '<span aria-hidden="true">#</span><span class="sr-only">Copy section link</span>';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(`${location.origin}${location.pathname}${link}`);
        button.textContent = 'Copied';
        button.classList.add('copied');
        setTimeout(() => {
          button.innerHTML = '<span aria-hidden="true">#</span><span class="sr-only">Copy section link</span>';
          button.classList.remove('copied');
        }, 1800);
      } catch (e) {
        console.error('Unable to copy section link', e);
      }
    });
    heading.appendChild(button);
  });

  setActiveNavigation();
  updateProgress();
})();
