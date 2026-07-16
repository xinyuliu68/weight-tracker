/* ==========================================
   utils.js — 工具函数
   ========================================== */

// 生成 uuid
function uuid() {
  return crypto.randomUUID();
}

// 今天日期 YYYY-MM-DD
function today() {
  return new Date().toISOString().split('T')[0];
}

// 当前时间 HH:mm
function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

// kg → 斤
function kgToJin(kg) {
  return +(kg * 2).toFixed(1);
}

// 斤 → kg
function jinToKg(jin) {
  return +(jin / 2).toFixed(2);
}

// 格式化体重显示
function formatWeight(kg, unit) {
  if (unit === '斤') return kgToJin(kg) + ' 斤';
  return kg.toFixed(1) + ' kg';
}

// 只返回数字（不带单位）
function formatWeightNum(kg, unit) {
  if (unit === '斤') return kgToJin(kg);
  return kg.toFixed(1);
}

// BMI 计算
function calculateBMI(weightKg, heightCm) {
  if (!heightCm || heightCm <= 0) return null;
  return +(weightKg / Math.pow(heightCm / 100, 2)).toFixed(1);
}

// BMI 状态
function bmiStatus(bmi) {
  if (bmi === null || bmi === undefined) return '未知';
  if (bmi < 18.5) return '偏瘦';
  if (bmi < 24) return '正常';
  if (bmi < 28) return '偏重';
  return '肥胖';
}

// BMI 在进度条上的位置百分比（基于 0~35 范围）
function bmiPosition(bmi) {
  if (!bmi) return 0;
  const clamped = Math.max(12, Math.min(35, bmi));
  return ((clamped - 12) / (35 - 12)) * 100;
}

// 变化文案：current - previous
function diffText(currentKg, previousKg, unit) {
  const diff = currentKg - previousKg;
  const absDiff = Math.abs(diff);
  let prefix = '';
  let arrow = '—';
  let color = '#8E8E93';

  if (diff > 0.005) {
    prefix = '+';
    arrow = '↑';
    color = '#FF3B30';
  } else if (diff < -0.005) {
    arrow = '↓';
    color = '#34C759';
  }

  const val = unit === '斤' ? kgToJin(absDiff) : absDiff.toFixed(1);
  return {
    text: `较上次 ${prefix}${val} ${unit} ${arrow}`,
    color,
    diff
  };
}

// 总变化文案（最早→最新）
function totalChangeText(earliestKg, latestKg, unit) {
  const diff = latestKg - earliestKg;
  const absDiff = Math.abs(diff);
  let prefix = '';
  let arrow = '—';
  let color = '#8E8E93';

  if (diff > 0.005) {
    prefix = '+';
    arrow = '↑';
    color = '#FF3B30';
  } else if (diff < -0.005) {
    arrow = '↓';
    color = '#34C759';
  }

  const val = unit === '斤' ? kgToJin(absDiff) : absDiff.toFixed(1);
  return { text: `${prefix}${val} ${unit} ${arrow}`, color };
}

// 获取某月天数
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// 获取某月第一天是星期几（0=周日, 1=周一, ..., 转换为 0=周一）
function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

// 格式化日期显示
function formatDate(dateStr) {
  if (!dateStr) return '--';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

// 格式化简短日期
function formatDateShort(dateStr) {
  if (!dateStr) return '--';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

// 日期字符串转 Date
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Date 转日期字符串
function dateToStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 两个日期相差天数
function dateDiffDays(d1, d2) {
  const a = parseDate(d1);
  const b = parseDate(d2);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// 按日期分组记录
function groupByDate(records) {
  const map = {};
  records.forEach(r => {
    if (!map[r.date]) map[r.date] = [];
    map[r.date].push(r);
  });
  return map;
}

// 获取月的第一天和最后一天
function getMonthRange(year, month) {
  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = getDaysInMonth(year, month);
  const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { first, last };
}

// 根据天数计算起始日期
function getStartDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  return dateToStr(d);
}

// 判断日期是否在范围内
function isDateInRange(dateStr, start, end) {
  return dateStr >= start && dateStr <= end;
}
