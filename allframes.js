(() => {
  const STORAGE_KEY = 'wf_frames_codex_entries_v1';
  const listEl = document.getElementById('framesList');

  const defaultFrames = [
    {
      id: 'excalibur',
      name: 'Excalibur',
      role: 'Balanced Starter',
      acquisition: 'Mars (War boss fight)',
      mission: 'War (Assassination)',
      focus: 'Melee burst + crowd control',
      notes: 'Great baseline frame to compare others against.'
    },
    {
      id: 'volt',
      name: 'Volt',
      role: 'Speed / Utility',
      acquisition: 'Clan Dojo (Tenno Lab)',
      mission: 'N/A (Clan Research)',
      focus: 'Team speed, shield play, electric damage',
      notes: 'Common pick for fast farming and Eidolon roles.'
    },
    {
      id: 'rhino',
      name: 'Rhino',
      role: 'Tank / Team Buff',
      acquisition: 'Venus (Fossa boss fight)',
      mission: 'Fossa, Venus (Jackal Assassination)',
      focus: 'Survivability + damage buffing',
      notes: 'Beginner-friendly and useful all the way into endgame.'
    }
  ];

  function normalizeFrame(frame) {
    return {
      ...frame,
      mission: (frame.mission || '').trim()
    };
  }

  function readFrames() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved) || !saved.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultFrames));
      return defaultFrames;
    }
    return saved.map(normalizeFrame);
  }

  function render() {
    const frames = readFrames();

    listEl.innerHTML = frames.map((frame) => `
      <article class="frame-card">
        <h2>${frame.name}</h2>
        <p class="frame-role">${frame.role}</p>
        <ul>
          <li><strong>Acquisition:</strong> ${frame.acquisition}</li>
          <li><strong>Mission:</strong> ${frame.mission || 'Mission not set yet'}</li>
          <li><strong>Focus:</strong> ${frame.focus}</li>
          <li><strong>Codex Notes:</strong> ${frame.notes}</li>
        </ul>
      </article>
    `).join('');
  }

  render();
})();
