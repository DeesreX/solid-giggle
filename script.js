$(document).ready(function() {
    let fullData = [];
    let currentMissionSet = [];
    let activeMissionID = "";
    let currentRotation = "";
    let dropPage = 1; // Moved to top level to track state
    const itemsPerPage = 10;
    
    // Persistence
    let pinnedMissions = JSON.parse(localStorage.getItem('wf_pins')) || [];
    let checkedItems = JSON.parse(localStorage.getItem('wf_checked_items')) || {};

    const rotationOrders = {
        "Survival": "A-A-B-C (Every 5 mins)",
        "Defense": "A-A-B-C (Every 5 waves)",
        "Interception": "A-A-B-C (Every Round)",
        "Excavation": "A-A-B-C (Every successful Excavator)",
        "Spy": "A (1st), B (2nd), C (3rd Vault)",
        "Defection": "A-A-B-C (Every 2 Squads)",
        "Disruption": "Rewards scale by Round & Conduits"
    };

    async function init() {
        try {
            const response = await fetch('warframe_data.json');
            if (!response.ok) throw new Error("File not found");
            fullData = await response.json();
            setupTable();
            renderPinnedList();
        } catch (err) { 
            console.error("Failed to load data:", err); 
            alert("Error: Ensure warframe_data.json is in the same folder.");
        }
    }

    // --- Table Setup ---
    function setupTable() {
        const seen = new Set();
        const tableRows = fullData.filter(item => {
            const id = `${item.planet}|${item.mission}`;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        // Pre-map items to missions for O(1) search performance
        const itemMap = {};
        fullData.forEach(d => {
            const key = `${d.planet}|${d.mission}`;
            if (!itemMap[key]) itemMap[key] = [];
            itemMap[key].push(d.item.toLowerCase());
        });

        const locTable = $('#locationTable').DataTable({
            data: tableRows,
            paging: true,
            pageLength: 15,
            dom: 'ft', 
            columns: [
                { data: "mission" },
                { data: "planet", visible: false },
                { data: "type", visible: false }
            ],
            language: { search: "", searchPlaceholder: "Search missions..." }
        });

        // Search by Item Name
        $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
            const query = $('#itemSearch').val().toLowerCase();
            if (!query) return true;
            const row = locTable.row(dataIndex).data();
            const items = itemMap[`${row.planet}|${row.mission}`] || [];
            return items.some(i => i.includes(query));
        });

        $('#itemSearch').on('keyup', () => locTable.draw());

        $('#planetFilter, #typeFilter').on('change', function() {
            const pVal = $('#planetFilter').val();
            const tVal = $('#typeFilter').val();
            locTable.column(1).search(pVal === 'All' ? '' : `^${pVal}$`, true, false);
            locTable.column(2).search(tVal === 'All' ? '' : `^${tVal}$`, true, false);
            locTable.draw();
        });

        $('#locationTable tbody').on('click', 'tr', function () {
            const data = locTable.row(this).data();
            if (data) {
                dropPage = 1; // Reset page on new mission
                loadMission(data.planet, data.mission);
            }
        });
        
        // Populate Filters
        const planets = [...new Set(tableRows.map(d => d.planet))].sort();
        const types = [...new Set(tableRows.map(d => d.type))].sort();
        planets.forEach(p => $('#planetFilter').append(new Option(p, p)));
        types.forEach(t => $('#typeFilter').append(new Option(t, t)));
    }

    // --- Mission Logic ---
    function loadMission(planet, mission) {
        activeMissionID = `${planet}/${mission}`;
        currentMissionSet = fullData.filter(d => d.planet === planet && d.mission === mission);
        if (!currentMissionSet.length) return;

        const first = currentMissionSet[0];
        $('#cardTitle').text(`${planet} > ${mission}`);
        $('#cardCategory').html(`${first.category} <span style="color:var(--accent)">[${first.type}]</span>`);
        $('#guideAnchor').html(`<b>Rotation:</b> ${rotationOrders[first.type] || "Standard"}`);
        
        updatePinButtonUI();
        
        const validRots = [...new Set(currentMissionSet.map(d => d.rotation))].filter(r => r && r !== "N/A");
        if (validRots.length > 1) {
            $('#rotNav').html(validRots.map((r, i) => 
                `<button class="rot-btn ${i===0?'active':''}" data-rot="${r}">${r}</button>`
            ).join('')).show();
            currentRotation = validRots[0];
        } else {
            $('#rotNav').hide();
            currentRotation = validRots[0] || "N/A";
        }
        
        $('#missionCard').fadeIn(100);
        renderDrops(currentRotation, 1); // Explicitly start at page 1
    }

    function renderDrops(rot, page = 1) {
    currentRotation = rot;
    
    const filtered = currentMissionSet.filter(d => d.rotation === rot);
    const unobtained = filtered.filter(r => !checkedItems[r.item]);
    const obtained = filtered.filter(r => checkedItems[r.item]);

    // Calculate total pages based on current unobtained count
    const totalPages = Math.ceil(unobtained.length / itemsPerPage) || 1;
    
    // Safety check: If items were removed, ensure the current page still exists
    dropPage = page > totalPages ? totalPages : page;

    const start = (dropPage - 1) * itemsPerPage;
    const paginatedFarm = unobtained.slice(start, start + itemsPerPage);

    // Render Farm Table
    let farmHtml = paginatedFarm.map(r => generateRowHtml(r, false)).join('');
    $('#cardDrops').html(farmHtml || '<tr><td colspan="3" class="empty-msg">No items left to farm!</td></tr>');

    // Render Obtained Table
    let obtainedHtml = obtained.map(r => generateRowHtml(r, true)).join('');
    $('#obtainedDrops').html(obtainedHtml);
    $('#obtainedTable').toggle(!$('#hideObtained').is(':checked') && obtained.length > 0);

    renderDropPagination(totalPages);
}

    function generateRowHtml(r, isObtained) {
        const cClass = r.chance.includes('Rare') ? 'rare' : r.chance.includes('Uncommon') ? 'uncommon' : 'common';
        return `
            <tr class="drop-row" data-item="${r.item}">
                <td class="action-icon" style="color:${isObtained ? 'var(--accent)' : 'var(--success)'}">
                    ${isObtained ? '⟳' : '✔'}
                </td>
                <td>${r.item}</td>
                <td class="${cClass}" style="text-align:right">${r.chance}</td>
            </tr>`;
    }

function renderDropPagination(totalPages) {
    $('#paginationAnchor').empty(); 
    if (totalPages <= 1) return;

    let navHtml = `<div class="drop-pagination">`;
    for (let i = 1; i <= totalPages; i++) {
        // Use the global dropPage to mark the active button
        navHtml += `<button class="page-btn ${i === dropPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    navHtml += `</div>`;
    
    $('#paginationAnchor').html(navHtml); 
}

    // --- Event Listeners ---
    $(document).on('click', '.drop-row', function() {
        const itemName = $(this).data('item');
        if (checkedItems[itemName]) delete checkedItems[itemName];
        else checkedItems[itemName] = true;
        
        localStorage.setItem('wf_checked_items', JSON.stringify(checkedItems));
        renderDrops(currentRotation, dropPage);
    });

$(document).on('click', '.page-btn', function() {
    const targetPage = $(this).data('page');
    renderDrops(currentRotation, targetPage);
});

    $('#rotNav').on('click', '.rot-btn', function() {
        $('.rot-btn').removeClass('active');
        $(this).addClass('active');
        renderDrops($(this).data('rot'), 1);
    });

    $('#mainPinBtn').on('click', function() {
        const idx = pinnedMissions.indexOf(activeMissionID);
        idx > -1 ? pinnedMissions.splice(idx, 1) : pinnedMissions.push(activeMissionID);
        localStorage.setItem('wf_pins', JSON.stringify(pinnedMissions));
        updatePinButtonUI();
        renderPinnedList();
    });

    function updatePinButtonUI() {
        const isPinned = pinnedMissions.includes(activeMissionID);
        $('#mainPinBtn').text(isPinned ? '★' : '☆').toggleClass('active', isPinned);
    }

    function renderPinnedList() {
        const $list = $('#pinnedList').empty();
        if (!pinnedMissions.length) {
            $list.html('<div class="empty-pins">Pinned missions appear here.</div>');
            return;
        }
        pinnedMissions.forEach(id => {
            const [planet, mission] = id.split('/');
            const $item = $(`<div class="pinned-item"><span>${mission} <small>(${planet})</small></span><span class="remove-pin">×</span></div>`);
            $item.on('click', (e) => !$(e.target).hasClass('remove-pin') && loadMission(planet, mission));
            $item.find('.remove-pin').on('click', () => {
                pinnedMissions = pinnedMissions.filter(p => p !== id);
                localStorage.setItem('wf_pins', JSON.stringify(pinnedMissions));
                renderPinnedList();
                updatePinButtonUI();
            });
            $list.append($item);
        });
    }

    $('#hideObtained').on('change', () => renderDrops(currentRotation, 1));
    $('#clearPins').on('click', () => {
        if(confirm("Clear all pins?")) { pinnedMissions = []; localStorage.setItem('wf_pins', "[]"); renderPinnedList(); updatePinButtonUI(); }
    });

    init();
});