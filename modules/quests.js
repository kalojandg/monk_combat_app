// ===== Quests Module =====
// Manages quest tracking and CRUD operations

// Quest structure:
// {
//   id: string (unique),
//   objective: string (required),
//   location: string,
//   reward: string,
//   status: 'active' | 'fulfilled',
//   order: number
// }

let editingQuestIndex = null;

// Render quest table
function renderQuests() {
  if (!window.st) {
    console.error('Global state (st) not available');
    return;
  }

  if (!Array.isArray(window.st.quests)) {
    window.st.quests = [];
  }

  const tbody = document.getElementById('questTableBody');
  if (!tbody) {
    console.error('Quest table body element not found');
    return;
  }

  // Sort quests by order
  const quests = [...window.st.quests].sort((a, b) => (a.order || 0) - (b.order || 0));

  if (quests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--muted); padding: 24px;">No quests yet. Click "Add Quest" to create one.</td></tr>';
    return;
  }

  tbody.innerHTML = quests.map((quest, idx) => {
    const statusClass = quest.status === 'fulfilled' ? 'quest-fulfilled' : '';
    const objectiveText = quest.objective || '<em>No objective</em>';
    const locationText = quest.location || '—';
    const rewardText = quest.reward || '—';

    return `
      <tr class="${statusClass}" data-quest-id="${quest.id}" data-quest-index="${idx}">
        <td class="quest-objective">${objectiveText}</td>
        <td class="quest-location">${locationText}</td>
        <td class="quest-reward">${rewardText}</td>
        <td class="quest-actions">
          <button class="quest-edit-btn" data-index="${idx}">Edit</button>
          ${quest.status === 'active'
            ? `<button class="quest-fulfill-btn success" data-index="${idx}">Fulfill</button>`
            : `<button class="quest-unfulfill-btn" data-index="${idx}">Reactivate</button>`}
        </td>
      </tr>
    `;
  }).join('');
}

// Open quest modal
function openQuestModal(editIndex = null) {
  const modal = document.getElementById('questModal');
  const title = document.getElementById('questModalTitle');
  const objectiveInput = document.getElementById('questObjective');
  const locationInput = document.getElementById('questLocation');
  const rewardInput = document.getElementById('questReward');

  if (!modal || !title || !objectiveInput || !locationInput || !rewardInput) {
    console.error('Quest modal elements not found');
    return;
  }

  editingQuestIndex = editIndex;

  if (editIndex !== null && window.st.quests[editIndex]) {
    // Edit mode
    const quest = window.st.quests[editIndex];
    title.textContent = 'Edit Quest';
    objectiveInput.value = quest.objective || '';
    locationInput.value = quest.location || '';
    rewardInput.value = quest.reward || '';
  } else {
    // Add mode
    title.textContent = 'Add Quest';
    objectiveInput.value = '';
    locationInput.value = '';
    rewardInput.value = '';
  }

  modal.classList.remove('hidden');
  objectiveInput.focus();
}

// Close quest modal
function closeQuestModal() {
  const modal = document.getElementById('questModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  editingQuestIndex = null;
}

// Save quest (add or edit)
function saveQuest() {
  const objectiveInput = document.getElementById('questObjective');
  const locationInput = document.getElementById('questLocation');
  const rewardInput = document.getElementById('questReward');

  if (!objectiveInput || !locationInput || !rewardInput) {
    console.error('Quest input elements not found');
    return;
  }

  const objective = objectiveInput.value.trim();
  const location = locationInput.value.trim();
  const reward = rewardInput.value.trim();

  // Validation
  if (!objective) {
    alert('Objective is required.');
    objectiveInput.focus();
    return;
  }

  if (!window.st.quests) {
    window.st.quests = [];
  }

  if (editingQuestIndex !== null) {
    // Edit existing quest
    const quest = window.st.quests[editingQuestIndex];
    quest.objective = objective;
    quest.location = location;
    quest.reward = reward;
  } else {
    // Add new quest
    const newQuest = {
      id: generateQuestId(),
      objective,
      location,
      reward,
      status: 'active',
      order: window.st.quests.length
    };
    window.st.quests.push(newQuest);
  }

  if (typeof window.save === 'function') {
    window.save();
  }

  closeQuestModal();
  renderQuests();
}

// Generate unique quest ID
function generateQuestId() {
  return 'quest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Fulfill quest
function fulfillQuest(index) {
  if (!window.st.quests || !window.st.quests[index]) {
    console.error('Quest not found at index', index);
    return;
  }

  window.st.quests[index].status = 'fulfilled';

  if (typeof window.save === 'function') {
    window.save();
  }

  renderQuests();
}

// Reactivate quest (unfulfill)
function reactivateQuest(index) {
  if (!window.st.quests || !window.st.quests[index]) {
    console.error('Quest not found at index', index);
    return;
  }

  window.st.quests[index].status = 'active';

  if (typeof window.save === 'function') {
    window.save();
  }

  renderQuests();
}

// Attach event listeners
function attachQuestListeners() {
  // Add quest button
  const btnAdd = document.getElementById('btnQuestAdd');
  if (btnAdd) {
    btnAdd.onclick = () => openQuestModal();
  }

  // Modal buttons
  const btnSave = document.getElementById('questSave');
  if (btnSave) {
    btnSave.onclick = saveQuest;
  }

  const btnCancel = document.getElementById('questCancel');
  if (btnCancel) {
    btnCancel.onclick = closeQuestModal;
  }

  // Quest table event delegation (for edit/fulfill buttons)
  const tbody = document.getElementById('questTableBody');
  if (tbody) {
    tbody.onclick = (e) => {
      const target = e.target;

      if (target.classList.contains('quest-edit-btn')) {
        const index = parseInt(target.dataset.index, 10);
        openQuestModal(index);
      }

      if (target.classList.contains('quest-fulfill-btn')) {
        const index = parseInt(target.dataset.index, 10);
        fulfillQuest(index);
      }

      if (target.classList.contains('quest-unfulfill-btn')) {
        const index = parseInt(target.dataset.index, 10);
        reactivateQuest(index);
      }
    };
  }

  // Close modal on backdrop click
  const modal = document.getElementById('questModal');
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeQuestModal();
      }
    };
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('questModal');
      if (modal && !modal.classList.contains('hidden')) {
        closeQuestModal();
      }
    }
  });
}

// Store Sortable instance to prevent duplicate initialization
let questSortableInstance = null;

// Initialize drag-and-drop (will be implemented after SortableJS is added)
function initQuestDragAndDrop() {
  const tbody = document.getElementById('questTableBody');
  if (!tbody || typeof Sortable === 'undefined') {
    console.warn('Sortable.js not loaded or tbody not found');
    return;
  }

  // Destroy existing instance if any
  if (questSortableInstance) {
    questSortableInstance.destroy();
  }

  questSortableInstance = Sortable.create(tbody, {
    animation: 150,
    handle: 'tr', // Entire row is draggable
    ghostClass: 'quest-dragging',
    onEnd: function(evt) {
      // Get the current sorted quests (by order field)
      const sortedQuests = [...window.st.quests].sort((a, b) => (a.order || 0) - (b.order || 0));

      // Reorder based on the drag operation
      const movedQuest = sortedQuests.splice(evt.oldIndex, 1)[0];
      sortedQuests.splice(evt.newIndex, 0, movedQuest);

      // Update order property for all quests to match new positions
      sortedQuests.forEach((quest, idx) => {
        quest.order = idx;
      });

      // Update state
      window.st.quests = sortedQuests;

      // Save to localStorage immediately
      if (typeof window.save === 'function') {
        window.save();
      }

      // Note: We don't need to re-render or re-init drag-and-drop
      // because SortableJS already updated the DOM order
    }
  });
}

// Export functions to global scope
window.renderQuests = renderQuests;
window.attachQuestListeners = attachQuestListeners;
window.initQuestDragAndDrop = initQuestDragAndDrop;
window.openQuestModal = openQuestModal;
window.closeQuestModal = closeQuestModal;
window.saveQuest = saveQuest;
window.fulfillQuest = fulfillQuest;
window.reactivateQuest = reactivateQuest;
