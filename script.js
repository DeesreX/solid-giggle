$(document).ready(() => {
  const STORAGE_KEYS = {
    pins: 'wf_pins',
    checkedItems: 'wf_checked_items',
    preferredPartMission: 'wf_preferred_part_mission',
    dockLayout: 'wf_dock_layout',
    missionAttempts: 'wf_mission_attempts'
  };

  const ITEMS_PER_PAGE = 10;
  const SELECTORS = {
    planetFilter: '#planetFilter',
    typeFilter: '#typeFilter',
    itemSearch: '#itemSearch',
    plannerSearch: '#plannerSearch',
    plannerWarframeOnly: '#plannerWarframeOnly',
    plannerResults: '#plannerResults',
    resultCount: '#resultCount',
    resetFilters: '#resetFilters',
    locationTable: '#locationTable',
    cardTitle: '#cardTitle',
    cardCategory: '#cardCategory',
    missionProgress: '#missionProgress',
    guideAnchor: '#guideAnchor',
    rotNav: '#rotNav',
    missionCard: '#missionCard',
    cardDrops: '#cardDrops',
    obtainedDrops: '#obtainedDrops',
    obtainedTable: '#obtainedTable',
    hideObtained: '#hideObtained',
    paginationAnchor: '#paginationAnchor',
    mainPinBtn: '#mainPinBtn',
    pinnedList: '#pinnedList',
    clearPins: '#clearPins',
    runCounterLabel: '#runCounterLabel',
    addRunBtn: '#addRunBtn',
    resetRunBtn: '#resetRunBtn'
  };

  const rotationOrders = {
    Survival: 'A-A-B-C (Every 5 mins)',
    Defense: 'A-A-B-C (Every 5 waves)',
    Interception: 'A-A-B-C (Every Round)',
    Excavation: 'A-A-B-C (Every successful Excavator)',
    Spy: 'A (1st), B (2nd), C (3rd Vault)',
    Defection: 'A-A-B-C (Every 2 Squads)',
    Disruption: 'Rewards scale by Round & Conduits'
  };

  let fullData = [];
  let currentMissionSet = [];
  let activeMissionID = '';
  let currentRotation = '';
  let dropPage = 1;
  let warframeIndex = {};

  let pinnedMissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.pins)) || [];
  let checkedItems = JSON.parse(localStorage.getItem(STORAGE_KEYS.checkedItems)) || {};
  let preferredPartMission = JSON.parse(localStorage.getItem(STORAGE_KEYS.preferredPartMission)) || {};
  let missionAttempts = JSON.parse(localStorage.getItem(STORAGE_KEYS.missionAttempts)) || {};

  const savePins = () => localStorage.setItem(STORAGE_KEYS.pins, JSON.stringify(pinnedMissions));
  const saveCheckedItems = () => localStorage.setItem(STORAGE_KEYS.checkedItems, JSON.stringify(checkedItems));
  const savePreferredPartMission = () => (
    localStorage.setItem(STORAGE_KEYS.preferredPartMission, JSON.stringify(preferredPartMission))
  );
  const saveMissionAttempts = () => (
    localStorage.setItem(STORAGE_KEYS.missionAttempts, JSON.stringify(missionAttempts))
  );

  const getDefaultLayout = () => ({
    order: ['searchSection', 'plannerSection', 'missionSection', 'pinnedSection'],
    hidden: [],
    gridPreset: 'balanced'
  });

  function readLayout() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.dockLayout));
    if (!saved || !Array.isArray(saved.order) || !Array.isArray(saved.hidden)) {
      return getDefaultLayout();
    }
    return {
      ...getDefaultLayout(),
      ...saved
    };
  }

  function saveLayout(layout) {
    localStorage.setItem(STORAGE_KEYS.dockLayout, JSON.stringify(layout));
  }

  function updateToggleButtonState() {
    $('.layout-toggle-btn').each(function updateBtn() {
      const sectionId = $(this).data('target');
      const isHidden = $(`#${sectionId}`).hasClass('hidden-section');
      $(this).toggleClass('is-hidden', isHidden);
    });
  }

  function persistCurrentLayoutOrder() {
    const layout = readLayout();
    layout.order = $('#workspaceGrid .dock-panel').map((_, el) => el.id).get();
    layout.hidden = $('#workspaceGrid .dock-panel.hidden-section').map((_, el) => el.id).get();
    saveLayout(layout);
  }

  function applyGridPreset(preset) {
    const presetClasses = ['layout-balanced', 'layout-mission-focus', 'layout-planner-focus', 'layout-columns'];
    const selectedPresetClass = `layout-${preset}`;

    $('#workspaceGrid').removeClass(presetClasses.join(' ')).addClass(selectedPresetClass);
    $('.layout-preset-btn').removeClass('active').filter(`[data-layout="${preset}"]`).addClass('active');
  }

  function initDockLayout() {
    const layout = readLayout();
    const $grid = $('#workspaceGrid');
    const $panels = $grid.children('.dock-panel');

    layout.order.forEach((panelId) => {
      const $panel = $(`#${panelId}`);
      if ($panel.length) $grid.append($panel);
    });

    $panels.each(function applyHiddenState() {
      const sectionId = this.id;
      $(this).toggleClass('hidden-section', layout.hidden.includes(sectionId));
    });

    updateToggleButtonState();
    applyGridPreset(layout.gridPreset);

    $('.layout-toggle-btn').on('click', function onToggleSection() {
      const sectionId = $(this).data('target');
      const $section = $(`#${sectionId}`);
      $section.toggleClass('hidden-section');
      updateToggleButtonState();
      persistCurrentLayoutOrder();
    });

    $('.layout-preset-btn').on('mouseenter', function onPresetHover() {
      const previewPreset = $(this).data('layout');
      $grid.addClass(`preview-layout-${previewPreset}`);
      applyGridPreset(previewPreset);
    });

    $('.layout-preset-btn').on('mouseleave', function onPresetLeave() {
      const currentLayout = readLayout();
      $grid.removeClass((_, className) => (
        (className.match(/preview-layout-\S+/g) || []).join(' ')
      ));
      applyGridPreset(currentLayout.gridPreset);
    });

    $('.layout-preset-btn').on('click', function onPresetClick() {
      const nextPreset = $(this).data('layout');
      const nextLayout = readLayout();
      nextLayout.gridPreset = nextPreset;
      saveLayout(nextLayout);
      applyGridPreset(nextPreset);
      showToast(`Layout set to ${$(this).text()}.`);
    });

    $('#resetLayoutBtn').on('click', () => {
      saveLayout(getDefaultLayout());
      window.location.reload();
    });

    let dragId = '';
    $grid.on('dragstart', '.dock-panel', function onDragStart() {
      dragId = this.id;
      $(this).addClass('dragging');
    });

    $grid.on('dragend', '.dock-panel', function onDragEnd() {
      $(this).removeClass('dragging');
      $('.dock-panel').removeClass('drop-target');
      dragId = '';
      persistCurrentLayoutOrder();
    });

    $grid.on('dragover', '.dock-panel', function onDragOver(e) {
      e.preventDefault();
      $('.dock-panel').removeClass('drop-target');
      $(this).addClass('drop-target');
    });

    $grid.on('drop', '.dock-panel', function onDrop(e) {
      e.preventDefault();
      if (!dragId || dragId === this.id) return;

      const $dragged = $(`#${dragId}`);
      if (!$dragged.length) return;

      if ($(this).index() > $dragged.index()) {
        $(this).after($dragged);
      } else {
        $(this).before($dragged);
      }
      $('.dock-panel').removeClass('drop-target');
    });

    $grid.on('dragleave', '.dock-panel', function onDragLeave() {
      $(this).removeClass('drop-target');
    });
  }

  async function init() {
    try {
      const response = await fetch('warframe_data.json');
      if (!response.ok) {
        throw new Error('File not found');
      }

      fullData = await response.json();
      initDockLayout();
      warframeIndex = buildWarframeIndex(fullData);
      setupTable();
      renderPinnedList();
      renderPlannerResults('');
      showToast('Data loaded. Pick a mission to get started.');
    } catch (err) {
      console.error('Failed to load data:', err);
      alert('Error: Ensure warframe_data.json is in the same folder.');
    }
  }

  function setupTable() {
    const seen = new Set();
    const tableRows = fullData.filter((item) => {
      const id = `${item.planet}|${item.mission}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const itemMap = buildMissionItemMap(fullData);

    const locTable = $(SELECTORS.locationTable).DataTable({
      data: tableRows,
      paging: true,
      pageLength: 15,
      dom: 'ft',
      columns: [
        { data: 'mission' },
        { data: 'planet', visible: false },
        { data: 'type', visible: false }
      ],
      language: { search: '', searchPlaceholder: 'Search missions...' }
    });

    const updateResultCount = () => {
      const shown = locTable.rows({ filter: 'applied' }).count();
      const total = locTable.rows().count();
      $(SELECTORS.resultCount).text(`${shown} of ${total} missions shown`);
    };

    $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
      if (settings.nTable !== $(SELECTORS.locationTable).get(0)) return true;

      const query = $(SELECTORS.itemSearch).val().toLowerCase().trim();
      if (!query) return true;

      const row = locTable.row(dataIndex).data();
      const items = itemMap[missionKey(row.planet, row.mission)] || [];
      return items.some((item) => item.includes(query));
    });

    $(SELECTORS.itemSearch).on('keyup', () => locTable.draw());

    $(`${SELECTORS.planetFilter}, ${SELECTORS.typeFilter}`).on('change', () => {
      const pVal = $(SELECTORS.planetFilter).val();
      const tVal = $(SELECTORS.typeFilter).val();

      locTable.column(1).search(pVal === 'All' ? '' : `^${pVal}$`, true, false);
      locTable.column(2).search(tVal === 'All' ? '' : `^${tVal}$`, true, false);
      locTable.draw();
    });

    $(SELECTORS.resetFilters).on('click', () => {
      $(SELECTORS.planetFilter).val('All');
      $(SELECTORS.typeFilter).val('All');
      $(SELECTORS.itemSearch).val('');
      locTable.search('');
      locTable.column(1).search('');
      locTable.column(2).search('');
      locTable.draw();
      showToast('Filters reset.');
    });

    $(`${SELECTORS.locationTable} tbody`).on('click', 'tr', function onClickRow() {
      const data = locTable.row(this).data();
      if (!data) return;

      dropPage = 1;
      loadMission(data.planet, data.mission);
    });

    populateFilters(tableRows);
    updateResultCount();
    locTable.on('draw', updateResultCount);
  }

  function buildMissionItemMap(data) {
    return data.reduce((acc, entry) => {
      const key = missionKey(entry.planet, entry.mission);
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry.item.toLowerCase());
      return acc;
    }, {});
  }

  function missionKey(planet, mission) {
    return `${planet}|${mission}`;
  }

  function populateFilters(rows) {
    const planets = [...new Set(rows.map((row) => row.planet))].sort();
    const types = [...new Set(rows.map((row) => row.type))].sort();

    planets.forEach((planet) => $(SELECTORS.planetFilter).append(new Option(planet, planet)));
    types.forEach((type) => $(SELECTORS.typeFilter).append(new Option(type, type)));
  }

  function parseChancePercent(chanceText) {
    const match = chanceText.match(/(\d+(?:\.\d+)?)%/);
    return match ? Number(match[1]) : 0;
  }

  function getExpectedRuns(chance) {
    if (!chance) return '—';
    return `${Math.ceil(100 / chance)} runs`;
  }

  function getNoDropChance(chancePercent, runCount) {
    if (!chancePercent || !runCount) return 100;
    return ((1 - (chancePercent / 100)) ** runCount) * 100;
  }

  function missionAttemptKey(missionId, rotation) {
    return `${missionId}|${rotation}`;
  }

  function getRunCountForCurrentMission() {
    if (!activeMissionID || !currentRotation) return 0;
    const key = missionAttemptKey(activeMissionID, currentRotation);
    return missionAttempts[key] || 0;
  }

  function getMissionRotations() {
    const uniqueRotations = [...new Set(currentMissionSet.map((entry) => entry.rotation))]
      .filter((rotation) => rotation && rotation !== 'N/A');
    return uniqueRotations.length ? uniqueRotations : [currentRotation];
  }

  function updateRunCounterLabel() {
    const runs = getRunCountForCurrentMission();
    $(SELECTORS.runCounterLabel).text(`Completed runs: ${runs}`);
  }

  function extractBlueprintInfo(itemName) {
    const match = itemName.match(/^(.*?)(?: (Chassis|Neuroptics|Systems))? Blueprint$/);
    if (!match) return null;

    return {
      warframe: match[1],
      part: match[2] || 'Main'
    };
  }

  function buildWarframeIndex(data) {
    const candidateFrames = data.reduce((acc, entry) => {
      const info = extractBlueprintInfo(entry.item);
      if (!info) return acc;

      if (!acc[info.warframe]) {
        acc[info.warframe] = {
          parts: new Set(),
          entries: []
        };
      }

      acc[info.warframe].parts.add(info.part);
      acc[info.warframe].entries.push({
        ...entry,
        part: info.part,
        missionId: `${entry.planet}/${entry.mission}`
      });
      return acc;
    }, {});

    return Object.entries(candidateFrames).reduce((acc, [name, value]) => {
      const partSet = value.parts;
      const hasFullFrameParts = ['Chassis', 'Neuroptics', 'Systems'].every((part) => partSet.has(part));
      if (!hasFullFrameParts) return acc;
      acc[name] = value.entries;
      return acc;
    }, {});
  }

  function loadMission(planet, mission) {
    activeMissionID = `${planet}/${mission}`;
    currentMissionSet = fullData.filter((entry) => entry.planet === planet && entry.mission === mission);

    if (!currentMissionSet.length) return;

    const first = currentMissionSet[0];
    $(SELECTORS.cardTitle).text(`${planet} > ${mission}`);
    $(SELECTORS.cardCategory).html(`${first.category} <span style="color:var(--accent)">[${first.type}]</span>`);
    $(SELECTORS.guideAnchor).html(`<b>Rotation:</b> ${rotationOrders[first.type] || 'Standard'}`);

    updatePinButtonUI();
    setupRotationNav();

    $(SELECTORS.missionCard).fadeIn(100);
    renderDrops(currentRotation, 1);
  }

  function setupRotationNav() {
    const validRots = [...new Set(currentMissionSet.map((entry) => entry.rotation))]
      .filter((rotation) => rotation && rotation !== 'N/A');

    if (validRots.length > 1) {
      const navHtml = validRots
        .map((rotation, i) => (`
          <button class="rot-btn ${i === 0 ? 'active' : ''}" data-rot="${rotation}">
            ${rotation}
          </button>
        `))
        .join('');

      $(SELECTORS.rotNav).html(navHtml).show();
      currentRotation = validRots[0];
      return;
    }

    $(SELECTORS.rotNav).hide();
    currentRotation = validRots[0] || 'N/A';
  }

  function renderDrops(rotation, page = 1) {
    currentRotation = rotation;

    const filtered = currentMissionSet.filter((entry) => entry.rotation === rotation);
    const unobtained = filtered.filter((entry) => !checkedItems[entry.item]);
    const obtained = filtered.filter((entry) => checkedItems[entry.item]);

    const totalPages = Math.ceil(unobtained.length / ITEMS_PER_PAGE) || 1;
    dropPage = page > totalPages ? totalPages : page;

    const start = (dropPage - 1) * ITEMS_PER_PAGE;
    const paginatedFarm = unobtained.slice(start, start + ITEMS_PER_PAGE);
    const runCount = getRunCountForCurrentMission();

    const farmHtml = paginatedFarm.map((entry) => generateRowHtml(entry, false, runCount)).join('');
    $(SELECTORS.cardDrops).html(
      farmHtml || '<tr><td colspan="3" class="empty-msg">No items left to farm!</td></tr>'
    );

    const obtainedHtml = obtained.map((entry) => generateRowHtml(entry, true, runCount)).join('');
    $(SELECTORS.obtainedDrops).html(obtainedHtml);

    const completion = filtered.length ? Math.round((obtained.length / filtered.length) * 100) : 0;
    $(SELECTORS.missionProgress).html(
      `<span>${unobtained.length} items left</span><span>${completion}% complete</span>`
    );

    const shouldShowObtained = !$(SELECTORS.hideObtained).is(':checked') && obtained.length > 0;
    $(SELECTORS.obtainedTable).toggle(shouldShowObtained);

    updateRunCounterLabel();
    renderDropPagination(totalPages);
  }

  function generateRowHtml(row, isObtained, runCount = 0) {
    const chanceClass = row.chance.includes('Rare')
      ? 'rare'
      : row.chance.includes('Uncommon')
        ? 'uncommon'
        : 'common';
    const chancePercent = parseChancePercent(row.chance);
    const noDropChance = getNoDropChance(chancePercent, runCount);
    const noDropText = runCount > 0 && !isObtained
      ? `<span class="miss-rate">Miss chance after ${runCount} run${runCount === 1 ? '' : 's'}: ${noDropChance.toFixed(2)}%</span>`
      : '';

    return `
      <tr class="drop-row" data-item="${row.item}">
        <td class="action-icon" style="color:${isObtained ? 'var(--accent)' : 'var(--success)'}">
          ${isObtained ? '⟳' : '✔'}
        </td>
        <td>${row.item}</td>
        <td class="${chanceClass} drop-chance-cell">${row.chance}${noDropText}</td>
      </tr>
    `;
  }

  function renderDropPagination(totalPages) {
    $(SELECTORS.paginationAnchor).empty();
    if (totalPages <= 1) return;

    let navHtml = '<div class="drop-pagination">';
    for (let i = 1; i <= totalPages; i += 1) {
      navHtml += `<button class="page-btn ${i === dropPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    navHtml += '</div>';

    $(SELECTORS.paginationAnchor).html(navHtml);
  }

  function updatePinButtonUI() {
    const isPinned = pinnedMissions.includes(activeMissionID);
    $(SELECTORS.mainPinBtn).text(isPinned ? '★' : '☆').toggleClass('active', isPinned);
  }

  function renderPinnedList() {
    const $list = $(SELECTORS.pinnedList).empty();

    if (!pinnedMissions.length) {
      $list.html('<div class="empty-pins">Pinned missions appear here.</div>');
      return;
    }

    pinnedMissions.forEach((id) => {
      const [planet, mission] = id.split('/');
      const $item = $(`
        <div class="pinned-item">
          <span>${mission} <small>(${planet})</small></span>
          <span class="remove-pin">×</span>
        </div>
      `);

      $item.on('click', (e) => {
        if (!$(e.target).hasClass('remove-pin')) {
          loadMission(planet, mission);
        }
      });

      $item.find('.remove-pin').on('click', () => {
        pinnedMissions = pinnedMissions.filter((pinnedId) => pinnedId !== id);
        savePins();
        renderPinnedList();
        updatePinButtonUI();
      });

      $list.append($item);
    });
  }

  function renderPlannerResults(query) {
    const warframesOnly = $(SELECTORS.plannerWarframeOnly).is(':checked');
    if (warframesOnly) {
      renderWarframeSearchResults(query);
      return;
    }

    const normalized = query.toLowerCase().trim();
    if (!normalized) {
      $(SELECTORS.plannerResults).html('<div class="empty-msg">Search an item to see best drop locations.</div>');
      return;
    }

    const matches = fullData
      .filter((entry) => entry.item.toLowerCase().includes(normalized))
      .map((entry) => {
        const chance = parseChancePercent(entry.chance);
        return {
          ...entry,
          chancePercent: chance,
          missionId: `${entry.planet}/${entry.mission}`
        };
      })
      .sort((a, b) => b.chancePercent - a.chancePercent)
      .slice(0, 12);

    if (!matches.length) {
      $(SELECTORS.plannerResults).html('<div class="empty-msg">No matching drops found.</div>');
      return;
    }

    const html = matches.map((entry) => `
      <button class="planner-row" data-planet="${entry.planet}" data-mission="${entry.mission}">
        <div>
          <strong>${entry.item}</strong>
          <small>${entry.planet} • ${entry.mission} • ${entry.rotation}</small>
        </div>
        <div class="planner-metrics">
          <span class="chance">${entry.chance}</span>
          <span>${getExpectedRuns(entry.chancePercent)}</span>
        </div>
      </button>
    `).join('');

    $(SELECTORS.plannerResults).html(html);
  }

  function renderWarframeSearchResults(query) {
    const normalized = query.toLowerCase().trim();
    if (!normalized) {
      $(SELECTORS.plannerResults).html('<div class="empty-msg">Search a Warframe name to see where each blueprint drops.</div>');
      return;
    }

    const frameNames = Object.keys(warframeIndex)
      .filter((name) => name.toLowerCase().includes(normalized))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 20);

    if (!frameNames.length) {
      $(SELECTORS.plannerResults).html('<div class="empty-msg">No matching Warframes found.</div>');
      return;
    }

    const html = frameNames.map((name) => `
      <button class="planner-row planner-warframe-row" data-warframe="${name}">
        <div>
          <strong>${name}</strong>
          <small>Show best farms for ${name} blueprints</small>
        </div>
      </button>
    `).join('');

    $(SELECTORS.plannerResults).html(html);
  }

  function renderWarframeParts(warframeName) {
    const entries = warframeIndex[warframeName] || [];
    if (!entries.length) {
      $(SELECTORS.plannerResults).html('<div class="empty-msg">No blueprint drops found for this Warframe.</div>');
      return;
    }

    const groupedByItem = entries.reduce((acc, entry) => {
      const chance = parseChancePercent(entry.chance);
      if (!acc[entry.item]) {
        acc[entry.item] = [];
      }

      acc[entry.item].push({
        ...entry,
        chancePercent: chance
      });
      return acc;
    }, {});

    const selectedPerItem = Object.entries(groupedByItem).map(([itemName, options]) => {
      const sortedOptions = [...options].sort((a, b) => b.chancePercent - a.chancePercent);
      const preferredMissionId = preferredPartMission[itemName];
      const preferred = sortedOptions.find((option) => option.missionId === preferredMissionId);

      return {
        itemName,
        options: sortedOptions,
        selected: preferred || sortedOptions[0]
      };
    });

    const sorted = selectedPerItem.sort((a, b) => {
      const aPart = a.selected.part === 'Main' ? 0 : 1;
      const bPart = b.selected.part === 'Main' ? 0 : 1;
      if (aPart !== bPart) return aPart - bPart;
      return a.selected.part.localeCompare(b.selected.part);
    });

    const html = `
      <div class="planner-section-title">${warframeName} blueprint farms</div>
      ${sorted.map(({ itemName, selected, options }) => `
        <div class="planner-part-card">
          <button class="planner-row planner-part-row" data-planet="${selected.planet}" data-mission="${selected.mission}">
            <div>
              <strong>${selected.item}</strong>
              <small>${selected.planet} • ${selected.mission} • ${selected.rotation}</small>
            </div>
            <div class="planner-metrics">
              <span class="chance">${selected.chance}</span>
              <span>${getExpectedRuns(selected.chancePercent)}</span>
            </div>
          </button>
          <label class="planner-alt-label">
            Preferred mission
            <select class="planner-alt-select" data-item="${itemName}">
              ${options.map((option) => `
                <option value="${option.missionId}" ${option.missionId === selected.missionId ? 'selected' : ''}>
                  ${option.planet} • ${option.mission} • ${option.rotation} (${option.chance})
                </option>
              `).join('')}
            </select>
          </label>
        </div>
      `).join('')}
    `;

    $(SELECTORS.plannerResults).html(html);
  }

  function setPreferredPartMission(itemName, missionId) {
    if (!itemName || !missionId) return;
    preferredPartMission[itemName] = missionId;
    savePreferredPartMission();
  }

  function getWarframeNameForItem(itemName) {
    const info = extractBlueprintInfo(itemName);
    return info ? info.warframe : '';
  }

  $(document).on('change', '.planner-alt-select', function onPreferredMissionChange() {
    const itemName = $(this).data('item');
    const missionId = $(this).val();
    setPreferredPartMission(itemName, missionId);

    const warframeName = getWarframeNameForItem(itemName);
    if (warframeName) {
      renderWarframeParts(warframeName);
      showToast(`Preferred mission updated for ${itemName}.`);
    }
  });

  $(document).on('click', '.drop-row', function onClickDropRow() {
    const itemName = $(this).data('item');
    if (checkedItems[itemName]) {
      delete checkedItems[itemName];
    } else {
      checkedItems[itemName] = true;
    }

    saveCheckedItems();
    renderDrops(currentRotation, dropPage);
    showToast(`${itemName} marked as ${checkedItems[itemName] ? 'obtained' : 'not obtained'}.`);
  });

  $(document).on('click', '.page-btn', function onClickPage() {
    renderDrops(currentRotation, $(this).data('page'));
  });

  $(SELECTORS.rotNav).on('click', '.rot-btn', function onClickRotation() {
    $('.rot-btn').removeClass('active');
    $(this).addClass('active');
    renderDrops($(this).data('rot'), 1);
  });

  $(SELECTORS.mainPinBtn).on('click', () => {
    const idx = pinnedMissions.indexOf(activeMissionID);
    if (idx > -1) {
      pinnedMissions.splice(idx, 1);
    } else {
      pinnedMissions.push(activeMissionID);
    }

    savePins();
    updatePinButtonUI();
    renderPinnedList();
    showToast(idx > -1 ? 'Mission unpinned.' : 'Mission pinned.');
  });

  $(SELECTORS.plannerSearch).on('input', function onPlannerInput() {
    renderPlannerResults($(this).val());
  });

  $(SELECTORS.plannerWarframeOnly).on('change', function onWarframeToggle() {
    renderPlannerResults($(SELECTORS.plannerSearch).val());
  });

  $(document).on('click', '.planner-part-row, .planner-row:not(.planner-warframe-row)', function onPlannerRowClick() {
    const planet = $(this).data('planet');
    const mission = $(this).data('mission');
    loadMission(planet, mission);
  });

  $(document).on('click', '.planner-warframe-row', function onWarframeRowClick() {
    renderWarframeParts($(this).data('warframe'));
  });

  $(SELECTORS.hideObtained).on('change', () => renderDrops(currentRotation, 1));

  $(SELECTORS.addRunBtn).on('click', () => {
    if (!activeMissionID || !currentRotation) return;

    const rotations = getMissionRotations();
    const selectedRotationIndex = rotations.indexOf(currentRotation);
    const affectedRotations = selectedRotationIndex > -1
      ? rotations.slice(0, selectedRotationIndex + 1)
      : [currentRotation];

    affectedRotations.forEach((rotation) => {
      const key = missionAttemptKey(activeMissionID, rotation);
      missionAttempts[key] = (missionAttempts[key] || 0) + 1;
    });

    saveMissionAttempts();
    renderDrops(currentRotation, dropPage);
  });

  $(SELECTORS.resetRunBtn).on('click', () => {
    if (!activeMissionID || !currentRotation) return;

    const key = missionAttemptKey(activeMissionID, currentRotation);
    delete missionAttempts[key];
    saveMissionAttempts();
    renderDrops(currentRotation, dropPage);
    showToast('Run counter reset for this mission rotation.');
  });

  $(SELECTORS.clearPins).on('click', () => {
    if (!confirm('Clear all pins?')) return;

    pinnedMissions = [];
    savePins();
    renderPinnedList();
    updatePinButtonUI();
    showToast('All pins cleared.');
  });

  function showToast(message) {
    const $existing = $('#toastMessage');
    if ($existing.length) $existing.remove();

    const $toast = $(`<div id="toastMessage" class="toast">${message}</div>`);
    $('body').append($toast);
    setTimeout(() => $toast.addClass('show'), 10);
    setTimeout(() => {
      $toast.removeClass('show');
      setTimeout(() => $toast.remove(), 220);
    }, 1700);
  }

  init();
});
