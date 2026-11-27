(() => {
  'use strict';
  const Core = window.BootsplashCore;
  const W = 1920, H = 1080;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const storageKey = 'bootsplash-studio-v2-projects';
  const currentKey = 'bootsplash-studio-v2-current';
  const themeKey = 'bootsplash-studio-v2-theme';
  const canvas = $('#design-canvas');
  const ctx = canvas.getContext('2d');
  const finalCanvas = $('#final-preview-canvas');
  const finalCtx = finalCanvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const imageCache = new Map();
  let project = createPreset('aurora');
  let selectedId = project.layers.find(layer => layer.type === 'text')?.id || null;
  let activeView = 'studio';
  let zoom = 1;
  let isDragging = false;
  let dragMode = 'move';
  let dragOrigin = null;
  let historyPast = [];
  let historyFuture = [];
  let toastTimer = null;
  let autoSaveTimer = null;
  let animationFrame = 0;
  let showGrid = false;

  function newId(prefix = 'layer') {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function createPreset(key) {
    const presets = {
      aurora: {
        name: 'Aurora', author: '', description: 'A calm, cool-toned startup screen.', animation: 'spinner',
        canvas: { width: W, height: H, background: '#080d18' },
        layers: [
          { id: 'halo', type: 'shape', name: 'Ambient halo', shape: 'circle', x: 842, y: 274, width: 236, height: 236, color: '#728bff', opacity: .12 },
          { id: 'brand-title', type: 'text', name: 'Brand title', text: 'AURORA', x: 600, y: 465, width: 720, height: 104, fontSize: 76, fontWeight: '700', color: '#f4f7ff', opacity: 1 },
          { id: 'tagline', type: 'text', name: 'Subtitle', text: 'A quieter start.', x: 600, y: 575, width: 720, height: 54, fontSize: 27, fontWeight: '400', color: '#9aabc8', opacity: 1 },
          { id: 'orbit', type: 'spinner', name: 'Loading indicator', x: 930, y: 690, width: 60, height: 60, color: '#8da0ff', opacity: 1 },
          { id: 'progress', type: 'progress', name: 'Progress bar', x: 780, y: 800, width: 360, height: 7, color: '#8295ff', opacity: .9 }
        ]
      },
      minimal: {
        name: 'Still', author: '', description: 'Quiet, centered and minimal.', animation: 'pulse',
        canvas: { width: W, height: H, background: '#101116' },
        layers: [
          { id: 'brand-mark', type: 'shape', name: 'Brand mark', shape: 'circle', x: 896, y: 342, width: 128, height: 128, color: '#cbd1e6', opacity: .16 },
          { id: 'brand-title', type: 'text', name: 'Brand title', text: 'YOUR BRAND', x: 610, y: 525, width: 700, height: 72, fontSize: 48, fontWeight: '700', color: '#f2f1ed', opacity: 1 },
          { id: 'tagline', type: 'text', name: 'Subtitle', text: 'Preparing your workspace', x: 610, y: 610, width: 700, height: 40, fontSize: 22, fontWeight: '400', color: '#999da9', opacity: 1 }
        ]
      },
      orbit: {
        name: 'Orbit', author: '', description: 'A bright, kinetic system start.', animation: 'spinner',
        canvas: { width: W, height: H, background: '#071a22' },
        layers: [
          { id: 'orb-one', type: 'shape', name: 'Orbit accent', shape: 'circle', x: 804, y: 245, width: 312, height: 312, color: '#35c6bd', opacity: .12 },
          { id: 'brand-title', type: 'text', name: 'Brand title', text: 'NORTHSTAR', x: 580, y: 500, width: 760, height: 90, fontSize: 64, fontWeight: '700', color: '#effffc', opacity: 1 },
          { id: 'tagline', type: 'text', name: 'Subtitle', text: 'Everything in its place.', x: 580, y: 595, width: 760, height: 45, fontSize: 24, fontWeight: '400', color: '#8cbab9', opacity: 1 },
          { id: 'orbit-spin', type: 'spinner', name: 'Loading indicator', x: 930, y: 710, width: 60, height: 60, color: '#43d5c7', opacity: 1 },
          { id: 'progress', type: 'progress', name: 'Progress bar', x: 780, y: 820, width: 360, height: 6, color: '#39c8bb', opacity: .85 }
        ]
      },
      signal: {
        name: 'Signal', author: '', description: 'A precise, technical look.', animation: 'spinner',
        canvas: { width: W, height: H, background: '#0c1020' },
        layers: [
          { id: 'signal-orb', type: 'shape', name: 'Signal ring', shape: 'circle', x: 870, y: 285, width: 180, height: 180, color: '#a4a5ff', opacity: .13 },
          { id: 'brand-title', type: 'text', name: 'Brand title', text: 'SIGNAL', x: 600, y: 500, width: 720, height: 85, fontSize: 68, fontWeight: '700', color: '#f1f1ff', opacity: 1 },
          { id: 'tagline', type: 'text', name: 'Subtitle', text: 'Booting into focus', x: 600, y: 590, width: 720, height: 40, fontSize: 22, fontWeight: '400', color: '#a1a3c4', opacity: 1 },
          { id: 'signal-spin', type: 'spinner', name: 'Loading indicator', x: 930, y: 690, width: 60, height: 60, color: '#a3a5ff', opacity: 1 }
        ]
      }
    };
    const source = presets[key] || presets.aurora;
    return Core.validateTheme({ schemaVersion: 1, slug: Core.slugify(source.name), ...copy(source) });
  }

  function notify(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }
  function setStatus(message = 'All changes saved locally') {
    $('#save-status').innerHTML = `<i></i>${escapeHtml(message)}`;
  }
  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function snapshotHistory() {
    historyPast.push(copy(project));
    if (historyPast.length > 30) historyPast.shift();
    historyFuture = [];
  }
  function undo() {
    if (!historyPast.length) return notify('Nothing to undo');
    historyFuture.push(copy(project));
    project = historyPast.pop();
    selectedId = project.layers.some(l => l.id === selectedId) ? selectedId : null;
    syncAll();
    scheduleSave();
  }
  function redo() {
    if (!historyFuture.length) return notify('Nothing to redo');
    historyPast.push(copy(project));
    project = historyFuture.pop();
    selectedId = project.layers.some(l => l.id === selectedId) ? selectedId : null;
    syncAll();
    scheduleSave();
  }
  function readProjects() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]').filter(p => p && p.id && p.theme); }
    catch { return []; }
  }
  function saveCurrent(silent = false) {
    const projects = readProjects();
    const record = { id: project.projectId || newId('project'), theme: copy(project), updatedAt: new Date().toISOString() };
    project.projectId = record.id;
    const index = projects.findIndex(p => p.id === record.id);
    if (index >= 0) projects[index] = record; else projects.unshift(record);
    try {
      localStorage.setItem(storageKey, JSON.stringify(projects.slice(0, 20)));
      localStorage.setItem(currentKey, record.id);
      setStatus();
      if (!silent) notify('Project saved in this browser');
    } catch (error) {
      setStatus('Export recommended');
      if (!silent) notify('Browser storage is full. Export this project as JSON to keep a copy.');
    }
    return record;
  }
  function scheduleSave() {
    setStatus('Saving…');
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => saveCurrent(true), 350);
  }
  function loadSaved() {
    const id = localStorage.getItem(currentKey);
    const record = readProjects().find(p => p.id === id);
    if (record) {
      try { project = Core.validateTheme(record.theme); project.projectId = record.id; }
      catch { project = createPreset('aurora'); }
    }
  }

  function drawRoundedRect(context, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + w, y, x + w, y + h, radius);
    context.arcTo(x + w, y + h, x, y + h, radius);
    context.arcTo(x, y + h, x, y, radius);
    context.arcTo(x, y, x + w, y, radius);
    context.closePath();
  }
  function loadImage(dataUrl) {
    if (!dataUrl) return null;
    if (imageCache.has(dataUrl)) return imageCache.get(dataUrl);
    const image = new Image();
    image.onload = () => render();
    image.onerror = () => notify('Could not load this image');
    image.src = dataUrl;
    imageCache.set(dataUrl, image);
    return image;
  }
  function drawSpinner(context, layer, time = 0) {
    const cx = layer.x + layer.width / 2, cy = layer.y + layer.height / 2;
    const radius = Math.min(layer.width, layer.height) * .35;
    const phase = (time / 1150) * Math.PI * 2;
    context.save();
    context.translate(cx, cy);
    context.rotate(phase);
    context.lineWidth = Math.max(3, Math.min(layer.width, layer.height) * .075);
    context.lineCap = 'round';
    context.strokeStyle = `${layer.color}35`;
    context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.stroke();
    context.strokeStyle = layer.color;
    context.beginPath(); context.arc(0, 0, radius, -.45, Math.PI * 1.15); context.stroke();
    context.restore();
  }
  function drawLayer(context, layer, time, opts = {}) {
    if (!layer.visible) return;
    const pulseTarget = project.animation === 'pulse' ? project.layers.find(l => (l.type === 'logo' || l.type === 'text') && l.visible) : null;
    if (opts.excludeAnimated && ((project.animation === 'spinner' && layer.type === 'spinner') || layer.type === 'progress' || (project.animation === 'pulse' && pulseTarget && layer.id === pulseTarget.id))) return;
    context.save();
    context.globalAlpha = layer.opacity === undefined ? 1 : layer.opacity;
    if (layer.type === 'text') {
      const size = layer.fontSize || 56;
      context.font = `${layer.fontWeight || '700'} ${size}px ${layer.fontFamily || 'Arial'}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = layer.color;
      context.fillText(layer.text || 'Your brand', layer.x + layer.width / 2, layer.y + layer.height / 2, layer.width);
    } else if (layer.type === 'shape') {
      context.fillStyle = layer.color;
      drawRoundedRect(context, layer.x, layer.y, layer.width, layer.height, layer.shape === 'circle' ? Math.min(layer.width, layer.height) / 2 : layer.shape === 'pill' ? layer.height / 2 : layer.radius || 20);
      context.fill();
    } else if (layer.type === 'logo') {
      const image = loadImage(layer.dataUrl);
      if (image && image.complete && image.naturalWidth) {
        const ratio = Math.min(layer.width / image.naturalWidth, layer.height / image.naturalHeight);
        const width = image.naturalWidth * ratio, height = image.naturalHeight * ratio;
        context.drawImage(image, layer.x + (layer.width - width) / 2, layer.y + (layer.height - height) / 2, width, height);
      } else if (!layer.dataUrl) {
        context.strokeStyle = layer.color; context.lineWidth = 5;
        context.strokeRect(layer.x + 5, layer.y + 5, layer.width - 10, layer.height - 10);
        context.fillStyle = layer.color; context.font = '600 22px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle';
        context.fillText('ADD LOGO', layer.x + layer.width / 2, layer.y + layer.height / 2);
      }
    } else if (layer.type === 'spinner') {
      drawSpinner(context, layer, project.animation === 'spinner' ? time : 0);
    } else if (layer.type === 'progress') {
      const radius = Math.min(layer.height / 2, 8);
      context.fillStyle = '#ffffff22'; drawRoundedRect(context, layer.x, layer.y, layer.width, layer.height, radius); context.fill();
      context.fillStyle = layer.color; drawRoundedRect(context, layer.x, layer.y, layer.width * .64, layer.height, radius); context.fill();
    }
    context.restore();
  }
  function renderTo(context, time = animationFrame, options = {}) {
    const themeBg = project.canvas.background;
    context.clearRect(0, 0, W, H);
    context.fillStyle = themeBg;
    context.fillRect(0, 0, W, H);
    const halo = context.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 800);
    halo.addColorStop(0, 'rgba(124,147,255,.09)');
    halo.addColorStop(1, 'rgba(124,147,255,0)');
    context.fillStyle = halo; context.fillRect(0, 0, W, H);
    const pulseLayer = project.animation === 'pulse' ? project.layers.find(l => (l.type === 'logo' || l.type === 'text') && l.visible) : null;
    project.layers.forEach(layer => {
      if (layer === pulseLayer && !options.excludeAnimated) {
        context.save();
        context.globalAlpha = .48 + (Math.cos(time / 680) + 1) * .25;
        drawLayer(context, { ...layer, opacity: 1 }, time, options);
        context.restore();
      } else drawLayer(context, layer, time, options);
    });
    if (options.selection && options.selection.visible) drawSelection(context, options.selection);
  }
  function drawSelection(context, layer) {
    context.save();
    context.strokeStyle = '#91a2ff'; context.lineWidth = 3; context.setLineDash([10, 7]);
    context.strokeRect(layer.x - 4, layer.y - 4, layer.width + 8, layer.height + 8);
    context.setLineDash([]); context.fillStyle = '#91a2ff'; context.fillRect(layer.x + layer.width - 7, layer.y + layer.height - 7, 14, 14);
    context.restore();
  }
  function render() {
    const selected = project.layers.find(l => l.id === selectedId);
    renderTo(ctx, animationFrame, { selection: selected });
  }
  function animate(timestamp) {
    animationFrame = timestamp || 0;
    if (!reducedMotion && activeView === 'studio') render();
    window.requestAnimationFrame(animate);
  }
  function setView(view) {
    activeView = view;
    $$('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
    $$('.nav-item[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
    $('#breadcrumb-current').textContent = ({ studio: 'Studio', gallery: 'Theme library', projects: 'My projects', system: 'Compatibility', about: 'About Studio' })[view] || 'Studio';
    if (view === 'gallery') renderGallery();
    if (view === 'projects') renderProjects();
    if (view === 'studio') render();
  }
  function syncTitle() {
    $('#project-title').textContent = project.name;
    $('#theme-name').value = project.name;
    $('#theme-author').value = project.author || '';
    $('#animation-select').value = project.animation;
    $('#background-color').value = project.canvas.background;
    $('#background-color-value').textContent = project.canvas.background.toUpperCase();
    $('#layer-count').textContent = project.layers.length;
  }
  function syncInspector() {
    const layer = project.layers.find(item => item.id === selectedId);
    $('#empty-selection').hidden = Boolean(layer);
    $('#element-properties').hidden = !layer;
    $('#delete-layer').disabled = !layer;
    if (!layer) return;
    $('#prop-name').value = layer.name;
    $('#prop-x').value = Math.round(layer.x);
    $('#prop-y').value = Math.round(layer.y);
    $('#prop-width').value = Math.round(layer.width);
    $('#prop-height').value = Math.round(layer.height);
    $('#prop-text-wrap').hidden = layer.type !== 'text';
    $('#prop-font-row').hidden = layer.type !== 'text';
    $('#prop-text').value = layer.text || '';
    $('#prop-font-size').value = layer.fontSize || 56;
    $('#prop-weight').value = layer.fontWeight || '700';
    $('#prop-color').value = layer.color || '#ffffff';
    $('#prop-opacity').value = layer.opacity === undefined ? 1 : layer.opacity;
    $('#prop-visible').checked = layer.visible !== false;
  }
  function renderLayerList() {
    const list = $('#layer-list');
    list.innerHTML = '';
    [...project.layers].reverse().forEach(layer => {
      const row = document.createElement('div');
      row.className = `layer-row${layer.id === selectedId ? ' active' : ''}`;
      row.dataset.id = layer.id;
      const symbol = ({ text: 'T', shape: '◧', logo: '▧', spinner: '◌', progress: '▰' })[layer.type];
      const layerIndex = project.layers.findIndex(item => item.id === layer.id);
      row.innerHTML = `<span class="layer-kind">${symbol}</span><span class="layer-name"></span><button class="layer-move" type="button" data-dir="up" title="Move forward" ${layerIndex === project.layers.length - 1 ? 'disabled' : ''}>↑</button><button class="layer-move" type="button" data-dir="down" title="Move backward" ${layerIndex === 0 ? 'disabled' : ''}>↓</button><button class="layer-eye" type="button" title="Toggle visibility">${layer.visible ? '◉' : '○'}</button>`;
      $('.layer-name', row).textContent = layer.name;
      $('.layer-name', row).title = layer.name;
      row.addEventListener('click', e => {
        const moveButton = e.target.closest('.layer-move');
        if (moveButton) { moveLayer(layer.id, moveButton.dataset.dir); return; }
        if (e.target.closest('.layer-eye')) {
          snapshotHistory(); layer.visible = !layer.visible; syncAll(); scheduleSave(); return;
        }
        selectedId = layer.id; syncInspector(); renderLayerList(); render();
      });
      list.append(row);
    });
  }
  function syncAll() { syncTitle(); syncInspector(); renderLayerList(); render(); }
  function moveLayer(id, direction) {
    const index = project.layers.findIndex(layer => layer.id === id);
    const target = direction === 'up' ? index + 1 : index - 1;
    if (index < 0 || target < 0 || target >= project.layers.length) return;
    snapshotHistory();
    [project.layers[index], project.layers[target]] = [project.layers[target], project.layers[index]];
    selectedId = id; renderLayerList(); render(); scheduleSave();
  }
  function addLayer(type) {
    if (type === 'logo') { $('#logo-upload').click(); return; }
    if (type === 'progress' && project.layers.some(l => l.type === 'progress')) return notify('This theme already has a progress bar');
    if (type === 'spinner' && project.layers.some(l => l.type === 'spinner')) return notify('This theme already has a spinner');
    snapshotHistory();
    const defaults = {
      text: { name: 'New text', text: 'Your text', x: 710, y: 500, width: 500, height: 64, fontSize: 44, color: '#f0f4ff' },
      shape: { name: 'New shape', shape: 'rect', x: 840, y: 400, width: 240, height: 150, color: '#7e92ff', opacity: .8 },
      spinner: { name: 'Loading indicator', x: 930, y: 700, width: 60, height: 60, color: '#8da0ff' },
      progress: { name: 'Progress bar', x: 780, y: 800, width: 360, height: 8, color: '#8295ff' }
    }[type];
    const layer = { id: newId(type), type, visible: true, locked: false, opacity: 1, ...defaults };
    project.layers.push(layer); selectedId = layer.id; syncAll(); scheduleSave();
  }
  function addUploadedLogo(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 3 * 1024 * 1024) {
      notify('Choose a PNG, JPEG or WebP image under 3 MB'); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      snapshotHistory();
      const layer = { id: newId('logo'), type: 'logo', name: file.name.replace(/\.[^.]+$/, '').slice(0, 64) || 'Logo', x: 850, y: 340, width: 220, height: 220, color: '#ffffff', opacity: 1, visible: true, dataUrl: reader.result };
      project.layers.push(layer); selectedId = layer.id; imageCache.delete(reader.result); syncAll(); scheduleSave();
    };
    reader.onerror = () => notify('Could not read that image');
    reader.readAsDataURL(file);
  }
  function updateSelected(field, value) {
    const layer = project.layers.find(item => item.id === selectedId);
    if (!layer) return;
    if (field === 'x' || field === 'y' || field === 'width' || field === 'height' || field === 'fontSize') value = Number(value);
    snapshotHistory();
    layer[field] = value;
    if (field === 'name') renderLayerList();
    render(); scheduleSave();
  }
  function hitTest(x, y) {
    for (let i = project.layers.length - 1; i >= 0; i--) {
      const layer = project.layers[i];
      if (!layer.visible || layer.locked) continue;
      if (x >= layer.x - 8 && x <= layer.x + layer.width + 8 && y >= layer.y - 8 && y <= layer.y + layer.height + 8) return layer;
    }
    return null;
  }
  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height };
  }
  function onCanvasDown(event) {
    const point = canvasPoint(event);
    const current = project.layers.find(l => l.id === selectedId);
    if (current && point.x > current.x + current.width - 22 && point.x < current.x + current.width + 12 && point.y > current.y + current.height - 22 && point.y < current.y + current.height + 12) {
      isDragging = true; dragMode = 'resize'; dragOrigin = { x: point.x, y: point.y, layer: copy(current) };
    } else {
      const found = hitTest(point.x, point.y);
      selectedId = found?.id || null;
      if (found) {
        snapshotHistory();
        isDragging = true; dragMode = 'move'; dragOrigin = { x: point.x, y: point.y, layer: copy(found) };
      }
    }
    syncInspector(); renderLayerList(); render();
    if (isDragging) { canvas.setPointerCapture(event.pointerId); canvas.style.cursor = dragMode === 'resize' ? 'nwse-resize' : 'grabbing'; }
  }
  function onCanvasMove(event) {
    const point = canvasPoint(event);
    const layer = project.layers.find(l => l.id === selectedId);
    if (!isDragging || !layer || !dragOrigin) {
      if (!layer) { canvas.style.cursor = 'default'; return; }
      canvas.style.cursor = point.x > layer.x + layer.width - 22 && point.y > layer.y + layer.height - 22 ? 'nwse-resize' : 'grab';
      return;
    }
    const dx = point.x - dragOrigin.x, dy = point.y - dragOrigin.y;
    if (dragMode === 'resize') {
      layer.width = Math.max(16, Math.min(W - dragOrigin.layer.x, dragOrigin.layer.width + dx));
      layer.height = Math.max(12, Math.min(H - dragOrigin.layer.y, dragOrigin.layer.height + dy));
    } else {
      layer.x = Math.max(0, Math.min(W - layer.width, dragOrigin.layer.x + dx));
      layer.y = Math.max(0, Math.min(H - layer.height, dragOrigin.layer.y + dy));
    }
    syncInspector(); render();
  }
  function onCanvasUp(event) {
    if (!isDragging) return;
    isDragging = false; dragOrigin = null; canvas.style.cursor = 'grab';
    try { canvas.releasePointerCapture(event.pointerId); } catch {}
    scheduleSave();
  }
  function deleteSelected() {
    if (!selectedId) return;
    snapshotHistory(); project.layers = project.layers.filter(l => l.id !== selectedId); selectedId = null; syncAll(); scheduleSave();
  }
  function renameProject() {
    const name = window.prompt('Theme name', project.name);
    if (!name || !name.trim()) return;
    snapshotHistory(); project.name = name.trim().slice(0, 64); project.slug = Core.slugify(project.name); syncTitle(); scheduleSave();
  }
  function newBlankProject() {
    snapshotHistory();
    project = { schemaVersion: 1, slug: 'my-theme', name: 'Untitled theme', author: '', description: '', animation: 'spinner', canvas: { width: W, height: H, background: '#080d18' }, layers: [
      { id: 'brand-title', type: 'text', name: 'Brand title', text: 'YOUR BRAND', x: 610, y: 475, width: 700, height: 80, fontSize: 64, fontWeight: '700', color: '#eef3ff', opacity: 1, visible: true },
      { id: 'tagline', type: 'text', name: 'Subtitle', text: 'Starting your system', x: 610, y: 570, width: 700, height: 45, fontSize: 23, fontWeight: '400', color: '#98a8c6', opacity: 1, visible: true },
      { id: 'spinner', type: 'spinner', name: 'Loading indicator', x: 930, y: 700, width: 60, height: 60, color: '#8da0ff', opacity: 1, visible: true }
    ] };
    project.projectId = newId('project'); selectedId = 'brand-title'; setView('studio'); syncAll(); saveCurrent(true); notify('New blank theme created');
  }
  function applyPreset(key) {
    snapshotHistory(); project = createPreset(key); project.projectId = newId('project'); selectedId = project.layers.find(l => l.type === 'text')?.id || null; setView('studio'); syncAll(); saveCurrent(true); notify(`${project.name} template loaded`);
  }
  function renderGallery() {
    const entries = [
      { id: 'aurora', title: 'Aurora', desc: 'Cool tones and soft motion', category: 'motion', bg: 'radial-gradient(circle at 50% 42%,#26365b,#080d18 63%)', word: 'AURORA' },
      { id: 'minimal', title: 'Still', desc: 'A quiet, minimal startup', category: 'minimal', bg: 'linear-gradient(140deg,#303039,#101116 65%)', word: 'YOUR BRAND' },
      { id: 'orbit', title: 'Orbit', desc: 'Fresh color and clean energy', category: 'motion', bg: 'radial-gradient(circle at 50% 44%,#1a5660,#071a22 68%)', word: 'NORTHSTAR' },
      { id: 'signal', title: 'Signal', desc: 'Precise and high contrast', category: 'bold', bg: 'radial-gradient(circle at 50% 45%,#2c315f,#0c1020 70%)', word: 'SIGNAL' }
    ];
    const query = $('#gallery-search').value.toLowerCase().trim();
    const filter = $('.filter-pill.active')?.dataset.filter || 'all';
    const filtered = entries.filter(item => (filter === 'all' || item.category === filter) && `${item.title} ${item.desc}`.toLowerCase().includes(query));
    $('#gallery-grid').innerHTML = filtered.map(item => `<article class="theme-card"><div class="theme-thumb" style="background:${item.bg}"><span class="thumb-ring"></span><span class="thumb-word">${item.word}</span><span class="thumb-sub">YOUR SYSTEM IS STARTING</span></div><div class="theme-card-meta"><div><h3>${item.title}</h3><p>${item.desc}</p></div><span class="theme-tag">${item.category}</span></div><button class="button button-secondary use-theme" data-preset="${item.id}">Use this template →</button></article>`).join('') || '<p class="muted">No themes match this search.</p>';
    $$('#gallery-grid [data-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
  }
  function renderProjects() {
    const projects = readProjects().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    $('#projects-grid').innerHTML = projects.map(record => {
      const bg = record.theme.canvas?.background || '#0b1120';
      return `<article class="project-card"><div class="project-thumb" style="background:${escapeHtml(bg)}"></div><div class="project-card-body"><div><h3>${escapeHtml(record.theme.name)}</h3><span class="theme-tag">${escapeHtml(record.theme.animation || 'static')}</span></div><p>Saved ${new Date(record.updatedAt).toLocaleString()}</p><div class="project-card-actions"><button data-open="${escapeHtml(record.id)}">Open</button><button data-export="${escapeHtml(record.id)}">Export JSON</button><button data-remove="${escapeHtml(record.id)}">Delete</button></div></div></article>`;
    }).join('') || '<div class="empty-selection"><div class="empty-selection-icon">▤</div><strong>No saved projects yet</strong><p>Create a theme and it will appear here automatically.</p></div>';
    $$('#projects-grid [data-open]').forEach(button => button.addEventListener('click', () => {
      const record = readProjects().find(p => p.id === button.dataset.open); if (!record) return;
      project = Core.validateTheme(record.theme); project.projectId = record.id; selectedId = project.layers[0]?.id || null; localStorage.setItem(currentKey, record.id); syncAll(); setView('studio');
    }));
    $$('#projects-grid [data-export]').forEach(button => button.addEventListener('click', () => {
      const record = readProjects().find(p => p.id === button.dataset.export); if (record) downloadJson(record.theme, `${Core.slugify(record.theme.name)}.json`);
    }));
    $$('#projects-grid [data-remove]').forEach(button => button.addEventListener('click', () => {
      const recordId = button.dataset.remove;
      if (!window.confirm('Delete this locally saved project? This cannot be undone.')) return;
      localStorage.setItem(storageKey, JSON.stringify(readProjects().filter(p => p.id !== recordId)));
      if (localStorage.getItem(currentKey) === recordId) localStorage.removeItem(currentKey);
      renderProjects(); notify('Project deleted');
    }));
  }
  function applyThemeMode(mode) { document.documentElement.dataset.theme = mode; localStorage.setItem(themeKey, mode); }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename); notify('Project JSON exported');
  }
  function canvasPng(context, width = W, height = H) {
    return new Promise((resolve, reject) => {
      context.canvas.toBlob(blob => blob ? blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer))) : reject(new Error('Could not render PNG asset')), 'image/png');
    });
  }
  async function standaloneLayerPng(layer) {
    const temp = document.createElement('canvas'); temp.width = Math.max(1, Math.round(layer.width)); temp.height = Math.max(1, Math.round(layer.height));
    const c = temp.getContext('2d'); c.clearRect(0, 0, temp.width, temp.height); c.save(); c.globalAlpha = layer.opacity === undefined ? 1 : layer.opacity;
    if (layer.type === 'logo') {
      const img = loadImage(layer.dataUrl);
      if (img && !img.complete) await new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); });
      if (img && img.complete && img.naturalWidth) {
        const r = Math.min(temp.width / img.naturalWidth, temp.height / img.naturalHeight), w = img.naturalWidth * r, h = img.naturalHeight * r;
        c.drawImage(img, (temp.width - w) / 2, (temp.height - h) / 2, w, h);
      }
    } else if (layer.type === 'text') {
      c.fillStyle = layer.color; c.font = `${layer.fontWeight || '700'} ${Math.min(layer.fontSize || 56, temp.height)}px ${layer.fontFamily || 'Arial'}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(layer.text, temp.width / 2, temp.height / 2, temp.width);
    }
    c.restore(); return canvasPng(c);
  }
  function makeProgressAsset(layer, fill) {
    const temp = document.createElement('canvas'); temp.width = Math.max(1, Math.round(layer.width)); temp.height = Math.max(4, Math.round(layer.height));
    const c = temp.getContext('2d');
    c.fillStyle = fill ? layer.color : '#ffffff2c'; drawRoundedRect(c, 0, 0, temp.width, temp.height, temp.height / 2); c.fill();
    return canvasPng(c);
  }
  function makeSpinnerFrame(color, frame) {
    const temp = document.createElement('canvas'); temp.width = 128; temp.height = 128;
    const c = temp.getContext('2d');
    const cx = 64, cy = 64, radius = 42;
    for (let i = 0; i < 12; i++) {
      const index = (i + frame) % 12;
      c.globalAlpha = .12 + (i / 11) * .82;
      c.strokeStyle = color; c.lineWidth = 7; c.lineCap = 'round';
      const a = index / 12 * Math.PI * 2;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * (radius - 9), cy + Math.sin(a) * (radius - 9)); c.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius); c.stroke();
    }
    c.globalAlpha = 1;
    return canvasPng(c);
  }
  async function buildInstallPackage() {
    const validated = Core.validateTheme(project);
    validated.slug = Core.slugify(validated.name);
    const assets = [];
    const backgroundCanvas = document.createElement('canvas'); backgroundCanvas.width = W; backgroundCanvas.height = H;
    renderTo(backgroundCanvas.getContext('2d'), 0, { excludeAnimated: true });
    assets.push({ name: 'theme/background.png', data: await canvasPng(backgroundCanvas.getContext('2d')) });
    const spinner = validated.layers.find(l => l.type === 'spinner' && l.visible);
    if (spinner) {
      for (let i = 0; i < 12; i++) assets.push({ name: `theme/spinner-${String(i).padStart(2, '0')}.png`, data: await makeSpinnerFrame(spinner.color || '#8da0ff', i) });
    }
    const progress = validated.layers.find(l => l.type === 'progress' && l.visible);
    if (progress) {
      assets.push({ name: 'theme/progress-bg.png', data: await makeProgressAsset(progress, false) });
      assets.push({ name: 'theme/progress-fill.png', data: await makeProgressAsset(progress, true) });
    }
    if (validated.animation === 'pulse') {
      const logo = validated.layers.find(l => (l.type === 'logo' || l.type === 'text') && l.visible);
      if (logo) assets.push({ name: 'theme/pulse-logo.png', data: await standaloneLayerPng(logo) });
    }
    const installer = Core.generateInstaller(validated);
    const descriptor = Core.generatePlymouthDescriptor(validated);
    const script = Core.generatePlymouthScript(validated);
    const instructions = `BOOTSPLASH STUDIO — INSTALLATION\n\nTheme: ${validated.name}\n\n1. Extract this ZIP archive.\n2. Open a terminal in the extracted folder.\n3. Review install.sh before running it.\n4. Make it executable: chmod +x install.sh\n5. Install with: sudo ./install.sh\n6. Reboot to test.\n\nUninstall: sudo ./install.sh --uninstall\n\nThe installer backs up selected configuration files under /var/lib/bootsplash-studio/${validated.slug}.\nIt detects update-initramfs, dracut, or mkinitcpio and uses the available tool. GRUB is updated when a supported updater is found.\n\nIMPORTANT\n- Plymouth, the script plugin, KMS/framebuffer support and initramfs integration are required.\n- Firmware/UEFI messages, bootloader text, kernel warnings, encryption prompts and display-manager handoff may still be visible.\n- Keep a recovery method available. Test on a machine where you can recover boot settings.\n- Browser preview is a design preview, not an exact simulation of your hardware.\n`;
    assets.push({ name: `${validated.slug}.plymouth`, data: descriptor });
    assets.push({ name: `${validated.slug}.script`, data: script });
    assets.push({ name: 'install.sh', data: installer });
    assets.push({ name: 'README-INSTALL.txt', data: instructions });
    assets.push({ name: 'theme.json', data: JSON.stringify(validated, null, 2) });
    return Core.makeZip(assets);
  }

  function openFinalPreview() {
    renderTo(finalCtx, animationFrame);
    $('#preview-theme-name').textContent = project.name;
    $('#download-status').textContent = '';
    $('#preview-modal').hidden = false;
    $('#close-preview').focus();
  }
  function importProject(file) {
    if (!file || file.size > 15 * 1024 * 1024) return notify('Project file must be smaller than 15 MB');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = Core.validateTheme(JSON.parse(reader.result));
        snapshotHistory(); project = imported; project.projectId = newId('project'); selectedId = project.layers[0]?.id || null; syncAll(); saveCurrent(true); setView('studio'); notify('Project imported');
      } catch (error) { notify(`Import failed: ${error.message}`); }
    };
    reader.onerror = () => notify('Could not read the project file');
    reader.readAsText(file);
  }

  function bindEvents() {
    $$('.nav-item[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
    $('#theme-toggle').addEventListener('click', () => applyThemeMode(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    $('#save-project').addEventListener('click', () => saveCurrent());
    $('#rename-project').addEventListener('click', renameProject);
    $('#open-final-preview').addEventListener('click', openFinalPreview);
    $('#close-preview').addEventListener('click', () => { $('#preview-modal').hidden = true; });
    $('#preview-modal').addEventListener('click', e => { if (e.target === $('#preview-modal')) $('#preview-modal').hidden = true; });
    $('#build-package').addEventListener('click', async () => {
      const button = $('#build-package'); button.disabled = true; button.textContent = 'Building…'; $('#download-status').textContent = 'Rendering native theme files…';
      try {
        const zip = await buildInstallPackage();
        downloadBlob(zip, `${Core.slugify(project.name)}-bootsplash-theme.zip`);
        $('#download-status').textContent = 'Package ready. Extract it, review install.sh, then run sudo ./install.sh on Linux.';
        notify('Plymouth theme package downloaded');
      } catch (error) { console.error(error); $('#download-status').textContent = `Build failed: ${error.message}`; notify('Package build failed'); }
      finally { button.disabled = false; button.innerHTML = '↓ Build install package'; }
    });
    $('#download-project').addEventListener('click', () => downloadJson(Core.validateTheme(project), `${Core.slugify(project.name)}.json`));
    $$('.add-tile').forEach(button => button.addEventListener('click', () => addLayer(button.dataset.add)));
    $('#logo-upload').addEventListener('change', event => { addUploadedLogo(event.target.files?.[0]); event.target.value = ''; });
    $('#delete-layer').addEventListener('click', deleteSelected);
    $('#design-canvas').addEventListener('pointerdown', onCanvasDown);
    $('#design-canvas').addEventListener('pointermove', onCanvasMove);
    $('#design-canvas').addEventListener('pointerup', onCanvasUp);
    $('#design-canvas').addEventListener('pointercancel', onCanvasUp);
    $('#animation-select').addEventListener('change', event => { snapshotHistory(); project.animation = event.target.value; scheduleSave(); render(); });
    $('#background-color').addEventListener('focus', () => snapshotHistory(), { once: false });
    $('#background-color').addEventListener('input', event => { project.canvas.background = event.target.value; $('#background-color-value').textContent = event.target.value.toUpperCase(); render(); scheduleSave(); });
    $('#theme-name').addEventListener('change', event => { snapshotHistory(); project.name = event.target.value.trim() || 'Untitled theme'; project.slug = Core.slugify(project.name); syncTitle(); scheduleSave(); });
    $('#theme-author').addEventListener('change', event => { snapshotHistory(); project.author = event.target.value.slice(0, 64); scheduleSave(); });
    const bindProp = (id, field, type = 'string') => $(id).addEventListener('change', event => updateSelected(field, type === 'boolean' ? event.target.checked : type === 'number' ? Number(event.target.value) : event.target.value));
    bindProp('#prop-name', 'name'); bindProp('#prop-x', 'x', 'number'); bindProp('#prop-y', 'y', 'number'); bindProp('#prop-width', 'width', 'number'); bindProp('#prop-height', 'height', 'number');
    bindProp('#prop-text', 'text'); bindProp('#prop-font-size', 'fontSize', 'number'); bindProp('#prop-weight', 'fontWeight'); bindProp('#prop-color', 'color'); bindProp('#prop-visible', 'visible', 'boolean');
    let opacityHistoryOpen = false;
    const beginOpacityEdit = () => { if (!opacityHistoryOpen) { snapshotHistory(); opacityHistoryOpen = true; } };
    const endOpacityEdit = () => { opacityHistoryOpen = false; };
    $('#prop-opacity').addEventListener('pointerdown', beginOpacityEdit);
    $('#prop-opacity').addEventListener('focus', beginOpacityEdit);
    $('#prop-opacity').addEventListener('pointerup', endOpacityEdit);
    $('#prop-opacity').addEventListener('change', endOpacityEdit);
    $('#prop-opacity').addEventListener('blur', endOpacityEdit);
    $('#prop-opacity').addEventListener('input', event => { const layer = project.layers.find(l => l.id === selectedId); if (layer) { layer.opacity = Number(event.target.value); render(); scheduleSave(); } });
    $$('.panel-tab').forEach(button => button.addEventListener('click', () => {
      $$('.panel-tab').forEach(tab => tab.classList.toggle('active', tab === button));
      const isLayers = button.dataset.panel === 'layers'; $('#design-panel').hidden = isLayers; $('#layers-panel').hidden = !isLayers;
    }));
    $('#zoom-out').addEventListener('click', () => { zoom = Math.max(.65, zoom - .1); $('.canvas-frame').style.width = `${Math.round(940 * zoom)}px`; $('#zoom-label').textContent = `${Math.round(zoom * 100)}%`; });
    $('#zoom-in').addEventListener('click', () => { zoom = Math.min(1.15, zoom + .1); $('.canvas-frame').style.width = `${Math.round(940 * zoom)}px`; $('#zoom-label').textContent = `${Math.round(zoom * 100)}%`; });
    $('#center-canvas').addEventListener('click', () => { zoom = 1; $('.canvas-frame').style.width = 'min(100%, 940px)'; $('#zoom-label').textContent = 'Fit'; });
    $('#toggle-grid').addEventListener('click', () => { showGrid = !showGrid; $('.canvas-frame').classList.toggle('grid-on', showGrid); $('#toggle-grid').classList.toggle('active', showGrid); });
    $('#reset-theme').addEventListener('click', () => { if (window.confirm('Reset this canvas to the Aurora starting design?')) applyPreset('aurora'); });
    $('#blank-theme').addEventListener('click', newBlankProject);
    $('#new-project').addEventListener('click', newBlankProject);
    $('#gallery-search').addEventListener('input', renderGallery);
    $$('.filter-pill').forEach(button => button.addEventListener('click', () => { $$('.filter-pill').forEach(p => p.classList.toggle('active', p === button)); renderGallery(); }));
    $('#project-import').addEventListener('change', event => { importProject(event.target.files?.[0]); event.target.value = ''; });
    document.addEventListener('keydown', event => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !isTyping) { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y' && !isTyping) { event.preventDefault(); redo(); }
      else if ((event.key === 'Delete' || event.key === 'Backspace') && !isTyping && activeView === 'studio') { deleteSelected(); }
      else if (event.key === 'Escape') $('#preview-modal').hidden = true;
    });
  }

  function init() {
    loadSaved();
    const mode = localStorage.getItem(themeKey) || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    applyThemeMode(mode);
    bindEvents(); syncAll();
    window.requestAnimationFrame(animate);
    if (!localStorage.getItem(currentKey)) saveCurrent(true);
  }
  init();
})();
