/* ==========================================
   app.js — 应用主入口、路由、交互
   ========================================== */

const App = (() => {
  // --- DOM 引用 ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // 页面
  let welcomePage, recordPage, trendPage, calendarPage, mePage;
  // 组件
  let tabBar, overlay;
  let recordSheet, personSheet, personSelectSheet, dateDetailSheet;
  let confirmDialog, toast;

  // 状态
  let editingPersonId = null;
  let editingRecordId = null;
  let selectedColor = '#D9413B';
  let selectedUnit = 'kg';
  let selectedType = 'morning'; // 'morning' | 'evening'
  let currentTab = 'record';
  let trendInited = false;
  let calendarInited = false;

  // --- 初始化 ---
  function init() {
    cacheDom();
    bindEvents();

    const hasData = Store.hasData();
    if (hasData) {
      const person = Store.getCurrentPerson();
      if (person) {
        Store.setCurrentPersonId(person.id);
        showApp();
      } else {
        showWelcome();
      }
    } else {
      showWelcome();
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  function cacheDom() {
    welcomePage = $('#welcome-page');
    recordPage = $('#record-page');
    trendPage = $('#trend-page');
    calendarPage = $('#calendar-page');
    mePage = $('#me-page');
    tabBar = $('#tab-bar');
    overlay = $('#overlay');
    recordSheet = $('#record-sheet');
    personSheet = $('#person-sheet');
    personSelectSheet = $('#person-select-sheet');
    dateDetailSheet = $('#date-detail-sheet');
    confirmDialog = $('#confirm-dialog');
    toast = $('#toast');
  }

  // --- 事件绑定 ---
  function bindEvents() {
    // 欢迎页
    $('#welcome-add-btn').addEventListener('click', () => openPersonSheet(null));

    // Tab 切换
    $$('.tab-item').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 人物选择器（记录页和趋势页）
    ['#person-selector', '#trend-person-selector'].forEach(sel => {
      const el = $(sel);
      if (el) el.addEventListener('click', openPersonSelectSheet);
    });

    // 记录按钮
    $('#record-btn').addEventListener('click', () => openRecordSheet(null, null));

    // 记录弹窗
    $('#record-cancel').addEventListener('click', closeRecordSheet);
    $('#record-save').addEventListener('click', saveRecord);
    $('#weight-input').addEventListener('input', onWeightInput);

    // 早晚类型切换
    $$('#type-toggle .type-option').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedType = btn.dataset.type;
        $$('#type-toggle .type-option').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        checkRecordExists();
      });
    });

    // 日期变化时检查是否已有记录
    $('#record-date').addEventListener('change', checkRecordExists);

    // 人物弹窗
    $('#person-cancel').addEventListener('click', closePersonSheet);
    $('#person-save').addEventListener('click', savePerson);
    $('#delete-person-btn').addEventListener('click', deletePerson);

    // 颜色选择
    $('#color-picker').addEventListener('click', (e) => {
      if (e.target.classList.contains('color-option')) {
        selectColor(e.target.dataset.color);
      }
    });

    // 单位切换
    $$('.unit-option').forEach(btn => {
      btn.addEventListener('click', () => selectUnit(btn.dataset.unit));
    });

    // 人物选择浮层
    $('#select-cancel').addEventListener('click', closePersonSelectSheet);

    // 我的页
    $('#add-person-btn').addEventListener('click', () => openPersonSheet(null));
    $('#export-btn').addEventListener('click', exportData);
    $('#import-btn').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', importData);
    $('#clear-btn').addEventListener('click', () => showConfirm('确定要清除所有数据吗？此操作不可恢复。', () => {
      Store.clearAll();
      showToast('数据已清除');
      showWelcome();
    }));

    // 日期详情弹窗
    $('#detail-close').addEventListener('click', closeDateDetailSheet);
    $('#detail-add-record').addEventListener('click', () => {
      const date = dateDetailSheet._date;
      closeDateDetailSheet();
      openRecordSheet(date, 'morning');
    });

    // 确认弹窗
    $('#confirm-cancel').addEventListener('click', closeConfirm);
    $('#confirm-ok').addEventListener('click', confirmOk);

    // 遮罩层
    overlay.addEventListener('click', closeAllSheets);

    // 月份导航
    $('#month-prev').addEventListener('click', () => Calendar.goToPrevMonth());
    $('#month-next').addEventListener('click', () => Calendar.goToNextMonth());

    // 趋势时间范围
    $$('.range-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.range-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTrend();
      });
    });
  }

  // --- 显示/隐藏 ---

  function showWelcome() {
    welcomePage.classList.remove('hidden');
    recordPage.classList.add('hidden');
    trendPage.classList.add('hidden');
    calendarPage.classList.add('hidden');
    mePage.classList.add('hidden');
    tabBar.classList.add('hidden');
  }

  function showApp() {
    welcomePage.classList.add('hidden');
    tabBar.classList.remove('hidden');
    switchTab('record');
  }

  function switchTab(tab) {
    currentTab = tab;
    [recordPage, trendPage, calendarPage, mePage].forEach(p => p.classList.add('hidden'));

    $$('.tab-item').forEach(b => b.classList.remove('active'));
    const activeBtn = $(`.tab-item[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    switch (tab) {
      case 'record':
        recordPage.classList.remove('hidden');
        renderRecordPage();
        break;
      case 'trend':
        trendPage.classList.remove('hidden');
        renderTrendPage();
        break;
      case 'calendar':
        calendarPage.classList.remove('hidden');
        renderCalendarPage();
        break;
      case 'me':
        mePage.classList.remove('hidden');
        renderMePage();
        break;
    }
  }

  // --- Toast ---
  let toastTimer;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2000);
  }

  // --- 确认弹窗 ---
  let confirmCallback = null;

  function showConfirm(msg, cb) {
    $('#confirm-message').textContent = msg;
    confirmDialog.classList.remove('hidden');
    confirmCallback = cb;
  }

  function closeConfirm() {
    confirmDialog.classList.add('hidden');
    confirmCallback = null;
  }

  function confirmOk() {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  }

  // --- Sheet 通用 ---
  function openSheet(sheet) {
    overlay.classList.remove('hidden');
    sheet.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet(sheet) {
    overlay.classList.add('hidden');
    sheet.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function closeAllSheets() {
    [recordSheet, personSheet, personSelectSheet, dateDetailSheet].forEach(s => {
      if (!s.classList.contains('hidden')) closeSheet(s);
    });
  }

  // --- 人物管理 ---

  function openPersonSheet(personId) {
    editingPersonId = personId;

    if (personId) {
      const p = Store.getPerson(personId);
      if (!p) return;
      $('#person-sheet-title').textContent = '编辑人物';
      $('#person-name-input').value = p.name;
      $('#person-height-input').value = p.height || '';
      $('#person-target-input').value = p.targetWeight || '';
      selectedColor = p.color;
      selectedUnit = p.unit;
      $('#delete-person-btn').classList.remove('hidden');
    } else {
      $('#person-sheet-title').textContent = '添加人物';
      $('#person-name-input').value = '';
      $('#person-height-input').value = '';
      $('#person-target-input').value = '';
      selectedColor = '#D9413B';
      selectedUnit = 'kg';
      $('#delete-person-btn').classList.add('hidden');
    }

    renderColorPicker();
    renderUnitToggle();
    openSheet(personSheet);
    setTimeout(() => $('#person-name-input').focus(), 300);
  }

  function closePersonSheet() {
    closeSheet(personSheet);
    editingPersonId = null;
  }

  function savePerson() {
    const name = $('#person-name-input').value.trim();
    if (!name) {
      showToast('请输入名字');
      return;
    }

    const data = {
      name,
      color: selectedColor,
      avatarColor: selectedColor,
      height: parseFloat($('#person-height-input').value) || null,
      targetWeight: parseFloat($('#person-target-input').value) || null,
      unit: selectedUnit,
    };

    if (editingPersonId) {
      Store.updatePerson(editingPersonId, data);
      showToast('人物已更新');
    } else {
      const person = Store.addPerson(data);
      Store.setCurrentPersonId(person.id);
      showToast('人物已添加');
    }

    closePersonSheet();

    if (!welcomePage.classList.contains('hidden')) {
      showApp();
    } else {
      refreshAll();
    }
  }

  function deletePerson() {
    if (!editingPersonId) return;
    const person = Store.getPerson(editingPersonId);
    if (!person) return;

    showConfirm(`确定要删除"${person.name}"的所有记录吗？此操作不可恢复。`, () => {
      Store.deletePerson(editingPersonId);
      closePersonSheet();
      showToast('人物已删除');

      if (!Store.hasData()) {
        showWelcome();
      } else {
        refreshAll();
      }
    });
  }

  // --- 马蒂斯配色 ---
  const MATISSE_COLORS = [
    '#D9413B', // 红
    '#2565A6', // 蓝
    '#E5A024', // 金
    '#3D8B5E', // 绿
    '#E07030', // 橙
    '#7B4BA0', // 紫
    '#1A7A7A', // 青
    '#C94D7B', // 玫红
  ];

  function renderColorPicker() {
    let html = '';
    MATISSE_COLORS.forEach(c => {
      const cls = c === selectedColor ? 'color-option selected' : 'color-option';
      html += `<div class="${cls}" style="background:${c}" data-color="${c}"></div>`;
    });
    $('#color-picker').innerHTML = html;
  }

  function selectColor(color) {
    selectedColor = color;
    renderColorPicker();
  }

  function renderUnitToggle() {
    $$('.unit-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.unit === selectedUnit);
    });
  }

  function selectUnit(unit) {
    selectedUnit = unit;
    renderUnitToggle();
  }

  // --- 人物选择浮层 ---

  function openPersonSelectSheet() {
    const persons = Store.getPersons();
    const currentId = Store.getCurrentPersonId();
    let html = '';
    persons.forEach(p => {
      const isCurrent = p.id === currentId;
      html += `
        <div class="person-select-item ${isCurrent ? 'current' : ''}" data-person-id="${p.id}">
          <div class="person-avatar" style="background:${p.avatarColor || p.color}">${p.name.charAt(0)}</div>
          <span class="person-name" style="font-size:16px">${p.name}</span>
          ${isCurrent ? '<span class="check-mark">✓</span>' : ''}
        </div>`;
    });
    $('#person-select-list').innerHTML = html;

    $$('#person-select-list .person-select-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.personId;
        Store.setCurrentPersonId(id);
        closePersonSelectSheet();
        refreshAll();
      });
    });

    openSheet(personSelectSheet);
  }

  function closePersonSelectSheet() {
    closeSheet(personSelectSheet);
  }

  // --- 记录页 ---

  function renderRecordPage() {
    const person = Store.getCurrentPerson();
    if (!person) return;

    updatePersonHeader(person);

    // 获取最新早上记录
    const latest = Store.getLatestMorningRecord(person.id);
    const unit = person.unit;

    if (latest) {
      $('#latest-weight').textContent = formatWeightNum(latest.weight, unit);
      $('#latest-weight').style.color = person.color;
      $('#latest-date').textContent = formatDate(latest.date);

      // 与前一天早上变化
      const prev = Store.getPreviousMorningRecord(person.id, latest);
      if (prev) {
        const diff = diffText(latest.weight, prev.weight, unit);
        $('#latest-diff').textContent = diff.text;
        $('#latest-diff').style.color = diff.color;
        $('#latest-diff').classList.remove('hidden');
      } else {
        $('#latest-diff').classList.add('hidden');
      }

      // 今日状态
      renderTodayStatus(person);

      // BMI
      renderBmiCard(person, latest);

      // 目标进度
      renderGoalCard(person, latest);
    } else {
      $('#latest-weight').textContent = '--';
      $('#latest-weight').style.color = 'var(--text)';
      $('#latest-date').textContent = '还没有记录';
      $('#latest-diff').classList.add('hidden');
      $('#bmi-card').classList.add('hidden');
      $('#goal-card').classList.add('hidden');
      $('#today-status').innerHTML = '<div style="text-align:center;color:var(--text-secondary)">开始记录吧 ✨</div>';
    }

    // 记录按钮颜色
    $('#record-btn').style.background = person.color;
  }

  function updatePersonHeader(person) {
    [
      ['#current-avatar', '#current-name'],
      ['#trend-avatar', '#trend-name'],
    ].forEach(([avatarSel, nameSel]) => {
      const avatar = $(avatarSel);
      const name = $(nameSel);
      if (avatar) {
        avatar.style.background = person.avatarColor || person.color;
        avatar.textContent = person.name.charAt(0);
      }
      if (name) name.textContent = person.name;
    });
  }

  function renderTodayStatus(person) {
    const todayStr = today();
    const todayRecords = Store.getRecordsByDate(person.id, todayStr);
    const morning = todayRecords.find(r => r.type === 'morning');
    const evening = todayRecords.find(r => r.type === 'evening');

    let html = '<div class="today-status-row">';
    if (morning) {
      html += `<div class="today-status-item done"><span class="status-emoji">☀️</span> 早晨 ${formatWeightNum(morning.weight, person.unit)} ${person.unit}</div>`;
    } else {
      html += '<div class="today-status-item"><span class="status-emoji">☀️</span> 早晨 未记录</div>';
    }
    if (evening) {
      html += `<div class="today-status-item done"><span class="status-emoji">🌙</span> 晚上 ${formatWeightNum(evening.weight, person.unit)} ${person.unit}</div>`;
    } else {
      html += '<div class="today-status-item"><span class="status-emoji">🌙</span> 晚上 未记录</div>';
    }
    html += '</div>';

    $('#today-status').innerHTML = html;
  }

  function renderBmiCard(person, latest) {
    if (person.height && person.height > 0) {
      const bmi = calculateBMI(latest.weight, person.height);
      $('#bmi-card').classList.remove('hidden');
      $('#bmi-number').textContent = bmi !== null ? bmi : '--';
      $('#bmi-status').textContent = bmiStatus(bmi);
      const pos = bmiPosition(bmi);
      $('#bmi-dot').style.left = pos + '%';
      $('#bmi-dot').style.background = person.color;
    } else {
      $('#bmi-card').classList.add('hidden');
    }
  }

  function renderGoalCard(person, latest) {
    if (person.targetWeight && person.targetWeight > 0) {
      const earliest = Store.getEarliestMorningRecord(person.id);
      const startWeight = earliest ? earliest.weight : latest.weight;
      const current = latest.weight;
      const target = person.targetWeight;
      const unit = person.unit;

      const totalDiff = Math.abs(startWeight - target);
      const doneDiff = Math.abs(startWeight - current);
      let percent = totalDiff > 0 ? Math.min(100, Math.round((doneDiff / totalDiff) * 100)) : 0;

      const goingDown = target < startWeight;
      const isRightDirection = goingDown ? current <= startWeight : current >= startWeight;
      if (!isRightDirection) percent = 0;

      $('#goal-card').classList.remove('hidden');
      $('#goal-info').textContent = `目标 ${formatWeightNum(target, unit)} ${unit}，当前 ${formatWeightNum(current, unit)} ${unit}`;
      $('#goal-bar-fill').style.width = percent + '%';
      $('#goal-bar-fill').style.background = person.color;
      $('#goal-percent').textContent = percent + '%';
    } else {
      $('#goal-card').classList.add('hidden');
    }
  }

  // --- 记录体重弹窗 ---

  function openRecordSheet(date, type) {
    const person = Store.getCurrentPerson();
    if (!person) return;

    editingRecordId = null;
    const useDate = date || today();
    selectedType = type || 'morning';

    $('#weight-input').value = '';
    $('#weight-convert').textContent = '';
    $('#record-time').value = nowTime();
    $('#record-note').value = '';
    $('#record-date').value = useDate;
    $('#weight-unit').textContent = person.unit;

    // 更新早晚选择 UI
    $$('#type-toggle .type-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === selectedType);
    });

    // 检查该日期+类型是否已有记录
    checkRecordExists();

    openSheet(recordSheet);
    setTimeout(() => $('#weight-input').focus(), 300);
  }

  function checkRecordExists() {
    const person = Store.getCurrentPerson();
    if (!person) return;

    const date = $('#record-date').value || today();
    const records = Store.getRecordsByDate(person.id, date)
      .filter(r => r.type === selectedType);

    if (records.length > 0) {
      const r = records[0];
      $('#record-exists-tip').classList.remove('hidden');
      const weightVal = person.unit === '斤' ? kgToJin(r.weight) : r.weight;
      $('#weight-input').value = weightVal;
      $('#record-time').value = r.time;
      $('#record-note').value = r.note || '';
      editingRecordId = r.id;
      onWeightInput();
    } else {
      $('#record-exists-tip').classList.add('hidden');
      if (!editingRecordId) {
        $('#weight-input').value = '';
        $('#record-note').value = '';
      }
      editingRecordId = null;
    }
  }

  function closeRecordSheet() {
    closeSheet(recordSheet);
    editingRecordId = null;
  }

  function onWeightInput() {
    const person = Store.getCurrentPerson();
    if (!person) return;
    const val = parseFloat($('#weight-input').value);
    if (isNaN(val) || val <= 0) {
      $('#weight-convert').textContent = '';
      return;
    }
    if (person.unit === '斤') {
      const kg = jinToKg(val);
      $('#weight-convert').textContent = `≈ ${kg.toFixed(2)} kg`;
    } else {
      const jin = kgToJin(val);
      $('#weight-convert').textContent = `≈ ${jin} 斤`;
    }
  }

  function saveRecord() {
    const person = Store.getCurrentPerson();
    if (!person) return;

    let weight = parseFloat($('#weight-input').value);
    if (isNaN(weight) || weight <= 0) {
      showToast('请输入有效体重');
      return;
    }

    if (person.unit === '斤') {
      weight = jinToKg(weight);
    }

    const data = {
      personId: person.id,
      weight,
      type: selectedType,
      date: $('#record-date').value || today(),
      time: $('#record-time').value || nowTime(),
      note: $('#record-note').value.trim(),
    };

    if (editingRecordId) {
      Store.updateRecord(editingRecordId, data);
      showToast('记录已更新');
    } else {
      Store.addRecord(data);
      showToast('记录已保存');
    }

    closeRecordSheet();
    renderRecordPage();
  }

  // --- 趋势页 ---

  function renderTrendPage() {
    const person = Store.getCurrentPerson();
    if (!person) return;
    updatePersonHeader(person);

    if (!trendInited) {
      WeightChart.init($('#weight-chart'), $('#chart-container'));
      trendInited = true;
    }

    renderTrend();
  }

  function renderTrend() {
    const person = Store.getCurrentPerson();
    if (!person) return;

    const activeRange = $('.range-tab.active');
    const days = activeRange ? activeRange.dataset.range : '7';

    // 只取早上记录
    let records = Store.getRecords(person.id).filter(r => r.type === 'morning');
    records.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    if (days !== 'all') {
      const startDate = getStartDate(parseInt(days));
      records = records.filter(r => r.date >= startDate);
    }

    // 同一日期取最后一条早上记录
    const dateMap = {};
    records.forEach(r => { dateMap[r.date] = r; });
    const filtered = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    const chartCanvas = $('#weight-chart');
    const emptyHint = $('#chart-empty');

    if (filtered.length < 2) {
      chartCanvas.classList.add('hidden');
      emptyHint.classList.remove('hidden');
    } else {
      chartCanvas.classList.remove('hidden');
      emptyHint.classList.add('hidden');
    }

    const points = filtered.map((r, i) => ({
      index: i,
      date: r.date,
      weight: r.weight,
    }));

    WeightChart.setData(points, person.color, person.unit);

    // 统计
    const values = filtered.map(r => r.weight);
    if (values.length > 0) {
      const unit = person.unit;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      $('#stat-max').textContent = formatWeightNum(max, unit) + ' ' + unit;
      $('#stat-min').textContent = formatWeightNum(min, unit) + ' ' + unit;
      $('#stat-avg').textContent = formatWeightNum(avg, unit) + ' ' + unit;

      if (values.length >= 2) {
        const oldest = values[0];
        const newest = values[values.length - 1];
        const change = totalChangeText(oldest, newest, unit);
        $('#stat-change').textContent = change.text;
        $('#stat-change').style.color = change.color;
      } else {
        $('#stat-change').textContent = '--';
        $('#stat-change').style.color = 'var(--text)';
      }
    } else {
      ['#stat-max', '#stat-min', '#stat-avg', '#stat-change'].forEach(s => {
        $(s).textContent = '--';
        $(s).style.color = 'var(--text)';
      });
    }
  }

  // --- 日历页 ---

  function renderCalendarPage() {
    if (!calendarInited) {
      Calendar.init($('#calendar-days'), {
        onDateClick: (date) => openDateDetailSheet(date),
      });
      calendarInited = true;
    } else {
      Calendar.render();
      // 刷新图例（人物可能有变化）
      Calendar.renderLegend && Calendar.renderLegend();
    }
  }

  // --- 日期详情浮层 ---

  function openDateDetailSheet(dateStr) {
    dateDetailSheet._date = dateStr;

    const persons = Store.getPersons();
    let allRecords = [];

    persons.forEach(p => {
      const records = Store.getRecordsByDate(p.id, dateStr);
      records.forEach(r => {
        allRecords.push({ ...r, _person: p });
      });
    });

    // 按早晚排序
    allRecords.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'morning' ? -1 : 1;
      return a.time.localeCompare(b.time);
    });

    $('#detail-date-title').textContent = formatDate(dateStr);

    let html = '';
    if (allRecords.length === 0) {
      html = '<div style="text-align:center;padding:24px;color:#8E8E93;">当天没有记录</div>';
    } else {
      allRecords.forEach(r => {
        const p = r._person;
        const typeLabel = r.type === 'morning' ? '早' : '晚';
        const typeClass = r.type === 'morning' ? 'morning' : 'evening';
        html += `
          <div class="detail-record-item">
            <div>
              <div class="detail-record-weight" style="color:${p.color}">
                <span class="detail-record-type ${typeClass}">${typeLabel}</span>
                ${formatWeightNum(r.weight, p.unit)} ${p.unit}
              </div>
            </div>
            <div class="detail-record-meta">
              <div class="detail-record-time">${r.time}</div>
              ${r.note ? `<div class="detail-record-note">${r.note}</div>` : ''}
              <div class="detail-record-person">${p.name}</div>
            </div>
            <div class="detail-record-actions">
              <button class="detail-action-btn edit" data-record-id="${r.id}">编辑</button>
              <button class="detail-action-btn delete" data-record-id="${r.id}">删除</button>
            </div>
          </div>`;
      });
    }

    $('#detail-records').innerHTML = html;

    // 绑定编辑/删除
    $$('#detail-records .detail-action-btn.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        const record = Store.getRecord(recordId);
        if (record) {
          Store.setCurrentPersonId(record.personId);
          closeDateDetailSheet();
          openRecordSheetForEdit(record);
        }
      });
    });

    $$('#detail-records .detail-action-btn.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const recordId = btn.dataset.recordId;
        showConfirm('确定要删除这条记录吗？', () => {
          Store.deleteRecord(recordId);
          const date = dateDetailSheet._date;
          closeDateDetailSheet();
          refreshAll();
          showToast('记录已删除');
        });
      });
    });

    openSheet(dateDetailSheet);
  }

  function closeDateDetailSheet() {
    closeSheet(dateDetailSheet);
  }

  function openRecordSheetForEdit(record) {
    const person = Store.getPerson(record.personId);
    if (!person) return;

    editingRecordId = record.id;
    selectedType = record.type || 'morning';

    const weightVal = person.unit === '斤' ? kgToJin(record.weight) : record.weight;
    $('#weight-input').value = weightVal;
    $('#weight-unit').textContent = person.unit;
    $('#record-time').value = record.time;
    $('#record-note').value = record.note || '';
    $('#record-date').value = record.date;
    $('#record-exists-tip').classList.add('hidden');
    onWeightInput();

    // 更新早晚选择
    $$('#type-toggle .type-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === selectedType);
    });

    Store.setCurrentPersonId(person.id);
    openSheet(recordSheet);
    setTimeout(() => $('#weight-input').focus(), 300);
  }

  // --- 我的页 ---

  function renderMePage() {
    const persons = Store.getPersons();
    let listHtml = '';
    persons.forEach(p => {
      listHtml += `
        <div class="person-list-item" data-person-id="${p.id}">
          <div class="person-list-avatar" style="background:${p.avatarColor || p.color}">${p.name.charAt(0)}</div>
          <div class="person-list-info">
            <div class="person-list-name">${p.name}</div>
            <div class="person-list-detail">
              ${p.height ? p.height + 'cm' : ''}
              ${p.targetWeight ? ' · 目标' + p.targetWeight + 'kg' : ''}
              ${!p.height && !p.targetWeight ? '未设置身高和目标' : ''}
            </div>
          </div>
          <div class="person-list-color" style="background:${p.color}"></div>
          <span class="person-list-arrow">›</span>
        </div>`;
    });
    $('#person-list').innerHTML = listHtml;

    $$('#person-list .person-list-item').forEach(item => {
      item.addEventListener('click', () => {
        openPersonSheet(item.dataset.personId);
      });
    });
  }

  // --- 数据导入导出 ---

  function exportData() {
    const json = Store.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `体重记录_备份_${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('数据已导出');
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const success = Store.importData(ev.target.result);
      if (success) {
        showToast('数据已导入');
        if (Store.hasData()) {
          showApp();
        }
        refreshAll();
      } else {
        showToast('导入失败，文件格式不正确');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // --- 全局刷新 ---

  function refreshAll() {
    renderRecordPage();
    renderMePage();
    // 日历图例刷新
    if (typeof Calendar.renderLegend === 'function') {
      Calendar.renderLegend();
    }
    switch (currentTab) {
      case 'trend': renderTrendPage(); break;
      case 'calendar': renderCalendarPage(); break;
    }
  }

  // --- 启动 ---
  document.addEventListener('DOMContentLoaded', init);

  return { init, switchTab, refreshAll };
})();
