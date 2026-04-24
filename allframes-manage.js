(() => {
  const STORAGE_KEY = 'wf_frames_codex_entries_v1';

  const defaultFrames = [
    {
      id: 'excalibur',
      name: 'Excalibur',
      role: 'Balanced Starter',
      acquisition: 'Mars (War boss fight)',
      focus: 'Melee burst + crowd control',
      notes: 'Great baseline frame to compare others against.'
    },
    {
      id: 'volt',
      name: 'Volt',
      role: 'Speed / Utility',
      acquisition: 'Clan Dojo (Tenno Lab)',
      focus: 'Team speed, shield play, electric damage',
      notes: 'Common pick for fast farming and Eidolon roles.'
    },
    {
      id: 'rhino',
      name: 'Rhino',
      role: 'Tank / Team Buff',
      acquisition: 'Venus (Fossa boss fight)',
      focus: 'Survivability + damage buffing',
      notes: 'Beginner-friendly and useful all the way into endgame.'
    }
  ];

  const frameForm = document.getElementById('frameForm');
  const formTitle = document.getElementById('formTitle');
  const manageTableWrap = document.getElementById('manageTableWrap');
  const cancelEditBtn = document.getElementById('cancelEdit');

  const fields = {
    id: document.getElementById('frameId'),
    name: document.getElementById('frameName'),
    role: document.getElementById('frameRole'),
    acquisition: document.getElementById('frameAcquisition'),
    focus: document.getElementById('frameFocus'),
    notes: document.getElementById('frameNotes')
  };

  function createId(name) {
    return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  }

  function readFrames() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved) || !saved.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultFrames));
      return [...defaultFrames];
    }
    return saved;
  }

  function writeFrames(frames) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(frames));
  }

  function clearForm() {
    frameForm.reset();
    fields.id.value = '';
    formTitle.textContent = 'Add a frame';
  }

  function renderTable() {
    const frames = readFrames();

    if (!frames.length) {
      manageTableWrap.innerHTML = '<p>No entries yet.</p>';
      return;
    }

    manageTableWrap.innerHTML = `
      <table class="manage-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Acquisition</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${frames.map((frame) => `
            <tr>
              <td>${frame.name}</td>
              <td>${frame.role}</td>
              <td>${frame.acquisition}</td>
              <td>
                <button class="secondary-btn" data-action="edit" data-id="${frame.id}">Edit</button>
                <button class="secondary-btn" data-action="delete" data-id="${frame.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function loadIntoForm(frame) {
    fields.id.value = frame.id;
    fields.name.value = frame.name;
    fields.role.value = frame.role;
    fields.acquisition.value = frame.acquisition;
    fields.focus.value = frame.focus;
    fields.notes.value = frame.notes;
    formTitle.textContent = `Edit ${frame.name}`;
  }

  frameForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const frames = readFrames();
    const payload = {
      id: fields.id.value || createId(fields.name.value),
      name: fields.name.value.trim(),
      role: fields.role.value.trim(),
      acquisition: fields.acquisition.value.trim(),
      focus: fields.focus.value.trim(),
      notes: fields.notes.value.trim()
    };

    const existingIndex = frames.findIndex((frame) => frame.id === payload.id);
    if (existingIndex >= 0) {
      frames[existingIndex] = payload;
    } else {
      frames.push(payload);
    }

    writeFrames(frames);
    clearForm();
    renderTable();
  });

  cancelEditBtn.addEventListener('click', clearForm);

  manageTableWrap.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');

    const frames = readFrames();
    const selected = frames.find((frame) => frame.id === id);

    if (!selected) return;

    if (action === 'edit') {
      loadIntoForm(selected);
      return;
    }

    if (action === 'delete') {
      const nextFrames = frames.filter((frame) => frame.id !== id);
      writeFrames(nextFrames);
      if (fields.id.value === id) clearForm();
      renderTable();
    }
  });

  clearForm();
  renderTable();
})();
