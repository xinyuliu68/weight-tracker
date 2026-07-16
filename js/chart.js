/* ==========================================
   chart.js — 手写 Canvas 折线图
   ========================================== */

const WeightChart = (() => {

  let canvas, ctx, container;
  let padding = { top: 20, right: 20, bottom: 40, left: 50 };
  let dataPoints = [];
  let lineColor = '#D4A5A5';
  let unit = 'kg';
  let activeTooltip = null; // { x, y, date, weight }
  let initialized = false;

  function init(canvasEl, containerEl) {
    canvas = canvasEl;
    container = containerEl;
    ctx = canvas.getContext('2d');

    resize();

    // 事件只绑定一次
    if (!initialized) {
      canvas.addEventListener('click', handleClick);
      canvas.addEventListener('touchstart', handleTouch);
      window.addEventListener('resize', onResize);
      initialized = true;
    }
  }

  function resize() {
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onResize() {
    resize();
    render(dataPoints, lineColor, unit);
  }

  function setData(points, color, displayUnit) {
    dataPoints = points || [];
    lineColor = color || '#D4A5A5';
    unit = displayUnit || 'kg';
    activeTooltip = null; // 清除旧 tooltip
    render(dataPoints, lineColor, unit);
  }

  function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    findAndShowTooltip(x, y);
  }

  function handleTouch(e) {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    findAndShowTooltip(x, y);
  }

  function findAndShowTooltip(touchX, touchY) {
    const W = canvas.getBoundingClientRect().width - padding.left - padding.right;
    const H = canvas.getBoundingClientRect().height - padding.top - padding.bottom;

    if (dataPoints.length === 0) return;

    const values = dataPoints.map(d => unit === '斤' ? kgToJin(d.weight) : d.weight);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    let closest = null;
    let minDist = Infinity;

    dataPoints.forEach(d => {
      const val = unit === '斤' ? kgToJin(d.weight) : d.weight;
      const px = padding.left + (d.index / Math.max(dataPoints.length - 1, 1)) * W;
      const py = padding.top + H - ((val - minVal) / range) * H;
      const dist = Math.sqrt((touchX - px) ** 2 + (touchY - py) ** 2);
      if (dist < minDist && dist < 30) {
        minDist = dist;
        closest = { x: px, y: py, date: d.date, weight: d.weight };
      }
    });

    activeTooltip = closest;
    render(dataPoints, lineColor, unit);
  }

  function render(points, color, displayUnit) {
    if (!ctx || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const W = rect.width - padding.left - padding.right;
    const H = rect.height - padding.top - padding.bottom;

    // 清空
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (points.length === 0) return;

    // 转换为显示值
    const values = points.map(d => displayUnit === '斤' ? kgToJin(d.weight) : d.weight);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const margin = range * 0.2;
    const yMin = minVal - margin;
    const yMax = maxVal + margin;
    const yRange = yMax - yMin;

    // --- 绘制网格线 ---
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (H / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + W, y);
      ctx.stroke();

      // Y 轴标签
      const label = (yMax - (yRange / gridLines) * i).toFixed(1);
      ctx.fillStyle = '#8E8E93';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, padding.left - 6, y + 4);
    }

    // --- 绘制 X 轴标签 ---
    const maxLabels = Math.min(points.length, Math.floor(W / 50));
    const step = Math.ceil(points.length / Math.max(maxLabels, 1));

    ctx.fillStyle = '#8E8E93';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';

    points.forEach((d, i) => {
      if (i % step === 0 || i === points.length - 1) {
        const x = padding.left + (i / Math.max(points.length - 1, 1)) * W;
        const label = formatDateShort(d.date);
        ctx.fillText(label, x, padding.top + H + 18);
      }
    });

    if (points.length < 2) {
      // 单个数据点：只画点
      const val = displayUnit === '斤' ? kgToJin(points[0].weight) : points[0].weight;
      const px = padding.left + W / 2;
      const py = padding.top + H - ((val - yMin) / yRange) * H;

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      return;
    }

    // --- 绘制渐变填充 ---
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + H);
    gradient.addColorStop(0, hexToRgba(color, 0.15));
    gradient.addColorStop(1, hexToRgba(color, 0.0));

    ctx.beginPath();
    points.forEach((d, i) => {
      const val = displayUnit === '斤' ? kgToJin(d.weight) : d.weight;
      const px = padding.left + (i / (points.length - 1)) * W;
      const py = padding.top + H - ((val - yMin) / yRange) * H;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    // 闭合到底部
    const lastX = padding.left + W;
    ctx.lineTo(lastX, padding.top + H);
    ctx.lineTo(padding.left, padding.top + H);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // --- 绘制折线 ---
    ctx.beginPath();
    points.forEach((d, i) => {
      const val = displayUnit === '斤' ? kgToJin(d.weight) : d.weight;
      const px = padding.left + (i / (points.length - 1)) * W;
      const py = padding.top + H - ((val - yMin) / yRange) * H;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // --- 绘制数据点 ---
    points.forEach((d, i) => {
      const val = displayUnit === '斤' ? kgToJin(d.weight) : d.weight;
      const px = padding.left + (i / (points.length - 1)) * W;
      const py = padding.top + H - ((val - yMin) / yRange) * H;

      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // --- 绘制 tooltip ---
    if (activeTooltip) {
      const tx = activeTooltip.x;
      const ty = activeTooltip.y;
      const tWeight = displayUnit === '斤'
        ? kgToJin(activeTooltip.weight) + ' 斤'
        : activeTooltip.weight.toFixed(1) + ' kg';
      const tDate = formatDateShort(activeTooltip.date);

      const text = `${tDate}  ${tWeight}`;
      ctx.font = '12px -apple-system, sans-serif';
      const textW = ctx.measureText(text).width + 16;

      let bubbleX = tx - textW / 2;
      if (bubbleX < padding.left) bubbleX = padding.left;
      if (bubbleX + textW > padding.left + W) bubbleX = padding.left + W - textW;

      const bubbleY = ty - 28;
      const bubbleH = 24;

      // 气泡背景
      ctx.fillStyle = 'rgba(26,26,26,0.85)';
      ctx.beginPath();
      roundRect(ctx, bubbleX, bubbleY, textW, bubbleH, 6);
      ctx.fill();

      // 气泡文字
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(text, bubbleX + textW / 2, bubbleY + 16);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return { init, setData };
})();
