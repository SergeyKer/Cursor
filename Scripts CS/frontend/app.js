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
    loadJson(`${DATA_BASE_PATH}/processes_meta.json?v=3`),
    loadJson(`${DATA_BASE_PATH}/processes.json?v=3`),
    loadJson(`${DATA_BASE_PATH}/communication_tools.json?v=2`),
  ]);
  return { meta, processes, tools };
}

function initNavigation(views, onProcessViewSwitch) {
  const buttons = document.querySelectorAll(".nav__item");
  const viewMap = views || {
    processes: document.getElementById("processView"),
    assistant: document.getElementById("assistantView"),
    tools: document.getElementById("toolsView"),
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      buttons.forEach((b) => b.classList.remove("nav__item--active"));
      btn.classList.add("nav__item--active");
      Object.entries(viewMap).forEach(([key, el]) => {
        if (el) el.classList.toggle("view--active", key === view);
      });
      if (view === "processes" && onProcessViewSwitch) onProcessViewSwitch();
    });
  });
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

function renderAssistantResults(results, onSelectProcess) {
  const container = document.getElementById("assistantResults");
  container.innerHTML = "";
  if (results.length === 0) {
    container.innerHTML = '<p class="assistant__empty">По вашему запросу процессы не найдены. Попробуйте другие слова.</p>';
    return;
  }
  results.forEach((processMeta) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "assistant-card";
    card.innerHTML = `
      <span class="assistant-card__title">${escapeHtml(processMeta.name || "")}</span>
      ${processMeta.short_description ? `<span class="assistant-card__desc">${escapeHtml(processMeta.short_description)}</span>` : ""}
    `;
    card.addEventListener("click", () => {
      onSelectProcess(processMeta);
    });
    container.appendChild(card);
  });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function renderProcessList(processesMeta, onSelect) {
  const listEl = document.getElementById("processList");
  const searchInput = document.getElementById("searchInput");

  let currentActiveCode = null;

  function normalized(text) {
    return (text || "").toString().toLowerCase();
  }

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
    const name = normalized((p && (p.name || p.code)) || "");
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
    const query = normalized(filter);
    listEl.innerHTML = "";
    const filtered = (processesMeta || [])
      .filter((p) => !isLegacyHeadingItem(p))
      .filter((p) => {
        if (!query) return true;
        return (
          normalized(p.name).includes(query) ||
          normalized(p.short_description).includes(query) ||
          normalized(p.searchable_text || "").includes(query)
        );
      });

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
  shortDescEl.textContent = processMeta.short_description || "";

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
      const cells = [
        stage.stage,
        stage.description,
        stage.operator_actions,
        stage.sla,
        stage.stage_goal,
        stage.recommendations,
      ];
      cells.forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value || "";
        tr.appendChild(td);
      });
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
      const table = document.createElement("table");
      table.className = "table";
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
        const cells = [step.step_name, step.phrase, step.goal];
        cells.forEach((value) => {
          const td = document.createElement("td");
          td.textContent = value || "";
          tr.appendChild(td);
        });
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
      const table = document.createElement("table");
      table.className = "table";
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
        const cells = [row.complaint, row.reply, row.goal];
        cells.forEach((value) => {
          const td = document.createElement("td");
          td.textContent = value || "";
          tr.appendChild(td);
        });
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

    const wrapper = document.createElement("div");
    wrapper.className = "table-wrapper";
    const table = document.createElement("table");
    table.className = "table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>${escapeHtml(cols[0] || "Статус 1")}</th>
          <th>${escapeHtml(cols[1] || "Статус 2")}</th>
          <th>${escapeHtml(cols[2] || "Статус 3")}</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");
    processData.status_script.rows.forEach((row) => {
      const tr = document.createElement("tr");
      const cells = Array.isArray(row) ? row : ["", "", ""];
      for (let i = 0; i < 3; i++) {
        const td = document.createElement("td");
        td.style.whiteSpace = "pre-wrap";
        td.textContent = cells[i] || "";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    wrapper.appendChild(table);
    block.appendChild(wrapper);
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
      <table class="table">
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
      const cells = [item.situation_type || "", item.operator_goal || "", phrasesText];
      cells.forEach((value) => {
        const td = document.createElement("td");
        td.style.whiteSpace = "pre-wrap";
        td.textContent = value || "";
        tr.appendChild(td);
      });
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
  } else {
    autoReplySection.classList.add("hidden");
  }

  const detailsContainer = document.getElementById("processDetails");
  if (detailsContainer) {
    const scrollToTop = () => {
      detailsContainer.scrollTo({ top: 0, behavior: "smooth" });
    };
    detailsContainer.querySelectorAll(".card").forEach((card) => {
      const existing = card.querySelector(".card__scroll-top");
      if (existing) existing.remove();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card__scroll-top card__scroll-top--outline";
      btn.setAttribute("aria-label", "В начало страницы");
      btn.title = "В начало";
      btn.innerHTML = "<span aria-hidden=\"true\">↑</span>";
      btn.addEventListener("click", scrollToTop);
      card.appendChild(btn);
    });
  }
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
  const firstEl = document.getElementById("toolsSheetFirst");
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
    table.className = "tools-table";
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
      const tdName = document.createElement("td");
      tdName.className = "tools-table__name";
      tdName.textContent = tool.title || "Без названия";
      const tdDesc = document.createElement("td");
      tdDesc.className = "tools-table__desc";
      tdDesc.textContent = stripIncomingCallsBlock(parsed.description);
      const tdWhen = document.createElement("td");
      tdWhen.className = "tools-table__when";
      tdWhen.textContent = stripIncomingCallsBlock(parsed.when);
      const tdExample = document.createElement("td");
      tdExample.className = "tools-table__example";
      tdExample.textContent = stripIncomingCallsBlock(parsed.example);
      tr.appendChild(tdName);
      tr.appendChild(tdDesc);
      tr.appendChild(tdWhen);
      tr.appendChild(tdExample);
      tbody.appendChild(tr);
    });
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }
}

async function bootstrap() {
  const layout = document.getElementById("layout");
  const sidebarToggle = document.getElementById("sidebarToggle");
  if (sidebarToggle && layout) {
    sidebarToggle.setAttribute("aria-label", layout.classList.contains("sidebar--open") ? "Закрыть меню" : "Открыть меню");
    sidebarToggle.addEventListener("click", () => {
      layout.classList.toggle("sidebar--open");
      sidebarToggle.setAttribute("aria-label", layout.classList.contains("sidebar--open") ? "Закрыть меню" : "Открыть меню");
    });
  }

  const views = {
    processes: document.getElementById("processView"),
    assistant: document.getElementById("assistantView"),
    tools: document.getElementById("toolsView"),
  };
  try {
    const { meta, processes, tools } = await loadData();
    const loadingEl = document.getElementById("appLoading");
    if (loadingEl) loadingEl.remove();

    const placeholder = document.getElementById("processPlaceholder");
    const details = document.getElementById("processDetails");

    const selectProcess = (processMeta) => {
      document.querySelectorAll(".nav__item").forEach((b) => {
        b.classList.toggle("nav__item--active", b.dataset.view === "processes");
      });
      Object.entries(views).forEach(([key, el]) => {
        if (el) el.classList.toggle("view--active", key === "processes");
      });
      if (placeholder) placeholder.classList.add("hidden");
      if (details) details.classList.remove("hidden");
      renderProcessDetails(processMeta, processes);
    };

    const showProcessListMain = () => {
      if (placeholder) placeholder.classList.remove("hidden");
      if (details) details.classList.add("hidden");
    };

    initNavigation(views, showProcessListMain);

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

      function normalized(text) {
        return (text || "").toString().toLowerCase();
      }

      function filterMetaByQuery(meta, query) {
        const q = normalized(query);
        if (!q) return meta;
        return meta.filter(
          (p) =>
            normalized(p.name).includes(q) ||
            normalized(p.short_description || "").includes(q) ||
            normalized(p.searchable_text || "").includes(q)
        );
      }

      function applyMainSearch() {
        const query = listSearchInput ? listSearchInput.value.trim() : "";
        const filtered = filterMetaByQuery(metaFiltered, query);
        renderProcessListMain(filtered, selectProcess, processes);
        if (listSearchClear) listSearchClear.style.display = query ? "" : "none";
      }

      if (listSearchInput) {
        // #region agent log
        const logProcessSearchSize = (eventName) => {
          const container = listSearchInput.closest(".process-list-search");
          if (!container) return;
          const cs = window.getComputedStyle(container);
          const isInput = window.getComputedStyle(listSearchInput);
          const clearEl = document.getElementById("processListSearchClear");
          const data = {
            event: eventName,
            containerWidth: container.offsetWidth,
            inputWidth: listSearchInput.offsetWidth,
            containerBoxShadow: cs.boxShadow,
            containerBorderWidth: cs.borderWidth,
            inputOutline: isInput.outlineWidth + " " + isInput.outlineStyle,
            placeholderLen: (listSearchInput.placeholder || "").length,
            clearDisplay: clearEl ? window.getComputedStyle(clearEl).display : ""
          };
          fetch("http://127.0.0.1:7604/ingest/1c893e2e-1189-4005-a895-a8c44a156288", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "df5d68" }, body: JSON.stringify({ sessionId: "df5d68", location: "app.js:processListSearch", message: "process search size", data, timestamp: Date.now(), hypothesisId: eventName === "focus" ? "H1" : "H1" }) }).catch(() => {});
        };
        // #endregion
        listSearchInput.addEventListener("focus", () => {
          listSearchInput.placeholder = "";
          setTimeout(() => logProcessSearchSize("focus"), 0);
        });
        listSearchInput.addEventListener("blur", () => {
          if (!listSearchInput.value.trim()) listSearchInput.placeholder = placeholderText;
          setTimeout(() => logProcessSearchSize("blur"), 0);
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
    if (assistantBtn && assistantInput) {
      const assistantPlaceholderText = assistantInput.getAttribute("placeholder") || "";
      assistantInput.addEventListener("focus", () => {
        assistantInput.placeholder = "";
      });
      assistantInput.addEventListener("blur", () => {
        if (!assistantInput.value.trim()) assistantInput.placeholder = assistantPlaceholderText;
      });
      assistantBtn.addEventListener("click", () => {
        const results = runAssistantQuery(metaFiltered, assistantInput.value);
        renderAssistantResults(results, selectProcess);
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
    document.querySelectorAll(".nav__item").forEach((b) => { b.classList.toggle("nav__item--active", b.dataset.view === "processes"); });
  }
}

bootstrap();

