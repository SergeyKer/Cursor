(function () {
  "use strict";

  const SERVICE_NAME = "E-liss";
  const DEMO_TOAST = "В демо-режиме действие не выполняется.";
  const AI_CHIPS = [
    "Когда следующая замена?",
    "Какие неоплаченные счета?",
    "Какие ковры и на каких объектах?",
  ];

  const SECTIONS = [
    { id: "overview", label: "Главная" },
    { id: "visits", label: "Замены ковров" },
    { id: "sites", label: "Объекты и ковры" },
    { id: "invoices", label: "Счета и оплата" },
    { id: "ask_ai", label: "Спросить у ИИ" },
    { id: "requests", label: "Заявки" },
    { id: "contract", label: "Договор" },
    { id: "manager", label: "Ваш менеджер" },
    { id: "help", label: "Помощь" },
  ];

  const STATUS_LABELS = {
    scheduled: "Запланировано",
    done: "Выполнено",
    issued: "К оплате",
    paid: "Оплачен",
    in_progress: "В работе",
    new: "Новая",
    done_request: "Закрыта",
  };

  function getDataBasePath() {
    if (typeof window === "undefined" || !window.location) return "/data";
    const p = window.location.protocol;
    const pathname = window.location.pathname || "";
    if (p === "file:") return "../data";
    if (pathname.indexOf("/frontend") !== -1 || pathname.endsWith(".html")) return "/data";
    return "/data";
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(
      amount
    );
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }

  function formatDateShort(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }

  function carpetCount(site) {
    return (site.carpets || []).reduce((sum, c) => sum + (c.qty || 1), 0);
  }

  function uniqueSizes(site) {
    return [...new Set((site.carpets || []).map((c) => c.size))].join(", ");
  }

  function nextVisit(site) {
    const scheduled = (site.visits || [])
      .filter((v) => v.status === "scheduled")
      .sort((a, b) => a.date.localeCompare(b.date));
    return scheduled[0] || null;
  }

  function lastDoneVisit(site) {
    const done = (site.visits || [])
      .filter((v) => v.status === "done")
      .sort((a, b) => b.date.localeCompare(a.date));
    return done[0] || null;
  }

  function visitSummary(site) {
    const next = nextVisit(site);
    if (next) return { text: formatDateShort(next.date), sub: "следующая замена", kind: "scheduled" };
    const last = lastDoneVisit(site);
    if (last) return { text: formatDateShort(last.date), sub: "последняя замена", kind: "done" };
    return { text: "—", sub: "нет данных", kind: "muted" };
  }

  function filterSites(data, siteId) {
    if (!siteId) return data.sites || [];
    return (data.sites || []).filter((s) => s.id === siteId);
  }

  function statusBadge(status, map) {
    const label = map[status] || STATUS_LABELS[status] || status;
    const cls = "cabinet-badge cabinet-badge--" + String(status).replace(/_/g, "-");
    return `<span class="${cls}">${escapeHtml(label)}</span>`;
  }

  function colorSwatch(color) {
    const c = color === "коричневый" ? "brown" : "gray";
    return `<span class="cabinet-swatch cabinet-swatch--${c}" title="${escapeHtml(color)}"></span>`;
  }

  function typeBadge(type) {
    const premium = type === "премиум";
    return `<span class="cabinet-type ${premium ? "cabinet-type--premium" : "cabinet-type--standard"}">${escapeHtml(type)}</span>`;
  }

  const state = {
    data: null,
    activeTab: "overview",
    selectedSiteId: null,
    loading: false,
    initialized: false,
    root: null,
    toastTimer: null,
    aiQuery: "",
    aiLoading: false,
    aiLastResult: null,
    aiError: null,
    returnTab: null,
  };

  function showToast(message) {
    let el = document.getElementById("cabinetToast");
    if (!el && state.root) {
      el = document.createElement("div");
      el.id = "cabinetToast";
      el.className = "cabinet-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      state.root.appendChild(el);
    }
    if (!el) return;
    el.textContent = message;
    el.classList.add("cabinet-toast--visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove("cabinet-toast--visible"), 2800);
  }

  function setTab(tabId, options) {
    state.activeTab = tabId;
    if (options?.fromUserNav) state.returnTab = null;
    syncUrl();
    updateNavUi();
    renderPanel();
    scrollCabinetToNav();
  }

  function setSite(siteId) {
    state.selectedSiteId = siteId || null;
    syncUrl();
    const siteSelect = document.getElementById("cabinetSiteSelect");
    if (siteSelect) siteSelect.value = state.selectedSiteId || "";
    renderPanel();
  }

  function rememberReturnTab() {
    if (state.activeTab === "ask_ai") state.returnTab = "ask_ai";
  }

  function getSelectedSite() {
    if (!state.selectedSiteId || !state.data) return null;
    return (state.data.sites || []).find((s) => s.id === state.selectedSiteId) || null;
  }

  function cabinetGoBack() {
    if (state.selectedSiteId) {
      setSite(null);
      return;
    }
    if (state.returnTab) {
      const tab = state.returnTab;
      state.returnTab = null;
      setTab(tab);
      return;
    }
    if (state.activeTab !== "overview") {
      setTab("overview", { fromUserNav: true });
    }
  }

  function backButtonLabel() {
    if (state.selectedSiteId) return "← Все объекты";
    if (state.returnTab === "ask_ai") return "← Спросить у ИИ";
    if (state.activeTab !== "overview") return "← На главную";
    return "← Назад";
  }

  function showCabinetBack() {
    return Boolean(state.selectedSiteId || state.returnTab || state.activeTab !== "overview");
  }

  function renderPanelToolbar() {
    const section = SECTIONS.find((s) => s.id === state.activeTab);
    const site = getSelectedSite();
    const sectionLabel = section ? section.label : "";

    let crumbs =
      '<nav class="cabinet-crumb" aria-label="Путь в кабинете">' +
      '<button type="button" class="cabinet-crumb__link" data-cabinet-crumb data-goto-tab="overview" data-clear-site="1">Главная</button>';

    if (state.activeTab !== "overview" || site) {
      crumbs += '<span class="cabinet-crumb__sep" aria-hidden="true">›</span>';
      if (site) {
        const sectionCrumbTab = state.activeTab === "sites" ? "sites" : state.activeTab;
        crumbs +=
          `<button type="button" class="cabinet-crumb__link" data-cabinet-crumb data-goto-tab="${escapeHtml(sectionCrumbTab)}" data-clear-site="1">${escapeHtml(sectionLabel)}</button>` +
          '<span class="cabinet-crumb__sep" aria-hidden="true">›</span>' +
          `<span class="cabinet-crumb__current">${escapeHtml(site.siteType)}, ${escapeHtml(site.label)}</span>`;
      } else {
        crumbs += `<span class="cabinet-crumb__current">${escapeHtml(sectionLabel)}</span>`;
      }
    }

    crumbs += "</nav>";

    const backBtn = showCabinetBack()
      ? `<button type="button" class="cabinet-back" data-cabinet-back>${escapeHtml(backButtonLabel())}</button>`
      : "";

    return `<div class="cabinet-panel__toolbar">${backBtn}${crumbs}</div>`;
  }

  function syncUrl() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("view", "cabinet");
      if (state.activeTab && state.activeTab !== "overview") url.searchParams.set("tab", state.activeTab);
      else url.searchParams.delete("tab");
      if (state.selectedSiteId) url.searchParams.set("site", state.selectedSiteId);
      else url.searchParams.delete("site");
      window.history.replaceState({ cabinet: true }, "", url.pathname + url.search);
    } catch (_) {}
  }

  function readUrlParams() {
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      const site = params.get("site");
      if (tab && SECTIONS.some((s) => s.id === tab)) state.activeTab = tab;
      if (site) state.selectedSiteId = site;
    } catch (_) {}
  }

  function scrollCabinetToNav() {
    const head = document.getElementById("cabinetSheetHead");
    if (!head) return;
    const top = head.getBoundingClientRect().top + window.scrollY - 8;
    const headerH =
      parseInt(getComputedStyle(document.documentElement).getPropertyValue("--layout-header-height"), 10) || 56;
    window.scrollTo({ top: Math.max(0, top - headerH), behavior: "smooth" });
  }

  async function loadData() {
    const res = await fetch(getDataBasePath() + "/cabinet-demo.json?v=2");
    if (!res.ok) throw new Error("Не удалось загрузить демо-данные: " + res.status);
    return res.json();
  }

  function renderSiteOptions() {
    const sites = state.data.sites || [];
    let html = '<option value="">Все объекты</option>';
    sites.forEach((s) => {
      html += `<option value="${escapeHtml(s.id)}">${escapeHtml(s.siteType)} — ${escapeHtml(s.label)}</option>`;
    });
    return html;
  }

  function renderNavHead() {
    const navLinks = SECTIONS.map((s) => {
      const active = state.activeTab === s.id;
      return `<button type="button" class="nav__item cabinet-section-btn${active ? " nav__item--active" : ""}" data-tab="${escapeHtml(s.id)}" aria-current="${active ? "page" : "false"}">${escapeHtml(s.label)}</button>`;
    }).join("");

    const selectOptions = SECTIONS.map((s) => {
      const sel = state.activeTab === s.id ? " selected" : "";
      return `<option value="${escapeHtml(s.id)}"${sel}>${escapeHtml(s.label)}</option>`;
    }).join("");

    return (
      `<nav class="nav nav--center cabinet-section-nav" aria-label="Разделы личного кабинета">${navLinks}</nav>` +
      `<select id="cabinetSectionSelect" class="nav__item nav__item--active cabinet-section-select" aria-label="Раздел личного кабинета">${selectOptions}</select>`
    );
  }

  function renderContextBar() {
    const data = state.data;
    const co = data.company;
    const m = data.manager;
    return (
      '<div class="card cabinet-context">' +
      '<div class="cabinet-context__top">' +
      `<div class="cabinet-context__brand"><span class="cabinet-context__service">${escapeHtml(data.serviceName || SERVICE_NAME)}</span>` +
      `<strong class="cabinet-context__client">${escapeHtml(co.name)}</strong></div>` +
      `<p class="cabinet-context__contract">Договор <span>${escapeHtml(co.contractNumber)}</span></p>` +
      `<button type="button" class="cabinet-context__manager-link" data-goto-tab="manager">${escapeHtml(m.name)}</button>` +
      "</div>" +
      '<label class="cabinet-context__site-label">Объект' +
      `<select id="cabinetSiteSelect" class="cabinet-site-select" aria-label="Выбор объекта">${renderSiteOptions()}</select>` +
      "</label></div>"
    );
  }

  function renderSiteMapRow(site) {
    const vs = visitSummary(site);
    const n = carpetCount(site);
    return (
      `<button type="button" class="cabinet-site-map__row" data-goto-site="${escapeHtml(site.id)}" data-goto-tab="sites">` +
      `<span class="cabinet-site-map__type">${escapeHtml(site.siteType)}</span>` +
      '<span class="cabinet-site-map__body">' +
      `<span class="cabinet-site-map__addr">${escapeHtml(site.label)}</span>` +
      `<span class="cabinet-site-map__line"><strong>${escapeHtml(vs.text)}</strong> · ${escapeHtml(vs.sub)}</span>` +
      `<span class="cabinet-site-map__line cabinet-site-map__line--muted">${n} ковр. · ${escapeHtml(site.replacementFrequencyLabel)} · ${escapeHtml(uniqueSizes(site))}</span>` +
      "</span></button>"
    );
  }

  function renderSummaryStats() {
    const data = state.data;
    const sites = filterSites(data, state.selectedSiteId);
    let nearest = null;
    sites.forEach((site) => {
      const n = nextVisit(site);
      if (n && (!nearest || n.date < nearest.date)) nearest = { date: n.date, site };
    });
    const issued = (data.invoices || []).find((i) => i.status === "issued");
    const openReq = (data.requests || []).filter((r) => r.status === "in_progress" || r.status === "new").length;

    return (
      '<div class="cabinet-stats">' +
      `<article class="cabinet-stat card"><span class="cabinet-stat__label">Ближайшая замена</span>` +
      `<strong class="cabinet-stat__value">${nearest ? escapeHtml(formatDateShort(nearest.date)) : "—"}</strong>` +
      `<span class="cabinet-stat__hint">${nearest ? escapeHtml(nearest.site.siteType + " · " + nearest.site.label) : "нет запланированных"}</span></article>` +
      `<article class="cabinet-stat card${issued ? " cabinet-stat--warn" : ""}"><span class="cabinet-stat__label">Счета</span>` +
      `<strong class="cabinet-stat__value">${issued ? escapeHtml(formatMoney(issued.amount)) : "Оплачено"}</strong>` +
      `<span class="cabinet-stat__hint">${issued ? escapeHtml(issued.period) + " · к оплате" : "задолженности нет"}</span></article>` +
      `<article class="cabinet-stat card"><span class="cabinet-stat__label">Заявки</span>` +
      `<strong class="cabinet-stat__value">${openReq}</strong>` +
      `<span class="cabinet-stat__hint">${openReq ? "требуют внимания" : "все закрыты"}</span></article>` +
      "</div>"
    );
  }

  function renderOverview() {
    const mapSites = filterSites(state.data, state.selectedSiteId);
    return (
      renderSummaryStats() +
      '<section class="cabinet-site-map">' +
      '<h3 class="card__title">Объекты на обслуживании</h3>' +
      mapSites.map(renderSiteMapRow).join("") +
      "</section>"
    );
  }

  function renderSites() {
    return filterSites(state.data, state.selectedSiteId)
      .map((site) => {
        const rows = (site.carpets || [])
          .map(
            (c) =>
              `<tr><td data-label="Зона">${escapeHtml(c.zone)}</td>` +
              `<td data-label="Размер">${escapeHtml(c.size)}</td>` +
              `<td data-label="Цвет">${colorSwatch(c.color)} ${escapeHtml(c.color)}</td>` +
              `<td data-label="Тип">${typeBadge(c.type)}</td>` +
              `<td data-label="Артикул">${escapeHtml(c.sku)}</td>` +
              `<td data-label="Кол-во">${c.qty || 1}</td></tr>`
          )
          .join("");
        return (
          `<article class="card cabinet-site-card">` +
          `<h3 class="card__title"><span class="cabinet-site-card__type">${escapeHtml(site.siteType)}</span> ${escapeHtml(site.label)}</h3>` +
          `<p class="cabinet-site-card__meta">${escapeHtml(site.replacementFrequencyLabel)} · ${escapeHtml(site.workHours || "")}</p>` +
          `<div class="table-wrapper"><table class="table table--stack"><thead><tr>` +
          `<th>Зона</th><th>Размер</th><th>Цвет</th><th>Тип</th><th>Артикул</th><th>Кол-во</th></tr></thead><tbody>${rows}</tbody></table></div></article>`
        );
      })
      .join("");
  }

  function renderVisits() {
    const sites = filterSites(state.data, state.selectedSiteId);
    const items = [];
    sites.forEach((site) => {
      (site.visits || []).forEach((v) => items.push({ ...v, site }));
    });
    items.sort((a, b) => b.date.localeCompare(a.date));
    if (!items.length) return '<p class="cabinet-empty">Нет записей о заменах.</p>';
    return (
      '<ul class="cabinet-timeline">' +
      items
        .map(
          (v) =>
            `<li class="cabinet-timeline__item cabinet-timeline__item--${escapeHtml(v.status)}">` +
            `<span class="cabinet-timeline__dot" aria-hidden="true"></span>` +
            `<div class="cabinet-timeline__body"><time datetime="${escapeHtml(v.date)}">${escapeHtml(formatDate(v.date))}</time>` +
            `<span class="cabinet-timeline__site">${escapeHtml(v.site.siteType)} · ${escapeHtml(v.site.label)}</span>` +
            statusBadge(v.status, { scheduled: "Запланировано", done: "Выполнено" }) +
            `</div></li>`
        )
        .join("") +
      "</ul>"
    );
  }

  function renderInvoices() {
    const rows = (state.data.invoices || [])
      .map((inv) => {
        const st = inv.status === "paid" ? "paid" : "issued";
        return (
          `<tr><td data-label="Период">${escapeHtml(inv.period)}</td>` +
          `<td data-label="Сумма"><span class="cabinet-money">${escapeHtml(formatMoney(inv.amount))}</span></td>` +
          `<td data-label="Статус">${statusBadge(st, STATUS_LABELS)}</td>` +
          `<td data-label=""><button type="button" class="cabinet-btn cabinet-btn--ghost cabinet-demo-action">Скачать</button></td></tr>`
        );
      })
      .join("");
    return (
      `<div class="table-wrapper"><table class="table table--stack"><thead><tr>` +
      `<th>Период</th><th>Сумма</th><th>Статус</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
    );
  }

  function renderRequests() {
    let reqs = state.data.requests || [];
    if (state.selectedSiteId) reqs = reqs.filter((r) => r.siteId === state.selectedSiteId);
    const siteById = Object.fromEntries((state.data.sites || []).map((s) => [s.id, s]));
    return (
      reqs
        .map((r) => {
          const site = siteById[r.siteId];
          const stKey = r.status === "done" ? "done_request" : r.status;
          return (
            `<article class="card cabinet-request-card">` +
            `<div class="cabinet-request-card__head"><h3 class="card__title cabinet-request-card__title">${escapeHtml(r.type)}</h3>` +
            statusBadge(stKey, { in_progress: "В работе", new: "Новая", done_request: "Закрыта" }) +
            `</div><p class="cabinet-request-card__meta">${site ? escapeHtml(site.siteType + " · " + site.label) : ""} · ${escapeHtml(formatDate(r.created))}</p>` +
            `<p class="cabinet-request-card__note">${escapeHtml(r.note || "")}</p></article>`
          );
        })
        .join("") +
      `<p class="cabinet-actions"><button type="button" class="cabinet-btn cabinet-demo-action">Новая заявка</button></p>`
    );
  }

  function renderContract() {
    const c = state.data.company;
    return (
      `<article class="card"><dl class="cabinet-dl">` +
      `<div><dt>Договор</dt><dd>${escapeHtml(c.contractNumber)}</dd></div>` +
      `<div><dt>Действует до</dt><dd>${escapeHtml(formatDate(c.contractUntil))}</dd></div>` +
      `<div><dt>Тариф</dt><dd>${escapeHtml(c.tariff)}</dd></div>` +
      `<div><dt>Статус</dt><dd>${statusBadge("paid", { paid: "Активен" })}</dd></div></dl></article>`
    );
  }

  function renderManager() {
    const m = state.data.manager;
    return (
      `<article class="card cabinet-manager-card">` +
      `<p class="cabinet-manager-card__role">${escapeHtml(m.role)}</p>` +
      `<h3 class="card__title">${escapeHtml(m.name)}</h3>` +
      `<p class="cabinet-manager-card__actions">` +
      `<a class="cabinet-btn" href="tel:${escapeHtml(m.phone.replace(/\s/g, ""))}">Позвонить</a>` +
      `<a class="cabinet-btn cabinet-btn--ghost" href="mailto:${escapeHtml(m.email)}">Написать</a></p>` +
      `<p class="cabinet-manager-card__contact">${escapeHtml(m.phone)}<br>${escapeHtml(m.email)}</p></article>`
    );
  }

  const AI_INTENT_TITLES = {
    next_visit: "Замены ковров",
    unpaid_invoices: "Счета и оплата",
    carpets: "Объекты и ковры",
    general: "Справка по договору",
  };

  function sourceLabel(source) {
    if (source === "facts+llm") return "данные договора + ИИ";
    return "данные договора";
  }

  function aiSourceBadge(source) {
    if (source === "facts+llm") {
      return '<span class="coach-badge coach-badge--high">Данные + ИИ</span>';
    }
    return '<span class="coach-badge coach-badge--medium">Только данные</span>';
  }

  function parseAnswerBullets(text) {
    const lines = String(text || "")
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const bullets = lines
      .filter((l) => /^[•\-*]\s/.test(l) || /^\d+\.\s/.test(l))
      .map((l) => l.replace(/^[•\-*]\s+/, "").replace(/^\d+\.\s+/, "").replace(/\*\*/g, ""));
    return bullets.length >= 2 ? bullets : null;
  }

  function formatAiAnswerHtml(text) {
    const escaped = escapeHtml(String(text || ""));
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");
  }

  function renderAiAnswerBody(answer) {
    const bullets = parseAnswerBullets(answer);
    if (bullets) {
      return `<ul class="coach-section__list">${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;
    }
    return `<p class="coach-card__summary">${formatAiAnswerHtml(answer)}</p>`;
  }

  function renderAiNav(sections) {
    if (!sections.length) return "";
    const links = sections
      .map(
        (s) =>
          `<a href="#${escapeHtml(s.id)}" class="sheet-nav__link" data-cabinet-ai-section="${escapeHtml(s.id)}">${escapeHtml(s.label)}</a>`
      )
      .join("");
    const options = sections
      .map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.label)}</option>`)
      .join("");
    return (
      '<header class="tools-sheet__nav-head coach-results__nav-head cabinet-ai-results__nav">' +
      `<nav class="sheet-nav coach-nav" aria-label="Разделы ответа">${links}</nav>` +
      `<select class="sheet-section-select coach-section-select cabinet-ai-section-select" aria-label="Раздел ответа">${options}</select>` +
      "</header>"
    );
  }

  function scrollToCabinetAiSection(sectionId) {
    if (!sectionId) return;
    const target = document.getElementById(sectionId);
    if (!target) return;
    const head = document.getElementById("cabinetSheetHead");
    const headerH =
      parseInt(getComputedStyle(document.documentElement).getPropertyValue("--layout-header-height"), 10) || 56;
    const navHead = document.querySelector(".cabinet-ai-results__nav");
    const offset = headerH + (head ? head.offsetHeight : 0) + (navHead ? navHead.offsetHeight : 0) + 10;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function renderAiResult() {
    if (state.aiError) {
      return `<p class="cabinet-ai-error" role="alert">${escapeHtml(state.aiError)}</p>`;
    }
    if (!state.aiLastResult) return "";
    const r = state.aiLastResult;
    const title = AI_INTENT_TITLES[r.intent] || "Ответ";
    const citations = r.citations || [];
    const uniqueEvidence = [...new Set(citations.map((c) => c.evidence).filter(Boolean))];

    const navSections = [];
    if (r.answer) navSections.push({ id: "cabinet-ai-section-answer", label: "Кратко" });
    if (citations.length) navSections.push({ id: "cabinet-ai-section-goto", label: "Перейти" });
    if (uniqueEvidence.length) navSections.push({ id: "cabinet-ai-section-proof", label: "Подтверждение" });

    const gotoChips = citations
      .map((c) => {
        const siteAttr = c.siteId ? ` data-goto-site="${escapeHtml(c.siteId)}"` : "";
        return (
          `<button type="button" class="coach-chip" data-goto-tab="${escapeHtml(c.tab)}"${siteAttr}>` +
          `${escapeHtml(c.label)}</button>`
        );
      })
      .join("");

    const proofList = uniqueEvidence.map((e) => `<li>${escapeHtml(e)}</li>`).join("");

    return (
      '<article class="coach-results cabinet-ai-results">' +
      '<header class="coach-header">' +
      '<div class="coach-header__title-row">' +
      `<h3 class="coach-header__title">${escapeHtml(title)}</h3>` +
      aiSourceBadge(r.source) +
      "</div>" +
      `<p class="cabinet-ai-meta">Источник: ${escapeHtml(sourceLabel(r.source))}</p>` +
      "</header>" +
      renderAiNav(navSections) +
      (r.answer
        ? `<section id="cabinet-ai-section-answer" class="card coach-section-card">` +
          '<h3 class="card__title">Кратко</h3>' +
          renderAiAnswerBody(r.answer) +
          "</section>"
        : "") +
      (citations.length
        ? `<section id="cabinet-ai-section-goto" class="card coach-section-card">` +
          '<h3 class="card__title">Перейти в кабинет</h3>' +
          `<div class="coach-chips">${gotoChips}</div>` +
          "</section>"
        : "") +
      (uniqueEvidence.length
        ? `<section id="cabinet-ai-section-proof" class="card coach-section-card">` +
          '<h3 class="card__title">Подтверждение из данных</h3>' +
          `<ul class="coach-section__list">${proofList}</ul>` +
          "</section>"
        : "") +
      "</article>"
    );
  }

  function renderAskAi() {
    const chips = AI_CHIPS.map(
      (q) =>
        `<button type="button" class="cabinet-ai-chip" data-ai-chip="${escapeHtml(q)}">${escapeHtml(q)}</button>`
    ).join("");
    const loading = state.aiLoading;
    return (
      '<div class="cabinet-ai">' +
      '<p class="cabinet-ai-desc">Задайте вопрос по договору, заменам, счетам или коврам — ответ со ссылками на разделы кабинета.</p>' +
      '<div class="cabinet-ai-form">' +
      `<textarea id="cabinetAiInput" class="cabinet-ai-input" rows="3" placeholder="Например: когда следующая замена на Тверской?"${loading ? " disabled" : ""}>${escapeHtml(state.aiQuery)}</textarea>` +
      `<button type="button" class="cabinet-btn cabinet-ai-ask-btn${loading ? " cabinet-ai-ask-btn--loading" : ""}"${loading ? " disabled" : ""}>` +
      `${loading ? "Думаю…" : "Спросить"}</button>` +
      "</div>" +
      `<p id="cabinetAiStatus" class="cabinet-ai-status${loading ? "" : " hidden"}" aria-live="polite">${loading ? "Подбираем ответ по вашим данным…" : ""}</p>` +
      `<div class="cabinet-ai-chips">${chips}</div>` +
      `<div id="cabinetAiResults">${renderAiResult()}</div>` +
      "</div>"
    );
  }

  async function askCabinetAi() {
    const query = String(state.aiQuery || "").trim();
    if (!query || state.aiLoading) return;
    state.aiLoading = true;
    state.aiError = null;
    renderPanel();
    try {
      const res = await fetch("/api/cabinet-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, siteId: state.selectedSiteId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        state.aiLastResult = data.draftAnswer
          ? { answer: data.draftAnswer, citations: data.citations || [], source: "facts" }
          : null;
        state.aiError = data.userMessage || data.error || "Не удалось получить ответ.";
        if (res.status === 404) {
          state.aiError =
            "Сервис /api/cabinet-assistant не найден. Запустите npm run dev в Scripts-CS и откройте http://localhost:3000";
        }
        return;
      }
      state.aiLastResult = data;
      if (data.userMessage && data.llmSkippedReason) {
        state.aiError = null;
      }
    } catch (err) {
      state.aiLastResult = null;
      state.aiError = err instanceof Error ? err.message : "Ошибка сети.";
    } finally {
      state.aiLoading = false;
      renderPanel();
    }
  }

  function renderHelp() {
    return (
      (state.data.faq || [])
        .map((f) => `<details class="cabinet-faq card"><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`)
        .join("") +
      `<p class="cabinet-actions"><button type="button" class="cabinet-btn cabinet-demo-action">Написать в поддержку</button></p>`
    );
  }

  function renderPanelBody() {
    switch (state.activeTab) {
      case "overview":
        return renderOverview();
      case "sites":
        return renderSites();
      case "visits":
        return renderVisits();
      case "invoices":
        return renderInvoices();
      case "ask_ai":
        return renderAskAi();
      case "requests":
        return renderRequests();
      case "contract":
        return renderContract();
      case "manager":
        return renderManager();
      case "help":
        return renderHelp();
      default:
        return renderOverview();
    }
  }

  function renderPanel() {
    const mount = document.getElementById("cabinetPanelMount");
    if (!mount) return;
    const section = SECTIONS.find((s) => s.id === state.activeTab);
    const siteHint = getSelectedSite()
      ? `<p class="cabinet-panel__filter-hint">Показан один объект. <button type="button" class="cabinet-link-btn" data-cabinet-back>Все объекты</button> или выберите «Все объекты» вверху.</p>`
      : "";
    mount.innerHTML =
      `<section class="cabinet-panel card" aria-labelledby="cabinetPanelTitle">` +
      renderPanelToolbar() +
      `<h2 id="cabinetPanelTitle" class="card__title cabinet-panel__title">${escapeHtml(section ? section.label : "")}</h2>` +
      siteHint +
      `<div class="cabinet-panel__body">${renderPanelBody()}</div></section>`;
  }

  function updateNavUi() {
    document.querySelectorAll(".cabinet-section-btn").forEach((btn) => {
      const active = btn.dataset.tab === state.activeTab;
      btn.classList.toggle("nav__item--active", active);
      btn.setAttribute("aria-current", active ? "page" : "false");
    });
    const sectionSelect = document.getElementById("cabinetSectionSelect");
    if (sectionSelect) sectionSelect.value = state.activeTab;
  }

  function renderShell() {
    return (
      '<div class="tools-sheet cabinet-sheet">' +
      '<header class="cabinet-sheet__head" id="cabinetSheetHead">' +
      '<div class="cabinet-sheet__head-row">' +
      '<h2 class="tools-sheet__title cabinet-sheet__title">Личный кабинет <span class="tools-sheet__subtitle">клиентский портал</span></h2>' +
      '<div id="cabinetNavMount" class="cabinet-sheet__nav-slot"></div>' +
      "</div></header>" +
      '<p class="cabinet-demo-banner">Демо · данные вымышленные · сервис E-liss</p>' +
      '<div id="cabinetContextMount"></div>' +
      '<div id="cabinetPanelMount"></div>' +
      "</div>"
    );
  }

  function render() {
    if (!state.root) return;
    if (state.loading) {
      state.root.innerHTML =
        '<div class="tools-sheet cabinet-sheet cabinet-sheet--loading"><div class="cabinet-skeleton"></div></div>';
      return;
    }
    if (!state.data) {
      state.root.innerHTML =
        '<div class="cabinet-error card"><p>Не удалось загрузить демо.</p><button type="button" class="cabinet-btn" id="cabinetRetry">Обновить</button></div>';
      document.getElementById("cabinetRetry")?.addEventListener("click", () => initCabinetDemo({ root: state.root }));
      return;
    }

    if (!state.initialized) {
      state.root.innerHTML = renderShell();
      state.initialized = true;
      const ctx = document.getElementById("cabinetContextMount");
      const nav = document.getElementById("cabinetNavMount");
      if (ctx) ctx.innerHTML = renderContextBar();
      if (nav) nav.innerHTML = renderNavHead();
      const siteSelect = document.getElementById("cabinetSiteSelect");
      if (siteSelect) siteSelect.value = state.selectedSiteId || "";
      document.getElementById("cabinetSectionSelect")?.addEventListener("change", (e) =>
        setTab(e.target.value, { fromUserNav: true })
      );
      document.getElementById("cabinetSiteSelect")?.addEventListener("change", (e) => setSite(e.target.value || null));
      bindEvents();
    }

    updateNavUi();
    renderPanel();
  }

  function bindEvents() {
    if (!state.root) return;
    state.root.addEventListener("click", (e) => {
      if (e.target.closest("[data-cabinet-back]")) {
        cabinetGoBack();
        return;
      }
      const crumb = e.target.closest("[data-cabinet-crumb]");
      if (crumb) {
        if (crumb.dataset.clearSite) setSite(null);
        if (crumb.dataset.gotoTab) setTab(crumb.dataset.gotoTab, { fromUserNav: true });
        return;
      }
      const tabBtn = e.target.closest("[data-tab]");
      if (tabBtn && tabBtn.dataset.tab && tabBtn.tagName !== "SELECT") {
        setTab(tabBtn.dataset.tab, { fromUserNav: true });
        return;
      }
      const gotoSite = e.target.closest("[data-goto-site]");
      if (gotoSite) {
        rememberReturnTab();
        setSite(gotoSite.dataset.gotoSite);
        setTab(gotoSite.dataset.gotoTab || "sites");
        return;
      }
      const gotoTab = e.target.closest("[data-goto-tab]");
      if (gotoTab?.dataset.gotoTab) {
        rememberReturnTab();
        setTab(gotoTab.dataset.gotoTab);
        return;
      }
      if (e.target.closest(".cabinet-demo-action")) {
        e.preventDefault();
        showToast(DEMO_TOAST);
        return;
      }
      const chip = e.target.closest("[data-ai-chip]");
      if (chip?.dataset.aiChip) {
        state.aiQuery = chip.dataset.aiChip;
        askCabinetAi();
        return;
      }
      if (e.target.closest(".cabinet-ai-ask-btn")) {
        const ta = document.getElementById("cabinetAiInput");
        if (ta) state.aiQuery = ta.value;
        askCabinetAi();
        return;
      }
      const aiNav = e.target.closest("[data-cabinet-ai-section]");
      if (aiNav?.dataset.cabinetAiSection) {
        e.preventDefault();
        scrollToCabinetAiSection(aiNav.dataset.cabinetAiSection);
        const sel = document.querySelector(".cabinet-ai-section-select");
        if (sel) sel.value = aiNav.dataset.cabinetAiSection;
      }
    });
    state.root.addEventListener("change", (e) => {
      if (e.target.classList?.contains("cabinet-ai-section-select")) {
        scrollToCabinetAiSection(e.target.value);
      }
    });
    state.root.addEventListener("input", (e) => {
      if (e.target.id === "cabinetAiInput") state.aiQuery = e.target.value;
    });
    state.root.addEventListener("keydown", (e) => {
      if (e.target.id === "cabinetAiInput" && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        state.aiQuery = e.target.value;
        askCabinetAi();
      }
    });
  }

  async function initCabinetDemo(options) {
    const root = options?.root || document.getElementById("cabinetRoot");
    if (!root) return;
    state.root = root;
    readUrlParams();
    state.loading = true;
    state.initialized = false;
    render();
    try {
      state.data = await loadData();
    } catch (err) {
      state.data = null;
      console.error(err);
    }
    state.loading = false;
    render();
  }

  window.initCabinetDemo = initCabinetDemo;
})();
