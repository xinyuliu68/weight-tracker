/* ==========================================
   calendar.js — 日历组件（显示所有人物）
   ========================================== */

const Calendar = (() => {
  let currentYear, currentMonth;
  let container; // DOM 元素 .calendar-days
  let onDateClick = null; // 回调
  let touchStartX = 0;
  let touchStartY = 0;
  let initialized = false;

  function init(containerEl, opts = {}) {
    container = containerEl;
    onDateClick = opts.onDateClick || null;

    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();

    // 滑动手势（只绑定一次）
    if (!initialized) {
      container.addEventListener('touchstart', onTouchStart, { passive: true });
      container.addEventListener('touchend', onTouchEnd, { passive: true });
      initialized = true;
    }

    render();
    renderLegend();
  }

  function goToPrevMonth() {
    if (currentMonth === 0) {
      currentYear--;
      currentMonth = 11;
    } else {
      currentMonth--;
    }
    render('left');
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      currentYear++;
      currentMonth = 0;
    } else {
      currentMonth++;
    }
    render('right');
  }

  function getYear() { return currentYear; }
  function getMonth() { return currentMonth; }

  function getMonthTitle() {
    return `${currentYear}年${currentMonth + 1}月`;
  }

  function onTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        goToPrevMonth();
      } else {
        goToNextMonth();
      }
    }
  }

  // 渲染人物图例
  function renderLegend() {
    const persons = Store.getPersons();
    const legendEl = document.getElementById('calendar-legend');
    if (!legendEl) return;

    let html = '';
    persons.forEach(p => {
      html += `
        <span class="calendar-legend-item">
          <span class="calendar-legend-dot" style="background:${p.color}"></span>
          ${p.name}
        </span>`;
    });
    legendEl.innerHTML = html;
  }

  function render(animationDir) {
    if (!container) return;

    const days = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const todayStr = today();

    // 获取所有人物和所有记录
    const persons = Store.getPersons();
    const allRecords = Store.getRecords();

    // 按日期 + personId 组织数据: dateMap[date][personId] = morningRecord
    const dateMap = {};
    allRecords.forEach(r => {
      if (r.type !== 'morning') return; // 只显示早上记录
      if (!dateMap[r.date]) dateMap[r.date] = {};
      dateMap[r.date][r.personId] = r;
    });

    let html = '';

    // 上月填充
    const prevMonthDays = firstDay;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevDays = getDaysInMonth(prevYear, prevMonth);

    for (let i = prevDays - prevMonthDays + 1; i <= prevDays; i++) {
      html += `<div class="calendar-day other-month"><span>${i}</span></div>`;
    }

    // 本月天
    for (let d = 1; d <= days; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const dayData = dateMap[dateStr] || {};

      // 为每个人物显示体重（如果有记录）
      let weightsHtml = '';
      const personIds = Object.keys(dayData);

      if (personIds.length === 1) {
        // 只有一个人：显示体重数字
        const pid = personIds[0];
        const person = persons.find(p => p.id === pid);
        const record = dayData[pid];
        if (person && record) {
          const u = person.unit;
          weightsHtml = `<span class="day-weight" style="color:${person.color}">${formatWeightNum(record.weight, u)}</span>`;
        }
      } else if (personIds.length > 1) {
        // 多人：显示彩色圆点 + 每个人的小数字
        weightsHtml = '<div class="day-weights-stack">';
        personIds.forEach(pid => {
          const person = persons.find(p => p.id === pid);
          const record = dayData[pid];
          if (person && record) {
            weightsHtml += `<span class="day-weight-small" style="color:${person.color}">${formatWeightNum(record.weight, person.unit)}</span>`;
          }
        });
        weightsHtml += '</div>';
      }

      html += `
        <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
          <span>${d}</span>
          ${weightsHtml}
        </div>`;
    }

    // 下月填充
    const totalCells = firstDay + days;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="calendar-day other-month"><span>${i}</span></div>`;
    }

    container.innerHTML = html;

    // 动画
    if (animationDir === 'left') {
      container.classList.add('slide-left');
      setTimeout(() => container.classList.remove('slide-left'), 200);
    } else if (animationDir === 'right') {
      container.classList.add('slide-right');
      setTimeout(() => container.classList.remove('slide-right'), 200);
    }

    // 绑定点击
    container.querySelectorAll('.calendar-day:not(.other-month)').forEach(el => {
      el.addEventListener('click', () => {
        const date = el.dataset.date;
        if (date && onDateClick) onDateClick(date);
      });
    });

    // 更新月份标题
    const titleEl = document.getElementById('month-title');
    if (titleEl) titleEl.textContent = getMonthTitle();
  }

  return { init, goToPrevMonth, goToNextMonth, getYear, getMonth, getMonthTitle, render, renderLegend };
})();
