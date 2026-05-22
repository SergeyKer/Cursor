// При открытии через file:// используем относительный путь к data
function getDataBasePath() {
  if (typeof window === "undefined" || !window.location) return "/data";
  const p = window.location.protocol;
  const pathname = window.location.pathname || "";
  if (p === "file:") return "../data";
  if (pathname.indexOf("/frontend") !== -1 || pathname.endsWith(".html")) return "/data";
  return "/data";
}
const DATA_BASE_PATH = getDataBasePath();
const MOBILE_LAYOUT_MQ = "(max-width: 767px)";
const SIDEBAR_WIDTH_STORAGE_KEY = "sidebarWidthPx";
const SIDEBAR_WIDTH_MIN = 260;
const SIDEBAR_WIDTH_MAX = 560;
const SIDEBAR_WIDTH_DEFAULT = 340;

const STAGE_TABLE_LABELS = ["Этап", "Описание", "Действия оператора", "Срок", "Цель", "Рекомендации"];
const SCRIPT_CONVERSATION_LABELS = ["Этап разговора", "Формулировка (пример)", "Цель"];
const SCRIPT_COMPLAINT_LABELS = ["Жалоба клиента", "Ответ оператора", "Цель"];
const DIFFICULT_PHRASES_LABELS = ["Тип клиента и сложной ситуации", "Цель оператора", "Готовые формулировки"];
const RECOMMENDATIONS_LABELS = ["Шаг", "Как действовать", "Формулировки / приемы"];
const TOOLS_TABLE_LABELS = ["Инструмент", "Описание", "Когда использовать", "Пример фразы/действия"];

function isMobileLayout() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_LAYOUT_MQ).matches;
}

function clampSidebarWidth(px) {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(px)));
}

function getStoredSidebarWidth() {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) return clampSidebarWidth(n);
  } catch (_) {
    /* ignore */
  }
  return SIDEBAR_WIDTH_DEFAULT;
}

function applySidebarWidth(px) {
  const w = clampSidebarWidth(px);
  document.documentElement.style.setProperty("--sidebar-width", `${w}px`);
  return w;
}

function readSidebarWidthPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? clampSidebarWidth(n) : SIDEBAR_WIDTH_DEFAULT;
}

function persistSidebarWidth(px) {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clampSidebarWidth(px)));
  } catch (_) {
    /* ignore */
  }
}

function initSidebarResize({ sidebar, layout }) {
  const handle = document.getElementById("sidebarResizeHandle");
  if (!handle || !sidebar) return;

  let dragging = false;
  let startX = 0;
  let startW = 0;

  const syncAriaWidth = (w) => {
    handle.setAttribute("aria-valuenow", String(w));
  };

  syncAriaWidth(applySidebarWidth(getStoredSidebarWidth()));

  const onPointerMove = (event) => {
    if (!dragging) return;
    const w = applySidebarWidth(startW + (event.clientX - startX));
    syncAriaWidth(w);
  };

  const stopDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    document.documentElement.classList.remove("sidebar--resizing");
    if (event && handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    persistSidebarWidth(readSidebarWidthPx());
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDrag);
    window.removeEventListener("pointercancel", stopDrag);
  };

  handle.addEventListener("pointerdown", (event) => {
    if (isMobileLayout()) return;
    if (!layout?.classList.contains("sidebar--open")) return;
    event.preventDefault();
    dragging = true;
    startX = event.clientX;
    startW = sidebar.getBoundingClientRect().width;
    document.documentElement.classList.add("sidebar--resizing");
    handle.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  });

  handle.addEventListener("keydown", (event) => {
    if (isMobileLayout()) return;
    let delta = 0;
    if (event.key === "ArrowRight") delta = 16;
    else if (event.key === "ArrowLeft") delta = -16;
    else if (event.key === "Home") {
      event.preventDefault();
      const w = applySidebarWidth(SIDEBAR_WIDTH_MIN);
      syncAriaWidth(w);
      persistSidebarWidth(w);
      return;
    } else if (event.key === "End") {
      event.preventDefault();
      const w = applySidebarWidth(SIDEBAR_WIDTH_MAX);
      syncAriaWidth(w);
      persistSidebarWidth(w);
      return;
    } else return;
    event.preventDefault();
    const w = applySidebarWidth(readSidebarWidthPx() + delta);
    syncAriaWidth(w);
    persistSidebarWidth(w);
  });
}

function appendLabelledCells(tr, labels, values, options) {
  values.forEach((value, i) => {
    const td = document.createElement("td");
    if (labels[i]) td.dataset.label = labels[i];
    if (options && options.preWrap) td.style.whiteSpace = "pre-wrap";
    td.textContent = value || "";
    tr.appendChild(td);
  });
}

function createStackTable(extraClass) {
  const table = document.createElement("table");
  table.className = "table table--stack" + (extraClass ? " " + extraClass : "");
  return table;
}

function syncLayoutHeaderHeight() {
  const header = document.getElementById("contentHeader");
  if (!header) return 0;
  const rect = header.getBoundingClientRect();
  const h = Math.ceil(Math.max(rect.height, rect.bottom));
  if (h > 0) {
    document.documentElement.style.setProperty("--layout-header-height", `${h}px`);
  }
  return h;
}

function syncLayoutHeaderHeightAfterLayout() {
  syncLayoutHeaderHeight();
  requestAnimationFrame(syncLayoutHeaderHeight);
}

function getLayoutHeaderHeight() {
  const header = document.getElementById("contentHeader");
  if (header) return header.getBoundingClientRect().height;
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--layout-header-height")
  );
  return Number.isFinite(v) ? v : 56;
}

function applyProcessDetailContentOffset() {
  const header = document.getElementById("contentHeader");
  const content = document.querySelector(".content");
  if (!header || !content) return;
  const offset = Math.ceil(header.getBoundingClientRect().bottom);
  if (offset > 0) {
    document.documentElement.style.setProperty("--layout-header-height", `${offset}px`);
    content.style.paddingTop = `${offset}px`;
  }
}

function clearProcessDetailContentOffset() {
  const content = document.querySelector(".content");
  if (content) content.style.removeProperty("padding-top");
}

function setProcessDetailLayout(active) {
  const content = document.querySelector(".content");
  const sheet = document.querySelector(".process-sheet");
  if (content) {
    content.classList.toggle("content--process-detail", active);
    if (active) applyProcessDetailContentOffset();
    else clearProcessDetailContentOffset();
  }
  if (sheet) sheet.classList.toggle("process-sheet--detail", active);
}

/** Прокрутка так, чтобы верх el оказался сразу под фиксированной шапкой (как на скрине с навигацией). */
function scrollElementBelowFixedHeader(el, extraGap = 0) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - getLayoutHeaderHeight() - extraGap;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function getProcessAnchorScrollOffset() {
  const headerH = getLayoutHeaderHeight();
  const processHeader = document.querySelector("#processDetails .process-header");
  if (processHeader && isMobileLayout()) {
    return headerH + processHeader.offsetHeight + 6;
  }
  return headerH + 8;
}

function scrollToProcessSection(sectionId) {
  if (!sectionId) return;
  const target = document.getElementById(sectionId);
  if (!target) return;
  try {
    window.history.replaceState({ screen: "processDetail" }, "", "#" + sectionId);
  } catch (_) {
    window.location.hash = sectionId;
  }
  const top = target.getBoundingClientRect().top + window.scrollY - getProcessAnchorScrollOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function truncateToolsNavLabel(text, maxLen = 28) {
  const t = (text || "").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1) + "…";
}

function slugifyToolsSectionId(title, index) {
  const base = (title || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return base ? `tool-${base}-${index}` : `tool-${index}`;
}

function getToolsAnchorScrollOffset() {
  const headerH = getLayoutHeaderHeight();
  const navHead = document.getElementById("toolsNavHead");
  if (navHead && !navHead.hidden) {
    return headerH + navHead.offsetHeight + 6;
  }
  return headerH + 8;
}

function scrollToToolsSection(sectionId) {
  if (!sectionId) return;
  const sectionEl = document.getElementById(sectionId);
  if (!sectionEl) return;
  let target = sectionEl;
  if (sectionId === "tools-section-recommendations") {
    const title = sectionEl.querySelector(".tools-recommendations__title");
    if (title) target = title;
  }
  try {
    window.history.replaceState({ screen: "tools" }, "", "#" + sectionId);
  } catch (_) {
    window.location.hash = sectionId;
  }
  const top = target.getBoundingClientRect().top + window.scrollY - getToolsAnchorScrollOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function scrollProcessToNav() {
  const header = document.querySelector("#processDetails .process-header");
  if (header) scrollElementBelowFixedHeader(header);
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

function attachCardScrollTopButtons(root, blockSelector, onScroll) {
  if (!root) return;
  const scrollToTop = onScroll || scrollProcessToNav;
  const ariaLabel = onScroll ? "К навигации инструментов" : "В начало страницы";
  const title = onScroll ? "К навигации" : "В начало";
  root.querySelectorAll(blockSelector).forEach((block) => {
    const existing = block.querySelector(":scope > .card__scroll-top");
    if (existing) existing.remove();
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card__scroll-top card__scroll-top--outline tools-block__scroll-top";
    btn.setAttribute("aria-label", ariaLabel);
    btn.title = title;
    btn.innerHTML = "<span aria-hidden=\"true\">↑</span>";
    btn.addEventListener("click", scrollToTop);
    block.appendChild(btn);
  });
}

function scrollToolsToNav() {
  const navHead = document.getElementById("toolsNavHead");
  if (navHead && !navHead.hidden) {
    scrollElementBelowFixedHeader(navHead);
    return;
  }
  const sheet = document.querySelector("#toolsView .tools-sheet");
  if (sheet) scrollElementBelowFixedHeader(sheet);
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildToolsSectionNav(sections) {
  const navHead = document.getElementById("toolsNavHead");
  const nav = document.getElementById("toolsNav");
  const select = document.getElementById("toolsSectionSelect");
  if (!nav || !select) return;
  nav.innerHTML = "";
  select.innerHTML = "";
  (sections || []).forEach(({ id, label }) => {
    const link = document.createElement("a");
    link.href = "#" + id;
    link.className = "sheet-nav__link";
    link.textContent = label;
    nav.appendChild(link);
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = label;
    select.appendChild(opt);
  });
  if (navHead) navHead.hidden = !sections || sections.length === 0;
  select.hidden = !sections || sections.length === 0;
}

function stripIncomingCallsBlock(text) {
  if (!text || typeof text !== "string") return text;
  const idx = text.indexOf("1. Входящие звонки (ОПЕРАТОР):");
  return idx >= 0 ? text.slice(0, idx).trim() : text;
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${path}: ${response.status}. Запустите сайт через HTTP (см. инструкцию).`);
  }
  return response.json();
}

async function loadData() {
  const [meta, processes, tools] = await Promise.all([
    loadJson(`${DATA_BASE_PATH}/processes_meta.json?v=4`),
    loadJson(`${DATA_BASE_PATH}/processes.json?v=4`),
    loadJson(`${DATA_BASE_PATH}/communication_tools.json?v=2`),
  ]);
  return { meta, processes, tools };
}

function initNavigation(views, onProcessViewSwitch) {
  const buttons = document.querySelectorAll(".nav__item");
  const content = document.querySelector(".content");
  const navSelect = document.getElementById("navViewSelect");
  const viewMap = views || {
    processes: document.getElementById("processView"),
    assistant: document.getElementById("assistantView"),
    tools: document.getElementById("toolsView"),
    call: document.getElementById("callView"),
  };

  function switchView(view) {
    buttons.forEach((b) => b.classList.toggle("nav__item--active", b.dataset.view === view));
    if (navSelect) navSelect.value = view;
    Object.entries(viewMap).forEach(([key, el]) => {
      if (el) el.classList.toggle("view--active", key === view);
    });
    if (content) content.classList.toggle("content--call", view === "call");
    if (view === "processes" && onProcessViewSwitch) onProcessViewSwitch();
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
  if (navSelect) {
    navSelect.addEventListener("change", () => switchView(navSelect.value));
  }

  return switchView;
}

function getProcessDataByMeta(processMeta, processesData) {
  if (!processesData) return null;
  const sheetName =
    processMeta.sheet_name && processesData[processMeta.sheet_name]
      ? processMeta.sheet_name
      : Object.keys(processesData).find(
          (key) => key.toLowerCase().indexOf((processMeta.name || "").toLowerCase()) >= 0
        );
  return sheetName ? processesData[sheetName] : null;
}

function getBusinessGoalDescription(processMeta, processesData) {
  const processData = getProcessDataByMeta(processMeta, processesData);
  if (!processData) return (processMeta.short_description || "").trim();
  const pd = processData.process_description;
  const businessGoal = stripIncomingCallsBlock((pd && pd.business_goal) || processData.goal || "");
  if (businessGoal) return businessGoal.replace(/\s*\n\s*/g, " ").trim();
  return (processMeta.short_description || "").trim();
}

function renderProcessListMain(processesMeta, onSelect, processesData) {
  const container = document.getElementById("processListMain");
  if (!container) return;
  container.innerHTML = "";

  if (isMobileLayout()) {
    (processesMeta || []).forEach((process) => {
      const desc = getBusinessGoalDescription(process, processesData);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "process-list-main__card";
      const title = document.createElement("span");
      title.className = "process-list-main__card-title";
      title.textContent = process.name || "";
      card.appendChild(title);
      if (process.menu_done === true) {
        const doneSpan = document.createElement("span");
        doneSpan.className = "process-list-main__done";
        doneSpan.textContent = " ✓";
        title.appendChild(doneSpan);
      }
      if (desc) {
        const descEl = document.createElement("span");
        descEl.className = "process-list-main__card-desc";
        descEl.textContent = desc;
        card.appendChild(descEl);
      }
      card.addEventListener("click", () => onSelect(process));
      container.appendChild(card);
    });
    return;
  }

  const table = document.createElement("table");
  table.className = "process-list-main__table";
  table.innerHTML = `
    <thead>
      <tr>
        <th class="process-list-main__th-name">Процесс</th>
        <th class="process-list-main__th-desc">Бизнес-цель</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  (processesMeta || []).forEach((process) => {
    const desc = getBusinessGoalDescription(process, processesData);
    const tr = document.createElement("tr");
    tr.className = "process-list-main__row";
    const nameCell = document.createElement("td");
    const link = document.createElement("button");
    link.type = "button";
    link.className = "process-list-main__link";
    const titleSpan = document.createElement("span");
    titleSpan.textContent = process.name || "";
    link.appendChild(titleSpan);
    if (process.menu_done === true) {
      const doneSpan = document.createElement("span");
      doneSpan.className = "process-list-main__done";
      doneSpan.textContent = "✓";
      link.appendChild(doneSpan);
    }
    link.addEventListener("click", () => onSelect(process));
    nameCell.appendChild(link);
    const descCell = document.createElement("td");
    descCell.className = "process-list-main__desc";
    const parts = desc.split(/\s*;\s*-\s*|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      parts.forEach((part, i) => {
        if (i > 0) descCell.appendChild(document.createElement("br"));
        descCell.appendChild(document.createTextNode(part.startsWith("-") ? part : " - " + part));
      });
    } else {
      descCell.textContent = desc;
    }
    tr.appendChild(nameCell);
    tr.appendChild(descCell);
    tbody.appendChild(tr);
  });
  container.appendChild(table);
}

function scoreProcessForQuery(processMeta, query) {
  const text = (
    (processMeta.name || "") + " " +
    (processMeta.short_description || "") + " " +
    (processMeta.searchable_text || "")
  ).toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) return 0;
  let score = 0;
  words.forEach((word) => {
    if (text.indexOf(word) !== -1) score += 1;
  });
  return score / words.length;
}

function runAssistantQuery(processesMeta, query) {
  const q = (query || "").trim();
  if (!q) return [];
  return processesMeta
    .map((p) => ({ process: p, score: scoreProcessForQuery(p, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map((x) => x.process);
}

function renderAssistantFallbackCards(results, onSelectProcess) {
  const container = document.getElementById("assistantResults");
  if (!container) return;
  results.forEach((processMeta) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "assistant-card";
    card.innerHTML = `
      <span class="assistant-card__title">${escapeHtml(processMeta.name || "")}</span>
      ${processMeta.short_description ? `<span class="assistant-card__desc">${escapeHtml(processMeta.short_description)}</span>` : ""}
    `;
    card.addEventListener("click", () => onSelectProcess(processMeta));
    container.appendChild(card);
  });
}

function coachConfidenceLabel(confidence) {
  if (confidence === "high") return "Высокая";
  if (confidence === "low") return "Низкая";
  return "Средняя";
}

function coachConfidenceClass(confidence) {
  if (confidence === "high") return "coach-badge--high";
  if (confidence === "low") return "coach-badge--low";
  return "coach-badge--medium";
}

function appendCoachListSection(parent, title, items, listClass) {
  if (!items || items.length === 0) return;
  const section = document.createElement("div");
  section.className = "coach-section";
  const h = document.createElement("h3");
  h.className = "coach-section__title";
  h.textContent = title;
  section.appendChild(h);
  const list = document.createElement(listClass === "ol" ? "ol" : "ul");
  list.className = "coach-section__list";
  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
  section.appendChild(list);
  parent.appendChild(section);
}

function appendCoachSaySection(parent, phrases) {
  if (!phrases || phrases.length === 0) return;
  const section = document.createElement("div");
  section.className = "coach-section coach-section--say";
  const h = document.createElement("h3");
  h.className = "coach-section__title";
  h.textContent = "Сказать клиенту";
  section.appendChild(h);
  phrases.forEach((text) => {
    const q = document.createElement("p");
    q.className = "coach-quote";
    q.textContent = text;
    section.appendChild(q);
  });
  parent.appendChild(section);
}

function renderCoachResponse(data, metaList, handlers) {
  const container = document.getElementById("assistantResults");
  if (!container) return;
  container.innerHTML = "";

  const card = document.createElement("div");
  card.className = "coach-card";

  const head = document.createElement("div");
  head.className = "coach-card__head";
  const title = document.createElement("h3");
  title.className = "coach-card__process";
  title.textContent = data.processName || data.processCode || "";
  const badge = document.createElement("span");
  badge.className = `coach-badge ${coachConfidenceClass(data.confidence)}`;
  badge.textContent = coachConfidenceLabel(data.confidence);
  head.appendChild(title);
  head.appendChild(badge);
  card.appendChild(head);

  if (data.menuDone === false) {
    const banner = document.createElement("p");
    banner.className = "coach-banner--partial";
    banner.textContent =
      "Полный скрипт в базе дополняется — в телефонном разговоре ориентируйтесь на блок «Сейчас в разговоре» ниже.";
    card.appendChild(banner);
  }

  if (data.summary) {
    const summary = document.createElement("p");
    summary.className = "coach-card__summary";
    summary.textContent = data.summary;
    card.appendChild(summary);
  }

  appendCoachListSection(card, "Сейчас в разговоре", data.doNow, "ol");
  appendCoachSaySection(card, data.sayNow);
  appendCoachListSection(card, "Спросить у клиента (можно не всё сразу)", data.askClient, "ul");

  if (data.clarifyQuestion) {
    const cq = document.createElement("p");
    cq.className = "coach-clarify";
    cq.textContent = `Уточните у себя: ${data.clarifyQuestion}`;
    card.appendChild(cq);
  }

  const readNext = Array.isArray(data.readNext) ? data.readNext : [];
  if (readNext.length > 0 && handlers.onNavigate) {
    const navSection = document.createElement("div");
    navSection.className = "coach-section coach-section--nav";
    const navTitle = document.createElement("h3");
    navTitle.className = "coach-section__title";
    navTitle.textContent = "Куда смотреть в приложении";
    navSection.appendChild(navTitle);
    const chips = document.createElement("div");
    chips.className = "coach-chips";
    readNext.forEach((item) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "coach-chip";
      chip.textContent = item.label || item.sectionId || "Раздел";
      chip.addEventListener("click", () => handlers.onNavigate(item, data));
      chips.appendChild(chip);
    });
    navSection.appendChild(chips);
    card.appendChild(navSection);
  }

  if (data.relatedTopics && data.relatedTopics.length > 0) {
    const details = document.createElement("details");
    details.className = "coach-related";
    const summaryEl = document.createElement("summary");
    summaryEl.textContent = `Ещё темы: ${data.relatedTopics.join(", ")}`;
    details.appendChild(summaryEl);
    card.appendChild(details);
  }

  if (data.warnings && data.warnings.length > 0) {
    const warn = document.createElement("div");
    warn.className = "coach-warnings";
    data.warnings.forEach((w) => {
      const p = document.createElement("p");
      p.textContent = w;
      warn.appendChild(p);
    });
    card.appendChild(warn);
  }

  if (data.adviceMarkdown) {
    const md = document.createElement("div");
    md.className = "coach-markdown";
    md.style.whiteSpace = "pre-wrap";
    md.textContent = data.adviceMarkdown;
    card.appendChild(md);
  }

  const processMeta =
    handlers.findProcessMeta(data.processCode) ||
    metaList.find((p) => p.code === data.processCode);
  const primaryNav = readNext[0] || { view: "processes", sectionId: "section-script", label: "Скрипт" };

  if (processMeta && handlers.onOpenProcess) {
    const cta = document.createElement("button");
    cta.type = "button";
    cta.className = "coach-card__cta";
    cta.textContent = `Открыть процесс — раздел «${primaryNav.label || "Скрипт"}»`;
    cta.addEventListener("click", () => handlers.onOpenProcess(processMeta, primaryNav));
    card.appendChild(cta);
  }

  container.appendChild(card);
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function normalizeSearchText(text) {
  return (text || "").toString().toLowerCase();
}

/** Тот же алгоритм, что и поиск по меню: подстрока в названии, описании, searchable_text и опционально extra. */
function processMatchesSearchQuery(processMeta, query, extraSearchText = "") {
  const q = normalizeSearchText(query).trim();
  if (!q) return true;
  return (
    normalizeSearchText(processMeta.name).includes(q) ||
    normalizeSearchText(processMeta.short_description).includes(q) ||
    normalizeSearchText(processMeta.searchable_text).includes(q) ||
    normalizeSearchText(extraSearchText).includes(q)
  );
}

function filterProcessesBySearchQuery(metaList, query, getExtraText) {
  return (metaList || []).filter((p) =>
    processMatchesSearchQuery(p, query, getExtraText ? getExtraText(p) : "")
  );
}

function renderProcessList(processesMeta, onSelect) {
  const listEl = document.getElementById("processList");
  const searchInput = document.getElementById("searchInput");

  let currentActiveCode = null;

  const SECTION_DEFS = [
    { id: "incoming_operator", title: "1. Входящие звонки (ОПЕРАТОР):" },
    { id: "incoming_manager", title: "2. Входящие звонки (КЛИЕНТСКИЙ МЕНЕДЖЕР):" },
    { id: "outgoing_manager", title: "3. Исходящие звонки (КЛИЕНТСКИЙ МЕНЕДЖЕР):" },
    { id: "accounting", title: "4. Бухгалтерия:" },
  ];

  function isLegacyHeadingItem(p) {
    const name = (p && (p.name || p.code) ? String(p.name || p.code) : "").trim();
    const sheet = (p && p.sheet_name ? String(p.sheet_name) : "").trim();
    return !sheet && /:\s*$/.test(name);
  }

  function inferMenuGroup(p) {
    const group = (p && p.menu_group ? String(p.menu_group) : "").trim();
    if (group) return group;
    const name = normalizeSearchText((p && (p.name || p.code)) || "");
    if (name.includes("бухгалтер")) return "accounting";
    if (name.includes("исходящ") && name.includes("менедж")) return "outgoing_manager";
    if (name.includes("входящ") && name.includes("оператор")) return "incoming_operator";
    if (name.includes("входящ") && name.includes("менедж")) return "incoming_manager";
    return "other";
  }

  function getSectionOpen(sectionId) {
    try {
      const raw = localStorage.getItem(`menuSection:${sectionId}`);
      if (raw === null) return true; // default: раскрыто
      return raw === "1";
    } catch {
      return true;
    }
  }

  function setSectionOpen(sectionId, isOpen) {
    try {
      localStorage.setItem(`menuSection:${sectionId}`, isOpen ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function createProcessItem(process) {
    const li = document.createElement("li");
    li.className = "process-list__item";
    li.dataset.code = process.code;

    if (process.code === currentActiveCode) {
      li.classList.add("process-list__item--active");
    }

    const title = document.createElement("span");
    title.className = "process-list__title";
    title.textContent = process.name;
    li.appendChild(title);

    if (process.menu_done === true) {
      const doneMark = document.createElement("span");
      doneMark.className = "process-list__done";
      doneMark.setAttribute("aria-label", "Обработано");
      doneMark.textContent = "✓";
      li.appendChild(doneMark);
    }

    li.addEventListener("click", () => {
      currentActiveCode = process.code;
      document
        .querySelectorAll(".process-list__item")
        .forEach((item) =>
          item.classList.toggle(
            "process-list__item--active",
            item.dataset.code === currentActiveCode
          )
        );
      onSelect(process);
    });

    return li;
  }

  function render(filter = "") {
    const query = normalizeSearchText(filter).trim();
    listEl.innerHTML = "";
    const filtered = (processesMeta || [])
      .filter((p) => !isLegacyHeadingItem(p))
      .filter((p) => processMatchesSearchQuery(p, query));

    const groups = new Map();
    filtered.forEach((p) => {
      const g = inferMenuGroup(p);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(p);
    });
    for (const [_, items] of groups.entries()) {
      items.sort((a, b) => (a.name || "").trim().localeCompare((b.name || "").trim(), "ru"));
    }

    function renderSection(sectionId, title) {
      const items = groups.get(sectionId) || [];
      if (query && items.length === 0) return;

      const sectionLi = document.createElement("li");
      sectionLi.className = "process-menu-section";
      sectionLi.dataset.sectionId = sectionId;

      const headerBtn = document.createElement("button");
      headerBtn.type = "button";
      headerBtn.className = "process-menu-section__header";
      headerBtn.setAttribute("aria-expanded", "true");

      const titleSpan = document.createElement("span");
      titleSpan.className = "process-menu-section__title";
      titleSpan.textContent = title;
      headerBtn.appendChild(titleSpan);

      const chevron = document.createElement("span");
      chevron.className = "process-menu-section__chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "▾";
      headerBtn.appendChild(chevron);

      const innerList = document.createElement("ul");
      innerList.className = "process-menu-section__list";

      items.forEach((process) => innerList.appendChild(createProcessItem(process)));

      const storedOpen = getSectionOpen(sectionId);
      const isOpen = query ? true : storedOpen;

      function applyOpenState(open) {
        headerBtn.setAttribute("aria-expanded", open ? "true" : "false");
        sectionLi.classList.toggle("process-menu-section--collapsed", !open);
        innerList.classList.toggle("hidden", !open);
        chevron.textContent = open ? "▾" : "▸";
      }

      applyOpenState(isOpen);

      if (items.length === 0) {
        sectionLi.classList.add("process-menu-section--empty");
        headerBtn.disabled = true;
        headerBtn.setAttribute("aria-disabled", "true");
        applyOpenState(false);
      } else {
        headerBtn.addEventListener("click", () => {
          const nowOpen = headerBtn.getAttribute("aria-expanded") !== "true";
          applyOpenState(nowOpen);
          if (!query) setSectionOpen(sectionId, nowOpen);
        });
      }

      sectionLi.appendChild(headerBtn);
      sectionLi.appendChild(innerList);
      listEl.appendChild(sectionLi);
    }

    SECTION_DEFS.forEach((s) => renderSection(s.id, s.title));
    // Прочее: показываем только если что-то осталось без основных групп
    const otherItems = groups.get("other") || [];
    if (otherItems.length > 0) {
      renderSection("other", "Прочее");
    }
  }

  const searchClear = document.getElementById("searchClear");
  function updateClearVisibility() {
    if (searchClear) searchClear.style.display = searchInput.value.trim() ? "" : "none";
  }
  searchInput.addEventListener("input", () => {
    updateClearVisibility();
    render(searchInput.value);
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      render(searchInput.value);
    }
  });
  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchInput.focus();
      updateClearVisibility();
      render("");
    });
  }
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.addEventListener("click", () => render(searchInput.value));
  updateClearVisibility();
  render();
}

function renderProcessDetails(processMeta, processesData) {
  const placeholder = document.getElementById("processPlaceholder");
  const details = document.getElementById("processDetails");
  const titleEl = document.getElementById("processTitle");
  const shortDescEl = document.getElementById("processShortDescription");
  const stagesTableBody = document.querySelector("#stagesTable tbody");
  const scriptContainer = document.getElementById("scriptContainer");
  const difficultPhrasesEl = document.getElementById("difficultPhrases");
  const difficultSection = document.getElementById("section-difficult");
  const descriptionSection = document.getElementById("section-description");
  const descriptionBlock = document.getElementById("processDescriptionBlock");
  const principlesSection = document.getElementById("section-principles");
  const principlesBlock = document.getElementById("principlesBlock");
  const cheatsheetSection = document.getElementById("section-cheatsheet");
  const cheatsheetList = document.getElementById("cheatsheetList");
  const emailSection = document.getElementById("section-email");
  const emailTemplateEl = document.getElementById("emailTemplate");
  const autoReplySection = document.getElementById("section-autoreply");
  const autoReplySubjectEl = document.getElementById("autoReplySubject");
  const autoReplyEl = document.getElementById("autoReplyTemplate");
  const recommendationsSection = document.getElementById("section-recommendations");
  const recommendationsTitle = document.getElementById("recommendationsTitle");
  const recommendationsBlock = document.getElementById("recommendationsBlock");
  const recommendationsNavLink = document.querySelector('.process-nav__link[href="#section-recommendations"]');

  if (placeholder) placeholder.classList.add("hidden");
  if (details) details.classList.remove("hidden");

  const sheetName =
    processMeta.sheet_name && processesData[processMeta.sheet_name]
      ? processMeta.sheet_name
      : Object.keys(processesData).find(
          (key) => key.toLowerCase().indexOf(processMeta.name.toLowerCase()) >= 0
        );

  const processData = sheetName ? processesData[sheetName] : null;

  titleEl.textContent = processMeta.name;
  const titleDoneEl = document.getElementById("processTitleDone");
  if (titleDoneEl) {
    if (processMeta.menu_done === true) {
      titleDoneEl.textContent = "✓";
      titleDoneEl.classList.remove("hidden");
    } else {
      titleDoneEl.textContent = "";
      titleDoneEl.classList.add("hidden");
    }
  }
  const shortDesc = (processMeta.short_description || "").trim();
  shortDescEl.textContent = shortDesc;
  shortDescEl.classList.toggle("hidden", !shortDesc);

  function renderDescriptionText(container, text) {
    if (!text || !container) return;
    const raw = text.trim();
    const segments = raw.split(/\n|\s+-\s+/).map((s) => s.replace(/^\s*[;•—]\s*|\s*;\s*$/g, "").trim()).filter(Boolean);
    if (segments.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "process-description__list";
      segments.forEach((segment) => {
        const li = document.createElement("li");
        li.className = "process-description__list-item";
        const text = segment.replace(/^\s*[-—•]\s*/, "").trim();
        li.textContent = text;
        ul.appendChild(li);
      });
      container.appendChild(ul);
    } else {
      const p = document.createElement("p");
      p.className = "process-description__text";
      p.style.whiteSpace = "pre-wrap";
      p.textContent = text;
      container.appendChild(p);
    }
  }

  const descNavLink = document.querySelector('.process-nav__link[href="#section-description"]');
  const principlesNavLink = document.querySelector('.process-nav__link[href="#section-principles"]');
  const stagesNavLink = document.querySelector('.process-nav__link[href="#section-stages"]');
  const scriptNavLink = document.querySelector('.process-nav__link[href="#section-script"]');
  const emailNavLink = document.querySelector('.process-nav__link[href="#section-email"]');
  const autoReplyNavLink = document.querySelector('.process-nav__link[href="#section-autoreply"]');

  if (descriptionBlock && descriptionSection) {
    const pd = processData && processData.process_description;
    const businessGoal = stripIncomingCallsBlock((pd && pd.business_goal) || (processData && processData.goal) || "");
    const processAllows = stripIncomingCallsBlock((pd && pd.process_allows) || (processData && processData.description) || "");
    if (businessGoal || processAllows) {
      descriptionSection.classList.remove("hidden");
      descriptionBlock.innerHTML = "";
      if (businessGoal) {
        const h4 = document.createElement("h4");
        h4.className = "process-description__heading";
        h4.textContent = "Бизнес-цель процесс:";
        descriptionBlock.appendChild(h4);
        renderDescriptionText(descriptionBlock, businessGoal);
      }
      if (processAllows && processAllows.trim() !== (businessGoal || "").trim()) {
        const h4 = document.createElement("h4");
        h4.className = "process-description__heading";
        h4.textContent = "Процесс позволяет:";
        descriptionBlock.appendChild(h4);
        renderDescriptionText(descriptionBlock, processAllows);
      }
    } else {
      descriptionSection.classList.add("hidden");
    }
    if (descNavLink) descNavLink.classList.toggle("hidden", descriptionSection.classList.contains("hidden"));
  }

  if (principlesSection && principlesBlock) {
    const raw = processData && processData.important_principles;
    const principlesText = Array.isArray(raw) ? raw.filter(Boolean).join("\n") : (raw || "");
    if (String(principlesText || "").trim()) {
      principlesSection.classList.remove("hidden");
      principlesBlock.innerHTML = "";
      renderDescriptionText(principlesBlock, principlesText);
      if (principlesNavLink) principlesNavLink.classList.remove("hidden");
    } else {
      principlesSection.classList.add("hidden");
      if (principlesNavLink) principlesNavLink.classList.add("hidden");
    }
  } else {
    if (principlesNavLink) principlesNavLink.classList.add("hidden");
  }

  stagesTableBody.innerHTML = "";
  const hasStages = processData && Array.isArray(processData.stages) && processData.stages.length > 0;
  if (hasStages) {
    processData.stages.forEach((stage) => {
      const tr = document.createElement("tr");
      appendLabelledCells(tr, STAGE_TABLE_LABELS, [
        stage.stage,
        stage.description,
        stage.operator_actions,
        stage.sla,
        stage.stage_goal,
        stage.recommendations,
      ]);
      stagesTableBody.appendChild(tr);
    });
  }
  const sectionStages = document.getElementById("section-stages");
  if (stagesNavLink && sectionStages) {
    sectionStages.classList.toggle("hidden", !hasStages);
    stagesNavLink.classList.toggle("hidden", !hasStages);
  }

  scriptContainer.innerHTML = "";
  if (processData && Array.isArray(processData.script_steps) && processData.script_steps.length > 0) {
    const conversation = processData.script_steps.filter(
      (s) => s.type === "conversation"
    );
    const complaints = processData.script_steps.filter(
      (s) => s.type === "complaint"
    );

    if (conversation.length > 0) {
      const wrapper = document.createElement("div");
      wrapper.className = "table-wrapper";
      const table = createStackTable();
      table.innerHTML = `
        <thead>
          <tr>
            <th>Этап разговора</th>
            <th>Формулировка (пример)</th>
            <th>Цель</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector("tbody");
      conversation.forEach((step) => {
        const tr = document.createElement("tr");
        appendLabelledCells(tr, SCRIPT_CONVERSATION_LABELS, [step.step_name, step.phrase, step.goal]);
        tbody.appendChild(tr);
      });
      wrapper.appendChild(table);
      scriptContainer.appendChild(wrapper);
    }

    if (complaints.length > 0) {
      const title = document.createElement("h4");
      title.textContent = "Ответы на жалобы клиента";
      scriptContainer.appendChild(title);

      const wrapper = document.createElement("div");
      wrapper.className = "table-wrapper";
      const table = createStackTable();
      table.innerHTML = `
        <thead>
          <tr>
            <th>Жалоба клиента</th>
            <th>Ответ оператора</th>
            <th>Цель</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector("tbody");
      complaints.forEach((row) => {
        const tr = document.createElement("tr");
        appendLabelledCells(tr, SCRIPT_COMPLAINT_LABELS, [row.complaint, row.reply, row.goal]);
        tbody.appendChild(tr);
      });
      wrapper.appendChild(table);
      scriptContainer.appendChild(wrapper);
    }
  } else {
    const fallback = document.createElement("pre");
    fallback.className = "text-block text-block--pre";
    fallback.textContent =
      (processData && processData.main_script) ||
      "Скрипт ещё не перенесён из Excel.";
    scriptContainer.appendChild(fallback);
  }

  if (processData && processData.status_script && Array.isArray(processData.status_script.rows) && processData.status_script.rows.length > 0) {
    const block = document.createElement("div");
    block.className = "status-script-block";

    const cols = Array.isArray(processData.status_script.columns) ? processData.status_script.columns : [];
    const title = document.createElement("h4");
    title.className = "status-script-block__title";
    title.textContent = processData.status_script.title || "Скрипт — статус заявки";
    block.appendChild(title);

    const cardsWrap = document.createElement("div");
    cardsWrap.className = "status-script-block__cards";
    const rows = processData.status_script.rows;
    for (let colIndex = 0; colIndex < 3; colIndex++) {
      const phrases = rows.map((row) => (Array.isArray(row) ? row[colIndex] : "")).filter((s) => String(s || "").trim());
      const card = document.createElement("div");
      card.className = "status-script-block__card";
      const cardTitle = document.createElement("div");
      cardTitle.className = "status-script-block__card-title";
      cardTitle.textContent = cols[colIndex] || `Сценарий ${colIndex + 1}`;
      card.appendChild(cardTitle);
      const list = document.createElement("ul");
      list.className = "status-script-block__card-list";
      phrases.forEach((text) => {
        const li = document.createElement("li");
        li.className = "status-script-block__card-item";
        li.style.whiteSpace = "pre-wrap";
        li.textContent = text.trim();
        list.appendChild(li);
      });
      card.appendChild(list);
      cardsWrap.appendChild(card);
    }
    block.appendChild(cardsWrap);
    scriptContainer.appendChild(block);
  }
  const hasScript = processData && (
    (Array.isArray(processData.script_steps) && processData.script_steps.length > 0) ||
    (processData.main_script && String(processData.main_script).trim()) ||
    (processData.status_script && Array.isArray(processData.status_script.rows) && processData.status_script.rows.length > 0)
  );
  const sectionScript = document.getElementById("section-script");
  if (scriptNavLink && sectionScript) {
    sectionScript.classList.toggle("hidden", !hasScript);
    scriptNavLink.classList.toggle("hidden", !hasScript);
  }

  difficultPhrasesEl.innerHTML = "";
  const hasDifficultPhrases = processData && Array.isArray(processData.difficult_phrases) && processData.difficult_phrases.length > 0;
  const hideDifficultBlock = !hasDifficultPhrases;
  if (difficultSection) difficultSection.classList.toggle("hidden", hideDifficultBlock || !hasDifficultPhrases);
  const difficultNavLink = document.querySelector('.process-nav__link[href="#section-difficult"]');
  if (difficultNavLink) difficultNavLink.classList.toggle("hidden", hideDifficultBlock || !hasDifficultPhrases);
  if (hasDifficultPhrases && !hideDifficultBlock) {
    const table = document.createElement("div");
    table.className = "table-wrapper";
    table.innerHTML = `
      <table class="table table--stack">
        <thead>
          <tr>
            <th>Тип клиента и сложной ситуации</th>
            <th>Цель оператора</th>
            <th>Готовые формулировки</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    const tbody = table.querySelector("tbody");
    processData.difficult_phrases.forEach((item) => {
      const tr = document.createElement("tr");
      const phrasesText = Array.isArray(item.phrases) ? item.phrases.join("\n\n") : (item.phrase_text || item.text || "");
      appendLabelledCells(
        tr,
        DIFFICULT_PHRASES_LABELS,
        [item.situation_type || "", item.operator_goal || "", phrasesText],
        { preWrap: true }
      );
      tbody.appendChild(tr);
    });
    difficultPhrasesEl.appendChild(table);
  } else {
    difficultPhrasesEl.textContent = "Нет данных для этого процесса.";
  }

  const hideCheatsheetBlock = processMeta.name === "Ответ оператора";
  const hasCheatsheet = processData && Array.isArray(processData.cheatsheet) && processData.cheatsheet.length > 0;
  const cheatsheetNavLink = document.querySelector('.process-nav__link[href="#section-cheatsheet"]');
  if (hideCheatsheetBlock || !hasCheatsheet) {
    if (cheatsheetSection) cheatsheetSection.classList.add("hidden");
    if (cheatsheetNavLink) cheatsheetNavLink.classList.add("hidden");
  } else {
    cheatsheetSection.classList.remove("hidden");
    cheatsheetList.innerHTML = "";
    processData.cheatsheet.forEach((phrase) => {
      const li = document.createElement("li");
      li.className = "cheatsheet-item";
      li.textContent = phrase;
      cheatsheetList.appendChild(li);
    });
    if (cheatsheetNavLink) cheatsheetNavLink.classList.remove("hidden");
  }

  if (processData && processData.email_template) {
    emailSection.classList.remove("hidden");
    const tpl = processData.email_template;
    const emailText = typeof tpl === "string" ? tpl : (tpl.body || "");
    emailTemplateEl.textContent = emailText;
    const copyEmailBtn = document.getElementById("copyEmailBtn");
    if (copyEmailBtn) {
      copyEmailBtn.onclick = () => copyToClipboard(emailText, copyEmailBtn);
    }
    if (emailNavLink) emailNavLink.classList.remove("hidden");
  } else {
    emailSection.classList.add("hidden");
    if (emailNavLink) emailNavLink.classList.add("hidden");
  }

  if (processData && processData.auto_reply_template) {
    autoReplySection.classList.remove("hidden");
    const tpl = processData.auto_reply_template;
    const subj = typeof tpl === "object" && tpl.subject ? tpl.subject : "";
    const body = typeof tpl === "object" ? tpl.body : String(tpl);
    autoReplySubjectEl.textContent = subj ? "Тема: " + subj : "";
    autoReplySubjectEl.classList.toggle("hidden", !subj);
    autoReplyEl.textContent = body || "";
    const copyAutoReplyBtn = document.getElementById("copyAutoReplyBtn");
    if (copyAutoReplyBtn) {
      const fullText = subj ? "Тема: " + subj + "\n\n" + body : body;
      copyAutoReplyBtn.onclick = () => copyToClipboard(fullText, copyAutoReplyBtn);
    }
    if (autoReplyNavLink) autoReplyNavLink.classList.remove("hidden");
  } else {
    autoReplySection.classList.add("hidden");
    if (autoReplyNavLink) autoReplyNavLink.classList.add("hidden");
  }

  if (processData && processData.operator_recommendations && Array.isArray(processData.operator_recommendations.steps) && processData.operator_recommendations.steps.length > 0) {
    recommendationsSection.classList.remove("hidden");
    if (recommendationsTitle) recommendationsTitle.textContent = processData.operator_recommendations.title || "Общие рекомендации";
    recommendationsBlock.innerHTML = "";
    const table = createStackTable();
    table.innerHTML = `
      <thead>
        <tr>
          <th>Шаг</th>
          <th>Как действовать</th>
          <th>Формулировки / приемы</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    processData.operator_recommendations.steps.forEach((row) => {
      const tr = document.createElement("tr");
      appendLabelledCells(
        tr,
        RECOMMENDATIONS_LABELS,
        [row.step || "", row.action || "", row.phrases || ""],
        { preWrap: true }
      );
      tbody.appendChild(tr);
    });
    recommendationsBlock.appendChild(table);
    if (recommendationsNavLink) recommendationsNavLink.classList.remove("hidden");
  } else {
    recommendationsSection.classList.add("hidden");
    if (recommendationsNavLink) recommendationsNavLink.classList.add("hidden");
  }

  const detailsContainer = document.getElementById("processDetails");
  attachCardScrollTopButtons(detailsContainer, ".card");

  const hash = (window.location.hash || "").replace(/^#/, "");
  if (hash && hash.startsWith("section-")) {
    setTimeout(() => scrollToProcessSection(hash), 0);
  }

  requestAnimationFrame(applyProcessDetailContentOffset);
}

function copyToClipboard(text, buttonEl) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const label = buttonEl.textContent;
    buttonEl.textContent = "Скопировано";
    buttonEl.disabled = true;
    setTimeout(() => {
      buttonEl.textContent = label;
      buttonEl.disabled = false;
    }, 1500);
  }).catch(() => {
    buttonEl.textContent = "Ошибка";
    setTimeout(() => { buttonEl.textContent = "Скопировать"; }, 1500);
  });
}

function renderCommunicationTools(tools) {
  const firstEl = document.getElementById("tools-section-intro");
  const container = document.getElementById("toolsContainer");
  if (firstEl) firstEl.innerHTML = "";
  if (container) container.innerHTML = "";

  const hasBody = (tool) => tool.body && String(tool.body).trim();
  const skipBlockTitle = (tool) =>
    ["Блок", "Инструмент", "ИНСТРУМЕНТЫ КОММУНИКАЦИИ С КЛИЕНТОМ"].includes(
      (tool.title || "").trim()
    );
  const toShow = (tools || []).filter(hasBody).filter((t) => !skipBlockTitle(t));
  const first = toShow[0];
  const rest = toShow.slice(1);
  const navSections = [];

  if (first && firstEl) {
    const titleText = (first.title || "Без названия").trim();
    if (titleText.includes("\n")) {
      const titleBlock = document.createElement("div");
      titleBlock.className = "tools-sheet__first-title-block";
      const parts = titleText.split("\n\n");
      const intro = parts[0].trim();
      if (intro) {
        const p = document.createElement("p");
        p.className = "tools-sheet__first-intro";
        p.textContent = intro;
        titleBlock.appendChild(p);
      }
      const thesisLines = parts.slice(1).flatMap((s) => s.split("\n").map((l) => l.replace(/^\s*[-•]\s*/, "").trim()).filter(Boolean));
      if (thesisLines.length) {
        const ul = document.createElement("ul");
        ul.className = "tools-sheet__first-theses";
        thesisLines.forEach((line) => {
          const li = document.createElement("li");
          li.className = "tools-sheet__first-thesis";
          li.textContent = line;
          ul.appendChild(li);
        });
        titleBlock.appendChild(ul);
      }
      const introBlock = document.createElement("div");
      introBlock.className = "tools-sheet__intro-block";
      introBlock.appendChild(titleBlock);
      firstEl.appendChild(introBlock);
    } else {
      const title = document.createElement("h3");
      title.className = "tools-sheet__first-title";
      title.textContent = titleText;
      firstEl.appendChild(title);
    }
    const bodyText = (first.body || "").trim();
    const skipBody = bodyText === "Информация о Компании" || !bodyText;
    if (!skipBody) {
      if (bodyText.includes("\n") || first.body_list) {
        const ul = document.createElement("ul");
        ul.className = "tools-sheet__first-list";
        bodyText.split("\n").forEach((line) => {
          const trimmed = line.replace(/^\s*[-•]\s*/, "").trim();
          if (!trimmed) return;
          const li = document.createElement("li");
          li.className = "tools-sheet__first-list-item";
          li.textContent = trimmed;
          ul.appendChild(li);
        });
        firstEl.appendChild(ul);
      } else {
        const body = document.createElement("p");
        body.className = "tools-sheet__first-body";
        body.textContent = bodyText;
        firstEl.appendChild(body);
      }
    }
  }

  if (rest.length > 0 && container) {
    const isExtraSectionLine = (s) => /^\d+\.\s+.+:$/.test(s.trim());
    const parseBody = (bodyText) => {
      const lines = (bodyText || "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !isExtraSectionLine(l));
      let description = lines[0] || "";
      let when = "";
      const exampleParts = [];
      for (let i = 1; i < lines.length; i++) {
        if (/^[«"]/.test(lines[i])) {
          exampleParts.push(lines[i]);
        } else if (i === 1) {
          when = lines[i];
        }
      }
      return {
        description,
        when,
        example: exampleParts.join(" "),
      };
    };

    const wrapper = document.createElement("div");
    wrapper.className = "tools-table-wrap";
    const table = document.createElement("table");
    table.className = "tools-table table--stack";
    table.innerHTML = `
      <thead>
        <tr>
          <th class="tools-table__th-name">Инструмент</th>
          <th class="tools-table__th-desc">Описание</th>
          <th class="tools-table__th-when">Когда использовать</th>
          <th class="tools-table__th-example">Пример фразы/действия</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    rest.forEach((tool, index) => {
      const parsed = parseBody(tool.body);
      const tr = document.createElement("tr");
      const rowId = slugifyToolsSectionId(tool.title, index + 1);
      tr.id = rowId;
      tr.classList.add("tools-table__row-anchor");
      navSections.push({
        id: rowId,
        label: truncateToolsNavLabel(tool.title || "Без названия"),
      });
      const values = [
        tool.title || "Без названия",
        stripIncomingCallsBlock(parsed.description),
        stripIncomingCallsBlock(parsed.when),
        stripIncomingCallsBlock(parsed.example),
      ];
      values.forEach((value, i) => {
        const td = document.createElement("td");
        td.dataset.label = TOOLS_TABLE_LABELS[i];
        if (i === 0) td.className = "tools-table__name";
        else if (i === 1) td.className = "tools-table__desc";
        else if (i === 2) td.className = "tools-table__when";
        else td.className = "tools-table__example";
        td.textContent = value || "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
      const footerTr = document.createElement("tr");
      footerTr.className = "tools-table__row-footer";
      const footerTd = document.createElement("td");
      footerTd.colSpan = 4;
      footerTd.className = "tools-block__scroll-footer";
      footerTd.dataset.label = "";
      footerTr.appendChild(footerTd);
      tbody.appendChild(footerTr);
    });
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }

  navSections.push({ id: "tools-section-recommendations", label: "Доп. рекомендации" });
  buildToolsSectionNav(navSections);

  document.querySelectorAll(".tools-recommendations tbody .tools-table__row-footer").forEach((row) => row.remove());
  document.querySelectorAll(".tools-recommendations tbody > tr:not(.tools-table__row-footer)").forEach((tr) => {
    if (tr.nextElementSibling?.classList.contains("tools-table__row-footer")) return;
    const footerTr = document.createElement("tr");
    footerTr.className = "tools-table__row-footer";
    const footerTd = document.createElement("td");
    footerTd.colSpan = 4;
    footerTd.className = "tools-block__scroll-footer";
    footerTd.dataset.label = "";
    footerTr.appendChild(footerTd);
    tr.insertAdjacentElement("afterend", footerTr);
  });

  const toolsSheet = document.querySelector("#toolsView .tools-sheet");
  attachCardScrollTopButtons(
    toolsSheet,
    ".tools-block__scroll-footer, .tools-recommendations .tools-block__scroll-footer",
    scrollToolsToNav
  );
}

async function bootstrap() {
  const layout = document.getElementById("layout");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");
  const sidebar = document.getElementById("sidebar");

  syncLayoutHeaderHeightAfterLayout();
  const onLayoutChange = () => {
    syncLayoutHeaderHeightAfterLayout();
    if (document.querySelector(".content")?.classList.contains("content--process-detail")) {
      applyProcessDetailContentOffset();
    }
  };
  window.addEventListener("resize", onLayoutChange);
  window.addEventListener("orientationchange", onLayoutChange);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(onLayoutChange);
  }

  function setSidebarOpen(open) {
    if (!layout) return;
    layout.classList.toggle("sidebar--open", open);
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      sidebarToggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (sidebarBackdrop) {
      sidebarBackdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }
  }

  if (sidebarToggle && layout) {
    setSidebarOpen(false);
    sidebarToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setSidebarOpen(!layout.classList.contains("sidebar--open"));
    });
  }

  if (sidebarBackdrop && layout) {
    sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
  }

  if (sidebar) {
    sidebar.addEventListener("click", (event) => event.stopPropagation());
  }

  initSidebarResize({ sidebar, layout });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && layout && layout.classList.contains("sidebar--open")) {
      setSidebarOpen(false);
    }
  });

  const views = {
    processes: document.getElementById("processView"),
    assistant: document.getElementById("assistantView"),
    tools: document.getElementById("toolsView"),
    call: document.getElementById("callView"),
  };
  try {
    const { meta, processes, tools } = await loadData();
    const loadingEl = document.getElementById("appLoading");
    if (loadingEl) loadingEl.remove();

    const placeholder = document.getElementById("processPlaceholder");
    const details = document.getElementById("processDetails");

    let processDetailHistoryActive = false;

    const showProcessListMain = () => {
      if (placeholder) placeholder.classList.remove("hidden");
      if (details) details.classList.add("hidden");
      setProcessDetailLayout(false);
      try {
        const base = window.location.pathname + window.location.search;
        if (window.location.hash) window.history.replaceState(null, "", base);
      } catch (_) {}
    };

    const pushProcessDetailHistory = () => {
      if (processDetailHistoryActive) return;
      try {
        const base = window.location.pathname + window.location.search;
        history.pushState({ screen: "processDetail" }, "", base);
        processDetailHistoryActive = true;
      } catch (_) {}
    };

    const popProcessDetailHistory = () => {
      if (!processDetailHistoryActive) return;
      processDetailHistoryActive = false;
      try {
        history.back();
      } catch (_) {}
    };

    const switchView = initNavigation(views, showProcessListMain);

    const openProcessDetails = (processMeta, options = {}) => {
      switchView("processes");
      if (placeholder) placeholder.classList.add("hidden");
      if (details) details.classList.remove("hidden");
      setProcessDetailLayout(true);
      syncLayoutHeaderHeightAfterLayout();
      renderProcessDetails(processMeta, processes);
      const sectionId = options.initialSectionId || "";
      requestAnimationFrame(() => {
        applyProcessDetailContentOffset();
        if (sectionId) {
          scrollToProcessSection(sectionId);
        } else {
          window.scrollTo(0, 0);
        }
      });
      pushProcessDetailHistory();
    };

    const selectProcess = (processMeta, options = {}) => {
      if (isMobileLayout()) setSidebarOpen(false);
      openProcessDetails(processMeta, options);
    };

    const findProcessMetaByCode = (code) => {
      const key = (code || "").trim();
      if (!key) return null;
      return (
        metaFiltered.find((p) => p.code === key) ||
        metaFiltered.find((p) => (p.name || "").trim() === key) ||
        null
      );
    };

    const navigateFromCoach = (readItem, coachData) => {
      const meta =
        findProcessMetaByCode(coachData.processCode) || findProcessMetaByCode(coachData.processName);
      if (!meta) return;
      if (readItem.view === "tools") {
        switchView("tools");
        if (readItem.sectionId) {
          requestAnimationFrame(() => scrollToToolsSection(readItem.sectionId));
        }
        return;
      }
      selectProcess(meta, { initialSectionId: readItem.sectionId || "section-script" });
    };

    const processBackBtn = document.getElementById("processBackBtn");
    if (processBackBtn) {
      processBackBtn.addEventListener("click", () => {
        showProcessListMain();
        window.scrollTo(0, 0);
        popProcessDetailHistory();
      });
    }

    window.addEventListener("popstate", () => {
      if (!details || details.classList.contains("hidden")) return;
      showProcessListMain();
      processDetailHistoryActive = false;
      window.scrollTo(0, 0);
    });
    if (typeof initCallView === "function") initCallView();

    // Быстрый переход по навигации процесса: прокрутка к разделу (учитывается scroll-margin-top у карточек)
    const processNav = document.getElementById("processNav");
    if (processNav) {
      processNav.addEventListener("click", (e) => {
        const link = e.target.closest('a[href^="#section-"]');
        if (!link) return;
        e.preventDefault();
        const href = link.getAttribute("href") || "";
        const id = href.startsWith("#") ? href.slice(1) : "";
        scrollToProcessSection(id);
      });
    }

    const toolsNav = document.getElementById("toolsNav");
    if (toolsNav) {
      toolsNav.addEventListener("click", (e) => {
        const link = e.target.closest('a[href^="#tool-"], a[href^="#tools-section-"]');
        if (!link) return;
        e.preventDefault();
        const href = link.getAttribute("href") || "";
        const id = href.startsWith("#") ? href.slice(1) : "";
        scrollToToolsSection(id);
        const toolsSectionSelect = document.getElementById("toolsSectionSelect");
        if (toolsSectionSelect) toolsSectionSelect.value = id;
      });
    }

    const toolsSectionSelect = document.getElementById("toolsSectionSelect");
    if (toolsSectionSelect) {
      toolsSectionSelect.addEventListener("change", () => {
        scrollToToolsSection(toolsSectionSelect.value);
      });
    }

    const isOutgoingCallsClientManager = (p) =>
      /Исходящие\s+звонки\s*\([^)]*КЛИЕНТСКИЙ\s+МЕНЕДЖЕР/i.test((p.name || p.code || "").trim());
    const metaFiltered = (meta || [])
      .filter((p) => !isOutgoingCallsClientManager(p))
      .sort((a, b) => (a.name || "").trim().localeCompare((b.name || "").trim(), "ru"));

    renderProcessList(metaFiltered, selectProcess);
    renderProcessListMain(metaFiltered, selectProcess, processes);
    renderCommunicationTools(tools);

    (function initProcessListMainSearch() {
      const listSearchInput = document.getElementById("processListSearchInput");
      const listSearchClear = document.getElementById("processListSearchClear");
      const listSearchBtn = document.getElementById("processListSearchBtn");
      const placeholderText = "Поиск по процессам";

      function applyMainSearch() {
        const query = listSearchInput ? listSearchInput.value : "";
        const filtered = filterProcessesBySearchQuery(metaFiltered, query, (p) =>
          getBusinessGoalDescription(p, processes)
        );
        renderProcessListMain(filtered, selectProcess, processes);
        if (listSearchClear) listSearchClear.style.display = query.trim() ? "" : "none";
      }

      if (listSearchInput) {
        listSearchInput.addEventListener("focus", () => {
          listSearchInput.placeholder = "";
        });
        listSearchInput.addEventListener("blur", () => {
          if (!listSearchInput.value.trim()) listSearchInput.placeholder = placeholderText;
        });
        listSearchInput.addEventListener("input", applyMainSearch);
        listSearchInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            applyMainSearch();
          }
        });
      }
      if (listSearchClear) {
        listSearchClear.addEventListener("click", () => {
          if (listSearchInput) {
            listSearchInput.value = "";
            listSearchInput.focus();
            listSearchInput.placeholder = placeholderText;
          }
          applyMainSearch();
        });
      }
      if (listSearchBtn) listSearchBtn.addEventListener("click", applyMainSearch);
      if (listSearchClear) listSearchClear.style.display = "none";
    })();

    const searchInputEl = document.getElementById("searchInput");
    const searchPlaceholderText = "Поиск по меню";
    if (searchInputEl) {
      searchInputEl.addEventListener("focus", () => {
        searchInputEl.placeholder = "";
      });
      searchInputEl.addEventListener("blur", () => {
        if (!searchInputEl.value.trim()) searchInputEl.placeholder = searchPlaceholderText;
      });
    }

    const assistantInput = document.getElementById("assistantInput");
    const assistantBtn = document.getElementById("assistantBtn");
    const assistantStatus = document.getElementById("assistantStatus");
    const assistantResults = document.getElementById("assistantResults");
    const assistantBtnDefaultText = assistantBtn ? assistantBtn.textContent : "";

    if (assistantBtn && assistantInput) {
      const assistantPlaceholderText = assistantInput.getAttribute("placeholder") || "";
      assistantInput.addEventListener("focus", () => {
        assistantInput.placeholder = "";
      });
      assistantInput.addEventListener("blur", () => {
        if (!assistantInput.value.trim()) assistantInput.placeholder = assistantPlaceholderText;
      });

      const setAssistantLoading = (loading) => {
        assistantBtn.disabled = loading;
        assistantBtn.classList.toggle("assistant__btn--loading", loading);
        assistantBtn.textContent = loading ? "Подбираем…" : assistantBtnDefaultText;
        if (assistantStatus) {
          assistantStatus.classList.toggle("hidden", !loading);
          assistantStatus.textContent = loading ? "Подбираем процесс и рекомендации…" : "";
        }
      };

      const showAssistantMessage = (text, variant) => {
        if (!assistantResults) return;
        assistantResults.innerHTML = "";
        const p = document.createElement("p");
        p.className = "assistant__empty" + (variant ? ` assistant__empty--${variant}` : "");
        p.textContent = text;
        assistantResults.appendChild(p);
      };

      assistantBtn.addEventListener("click", async () => {
        const query = assistantInput.value.trim();
        if (!query) return;
        setAssistantLoading(true);
        if (assistantResults) assistantResults.innerHTML = "";

        try {
          const coachUrl = "/api/assistant-coach";
          const res = await fetch(coachUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
          });
          const data = await res.json();

          if (!res.ok) {
            let errText = data.userMessage || data.error || "Не удалось получить рекомендации.";
            if (res.status === 404 || errText === "Not found") {
              errText =
                "Сервис /api/assistant-coach не найден. Запустите проект через npm run dev в папке Scripts-CS и откройте http://localhost:3000 (перезапустите сервер после обновления). На Vercel — нужен новый деплой.";
            }
            showAssistantMessage(errText, "error");
            return;
          }

          const hasCoachBody =
            data.summary ||
            (data.doNow && data.doNow.length) ||
            (data.sayNow && data.sayNow.length) ||
            data.adviceMarkdown;

          if (data.error === "no_api_key" || !hasCoachBody) {
            if (data.userMessage) showAssistantMessage(data.userMessage, "warn");
            const fallbackMeta = findProcessMetaByCode(data.processCode);
            if (fallbackMeta) {
              const mini = document.createElement("div");
              mini.className = "coach-card coach-card--compact";
              const h = document.createElement("h3");
              h.className = "coach-card__process";
              h.textContent = data.processName || data.processCode;
              mini.appendChild(h);
              const openBtn = document.createElement("button");
              openBtn.type = "button";
              openBtn.className = "coach-card__cta";
              openBtn.textContent = "Открыть процесс";
              openBtn.addEventListener("click", () =>
                selectProcess(fallbackMeta, { initialSectionId: "section-script" })
              );
              mini.appendChild(openBtn);
              assistantResults.appendChild(mini);
            }
            renderAssistantFallbackCards(
              runAssistantQuery(metaFiltered, query).slice(0, 3),
              (m) => selectProcess(m, { initialSectionId: "section-script" })
            );
            return;
          }

          renderCoachResponse(data, metaFiltered, {
            findProcessMeta: findProcessMetaByCode,
            onNavigate: navigateFromCoach,
            onOpenProcess: (meta, readItem) =>
              selectProcess(meta, {
                initialSectionId: readItem.sectionId || "section-script",
              }),
          });
        } catch (err) {
          showAssistantMessage(
            err instanceof Error ? err.message : "Ошибка сети. Проверьте сервер и попробуйте снова.",
            "error"
          );
          renderAssistantFallbackCards(
            runAssistantQuery(metaFiltered, query).slice(0, 3),
            (m) => selectProcess(m, { initialSectionId: "section-script" })
          );
        } finally {
          setAssistantLoading(false);
        }
      });

      assistantInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          assistantBtn.click();
        }
      });
    }
  } catch (error) {
    console.error(error);
    const loadingEl = document.getElementById("appLoading");
    if (loadingEl) loadingEl.remove();
    const processView = document.getElementById("processView");
    const placeholder = document.getElementById("processPlaceholder");
    const details = document.getElementById("processDetails");
    if (details) details.classList.add("hidden");
    if (placeholder) placeholder.classList.remove("hidden");
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
    if (isMobile) {
      placeholder.innerHTML =
        "<p><strong>Не удалось загрузить данные.</strong></p>" +
        "<p>Проверьте подключение к интернету и обновите страницу.</p>" +
        "<p><button type=\"button\" onclick=\"location.reload()\">Обновить</button></p>" +
        "<p><small>" + (error.message || "") + "</small></p>";
    } else {
      placeholder.innerHTML =
        "<p><strong>Ошибка загрузки данных.</strong></p>" +
        "<p>Запустите сервер: дважды щёлкните по файлу <code>start_server.bat</code> в папке проекта, " +
        "затем откройте в браузере: <a href='http://localhost:8080/frontend/'>http://localhost:8080/frontend/</a></p>" +
        "<p>Либо из терминала в папке проекта: <code>python -m http.server 8080</code></p>" +
        "<p><small>" + (error.message || "") + "</small></p>";
    }
    if (processView) processView.classList.add("view--active");
    document.querySelectorAll(".view").forEach((v) => { if (v !== processView) v.classList.remove("view--active"); });
    document.querySelectorAll(".nav__item").forEach((b) => {
      b.classList.toggle("nav__item--active", b.dataset.view === "processes");
    });
    const navSelectErr = document.getElementById("navViewSelect");
    if (navSelectErr) navSelectErr.value = "processes";
  }
}

bootstrap();

