document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 元素 ---
  const listView = document.getElementById('list-view');
  const editorView = document.getElementById('editor-view');
  const noteList = document.getElementById('note-list');
  const listTitle = document.getElementById('list-title');
  const emptyMsg = document.getElementById('empty-msg');
  const noteArea = document.getElementById('note-area');
  const status = document.getElementById('status');
  
  // 按鈕
  const addBtn = document.getElementById('add-btn');
  const backBtn = document.getElementById('back-btn');
  const deleteBtn = document.getElementById('delete-btn');
  const restoreBtn = document.getElementById('restore-btn');
  const trashToggleBtn = document.getElementById('trash-toggle-btn');
  const settingsBtn = document.getElementById('settings-btn');

  // 設定面板 DOM
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const fontSizeSlider = document.getElementById('font-size-slider');
  const fontSizeDisplay = document.getElementById('font-size-display');
  const widthSelect = document.getElementById('width-select');
  const openIntroBtn = document.getElementById('open-intro-btn'); // 更改變數名稱
  const themeBtns = document.querySelectorAll('.theme-btn');

  // 彈窗與選單 DOM
  const modalOverlay = document.getElementById('modal-overlay');
  const modalBox = document.querySelector('.modal-box');
  const modalMsg = document.getElementById('modal-msg');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const contextMenu = document.getElementById('context-menu');
  const menuPinBtn = document.getElementById('menu-pin-btn');
  const menuDeleteBtn = document.getElementById('menu-delete-btn');

  // --- 狀態變數 ---
  let notes = [];
  let currentNoteId = null;
  let menuTargetNoteId = null;
  let currentView = 'active';

  // 預設設定
  let userSettings = {
    theme: 'default',
    fontSize: '14',
    width: '320px'
  };

  // --- 全域點擊 ---
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-trigger') && !e.target.closest('#context-menu')) {
      if(contextMenu) contextMenu.classList.add('hidden');
    }
  });

  // --- 初始化 ---
  loadSettings();
  loadNotes();

  // --- 設定功能邏輯 ---

  function loadSettings() {
    chrome.storage.sync.get(['settings'], (result) => {
      if (result.settings) {
        userSettings = { ...userSettings, ...result.settings };
      }
      applySettings();
      updateSettingsUI();
    });
  }

  function applySettings() {
    document.body.setAttribute('data-theme', userSettings.theme);
    document.documentElement.style.setProperty('--font-size', userSettings.fontSize + 'px');
    document.body.style.width = userSettings.width;
  }

  function updateSettingsUI() {
    if(fontSizeSlider) {
        fontSizeSlider.value = userSettings.fontSize;
        fontSizeDisplay.innerText = userSettings.fontSize + 'px';
    }
    if(widthSelect) widthSelect.value = userSettings.width;
  }

  function saveSettings() {
    chrome.storage.sync.set({ settings: userSettings });
    applySettings();
  }

  if(settingsBtn) settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
  if(closeSettingsBtn) closeSettingsBtn.onclick = () => settingsModal.classList.add('hidden');

  themeBtns.forEach(btn => {
    btn.onclick = () => {
      userSettings.theme = btn.getAttribute('data-theme');
      saveSettings();
    };
  });

  if(fontSizeSlider) {
      fontSizeSlider.oninput = () => {
        userSettings.fontSize = fontSizeSlider.value;
        fontSizeDisplay.innerText = fontSizeSlider.value + 'px';
        saveSettings();
      };
  }

  if(widthSelect) {
      widthSelect.onchange = () => {
        userSettings.width = widthSelect.value;
        saveSettings();
      };
  }

  // 【更改】打開介紹頁面
  if(openIntroBtn) {
    openIntroBtn.onclick = () => {
        chrome.tabs.create({ url: 'intro.html' });
      };
  }

  // --- 筆記核心邏輯 ---

  function loadNotes() {
    chrome.storage.sync.get(['notes'], (result) => {
      notes = result.notes || [];
      renderList();
    });
  }

  function renderList() {
    if (!noteList) return;
    noteList.innerHTML = '';
    
    let filteredNotes = notes.filter(n => {
      const isDeleted = !!n.isDeleted; 
      return currentView === 'active' ? !isDeleted : isDeleted;
    });

    if (listTitle) {
        if (currentView === 'active') {
        listTitle.innerText = "我的筆記";
        if(trashToggleBtn) {
            trashToggleBtn.innerText = "🗑️";
            trashToggleBtn.title = "查看垃圾桶";
        }
        if(addBtn) addBtn.classList.remove('hidden');
        } else {
        listTitle.innerText = "垃圾桶";
        if(trashToggleBtn) {
            trashToggleBtn.innerText = "🏠";
            trashToggleBtn.title = "返回筆記列表";
        }
        if(addBtn) addBtn.classList.add('hidden');
        }
    }

    filteredNotes.sort((a, b) => {
      if (currentView === 'active') {
        const pinA = a.isPinned ? 1 : 0;
        const pinB = b.isPinned ? 1 : 0;
        if (pinA !== pinB) return pinB - pinA;
      }
      return b.updatedAt - a.updatedAt;
    });

    if (filteredNotes.length === 0) {
      emptyMsg.classList.remove('hidden');
      emptyMsg.innerText = currentView === 'active' ? "無筆記" : "空";
    } else {
      emptyMsg.classList.add('hidden');
      filteredNotes.forEach(note => {
        const li = document.createElement('li');
        const titleText = note.content.split('\n')[0].trim() || '未命名筆記';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'note-title-span';
        
        if (note.isPinned && currentView === 'active') {
          li.classList.add('pinned');
          titleSpan.innerHTML = `${escapeHtml(titleText)} <span class="pin-icon">📌</span>`;
        } else {
          titleSpan.innerText = titleText;
        }

        li.appendChild(titleSpan);

        if (currentView === 'active') {
          const menuBtn = document.createElement('button');
          menuBtn.className = 'menu-trigger';
          menuBtn.innerText = '⋮';
          menuBtn.onclick = (e) => {
            e.stopPropagation();
            showContextMenu(e.target, note);
          };
          li.appendChild(menuBtn);
        }

        li.onclick = () => openEditor(note.id);
        noteList.appendChild(li);
      });
    }
  }

  function showContextMenu(buttonElement, note) {
    if(!contextMenu) return;
    menuTargetNoteId = note.id;
    if(menuPinBtn) menuPinBtn.innerText = note.isPinned ? '🚫 取消置頂' : '📌 置頂筆記';
    const rect = buttonElement.getBoundingClientRect();
    contextMenu.style.top = `${rect.bottom}px`;
    const rightDistance = window.innerWidth - rect.right;
    contextMenu.style.right = `${rightDistance}px`;
    contextMenu.style.left = 'auto'; 
    contextMenu.classList.remove('hidden');
  }

  if(menuPinBtn) {
      menuPinBtn.onclick = () => {
        contextMenu.classList.add('hidden');
        if (menuTargetNoteId) togglePin(menuTargetNoteId);
      };
  }

  if(menuDeleteBtn) {
      menuDeleteBtn.onclick = () => {
        contextMenu.classList.add('hidden');
        if (menuTargetNoteId) {
          currentNoteId = menuTargetNoteId;
          deleteCurrentNoteConfirm();
        }
      };
  }

  function togglePin(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
      note.isPinned = !note.isPinned;
      saveData();
      renderList();
    }
  }

  function openEditor(id) {
    currentNoteId = id;
    const note = notes.find(n => n.id === id);
    if (!note) return;

    noteArea.value = note.content;
    
    if (currentView === 'active') {
      if(restoreBtn) restoreBtn.classList.add('hidden');
      if(deleteBtn) deleteBtn.title = "移至垃圾桶";
      noteArea.disabled = false;
    } else {
      if(restoreBtn) restoreBtn.classList.remove('hidden');
      if(deleteBtn) deleteBtn.title = "永久刪除";
      noteArea.disabled = true;
    }

    listView.classList.add('hidden');
    editorView.classList.remove('hidden');
  }

  if(trashToggleBtn) {
      trashToggleBtn.onclick = () => {
        currentView = currentView === 'active' ? 'trash' : 'active';
        renderList();
      };
  }

  if(backBtn) {
      backBtn.onclick = () => {
        renderList();
        editorView.classList.add('hidden');
        listView.classList.remove('hidden');
      };
  }

  if(addBtn) {
      addBtn.onclick = () => {
        const newNote = { id: Date.now(), content: '', updatedAt: Date.now(), isPinned: false, isDeleted: false };
        notes.push(newNote);
        currentView = 'active'; 
        openEditor(newNote.id);
      };
  }

  function deleteCurrentNoteConfirm() {
    const noteIndex = notes.findIndex(n => n.id === currentNoteId);
    if (noteIndex === -1) return;

    if (currentView === 'active') {
      showCustomModal('移至垃圾桶？', 'confirm', () => {
        notes[noteIndex].isDeleted = true;
        notes[noteIndex].isPinned = false;
        saveData();
        if (!editorView.classList.contains('hidden')) backBtn.click();
        else renderList();
      });
    } else {
      showCustomModal('永久刪除？', 'confirm', () => {
        notes.splice(noteIndex, 1);
        saveData();
        if (!editorView.classList.contains('hidden')) backBtn.click();
        else renderList();
      });
    }
  }

  if(deleteBtn) deleteBtn.onclick = deleteCurrentNoteConfirm;

  if(restoreBtn) {
      restoreBtn.onclick = () => {
        const note = notes.find(n => n.id === currentNoteId);
        if (note) {
          note.isDeleted = false;
          saveData();
          showCustomModal('已還原', 'alert', () => { backBtn.click(); });
        }
      };
  }

  noteArea.addEventListener('input', () => {
    if (currentView !== 'active') return;
    const content = noteArea.value;
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
      note.content = content;
      note.updatedAt = Date.now();
      saveData();
      showStatus();
    }
  });

  function showCustomModal(message, type, onConfirmCallback) {
    modalMsg.innerText = message;
    modalConfirmBtn.className = 'modal-btn confirm'; 
    modalCancelBtn.className = 'modal-btn cancel';
    if (type === 'alert') {
      modalBox.classList.add('alert');
      modalConfirmBtn.innerText = "好的";
    } else {
      modalBox.classList.remove('alert');
      modalConfirmBtn.innerText = "確定";
    }
    modalOverlay.classList.remove('hidden');
    modalConfirmBtn.onclick = () => { closeModal(); if (onConfirmCallback) onConfirmCallback(); };
    modalCancelBtn.onclick = () => closeModal();
  }

  function closeModal() { modalOverlay.classList.add('hidden'); }
  modalOverlay.onclick = (e) => { if (e.target === modalOverlay && !modalBox.classList.contains('alert')) closeModal(); };
  function saveData() { chrome.storage.sync.set({ notes: notes }); }
  function showStatus() { status.style.opacity = "1"; setTimeout(() => { status.style.opacity = "0"; }, 1000); }
  function escapeHtml(text) { if (!text) return text; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
});