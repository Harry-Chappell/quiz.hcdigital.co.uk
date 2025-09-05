(function(){
  if (typeof QuizBuzzerSettings === 'undefined') return;
  const ajaxUrl = QuizBuzzerSettings.ajaxUrl;
  const nonce = QuizBuzzerSettings.nonce;
  let config = QuizBuzzerSettings.config || null;

  function hexToHsl(hex){
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
    const r = parseInt(hex.substring(0,2),16)/255;
    const g = parseInt(hex.substring(2,4),16)/255;
    const b = parseInt(hex.substring(4,6),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h=0, s=0, l=(max+min)/2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch(max){
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  // normalize sound into {name,url}
  function normalizeSound(s) {
    if (!s) return { name: '', url: null };
    if (typeof s === 'string') return { name: s, url: null };
    if (typeof s === 'object') return { name: s.name || s.label || '', url: s.url || s.link || null };
    return { name: String(s), url: null };
  }

  // ensure defaults
  if (!config || !config.colors) {
    const defaults = [ ['Red','#e53935'],['Blue','#1e88e5'],['Green','#43a047'],['Yellow','#fdd835'],['Purple','#8e24aa'],['Orange','#fb8c00'],['Teal','#00acc1'],['Indigo','#5e35b1'] ];
    config = config || {};
    config.colors = defaults.map(d=>{ const hsl = hexToHsl(d[1]); return { name: d[0], hex: d[1], h: hsl.h, s: hsl.s, l: hsl.l }; });
  }
  if (!config.sounds) config.sounds = ['Beep','Boop','Clap','Horn','Laser'];

  // normalize existing sounds to objects
  config.sounds = (config.sounds || []).map(normalizeSound);

  function render(){
    const colorsList = document.getElementById('colors-list');
    colorsList.innerHTML = '';
    config.colors.forEach((c, idx)=>{
      const row = document.createElement('div');
      row.style.marginBottom = '8px';
      row.innerHTML = `<strong>${c.name}</strong> <input type="color" data-idx="${idx}" value="${c.hex}"> H: <input type="number" data-role="h" data-idx="${idx}" value="${c.h}" style="width:70px;"> S: <input type="number" data-role="s" data-idx="${idx}" value="${c.s}" style="width:70px;"> L: <input type="number" data-role="l" data-idx="${idx}" value="${c.l}" style="width:70px;"> <button data-del="${idx}">Remove</button>`;
      colorsList.appendChild(row);
    });

    const soundsList = document.getElementById('sounds-list');
    soundsList.innerHTML = '';
    config.sounds.forEach((s, idx)=>{
      const div = document.createElement('div');
      div.style.marginBottom = '8px';
      div.innerHTML = `Name: <input data-idx="${idx}" data-role="sound-name" value="${escapeHtml(s.name)}"> URL: <input type="url" data-idx="${idx}" data-role="sound-url" value="${escapeHtml(s.url || '')}" style="width:40%"> <button data-del-sound="${idx}">Remove</button>`;
      soundsList.appendChild(div);
    });
  }

  function saveConfig(){
    const url = ajaxUrl + '?action=quiz_buzzer_update_config&nonce=' + encodeURIComponent(nonce);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    }).then(r=>r.json()).then(res=>{
      if (res.success) console.log('Saved'); else alert('Save failed');
    }).catch(()=>alert('Save failed'));
  }

  // simple URL validator: accepts empty string (optional) or valid absolute URLs
  function isValidUrl(val) {
    if (!val) return true;
    try { new URL(val); return true; } catch (e) { return false; }
  }

  function escapeHtml(str){
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  document.addEventListener('click', ev=>{
    const del = ev.target.getAttribute('data-del');
    if (del !== null) { config.colors.splice(parseInt(del,10),1); render(); saveConfig(); }
    const delS = ev.target.getAttribute('data-del-sound');
    if (delS !== null) { config.sounds.splice(parseInt(delS,10),1); render(); saveConfig(); }
  });

  document.addEventListener('input', ev=>{
    const el = ev.target; const idx = el.getAttribute('data-idx');
    if (idx === null) return;
    const i = parseInt(idx,10);
    if (el.type === 'color') {
      const hex = el.value; config.colors[i].hex = hex; const hsl = hexToHsl(hex); config.colors[i].h = hsl.h; config.colors[i].s = hsl.s; config.colors[i].l = hsl.l; render(); saveConfig();
    }
    const role = el.getAttribute('data-role');
    if (role) {
      if (role === 'h' || role === 's' || role === 'l') { const val = parseInt(el.value,10) || 0; config.colors[i][role] = val; saveConfig(); }
      if (role === 'sound-name') { config.sounds[i].name = el.value; saveConfig(); }
      if (role === 'sound-url') {
        const v = el.value.trim();
        if (v && !isValidUrl(v)) {
          // show browser validation UI and avoid saving invalid URL
          try { el.setCustomValidity('Please enter a valid URL (e.g. https://example.com/sound.mp3)'); el.reportValidity(); } catch (e) {}
          el.style.border = '1px solid #e05';
          return;
        }
        // clear any previous validation state
        try { el.setCustomValidity(''); } catch (e) {}
        el.style.border = '';
        config.sounds[i].url = v ? v : null;
        saveConfig();
      }
    }
  });

  document.getElementById('add-color').addEventListener('click', ()=>{
    const name = document.getElementById('new-color-name').value.trim(); const hex = document.getElementById('new-color-hex').value; if (!name) return alert('Name required'); const hsl = hexToHsl(hex); config.colors.push({ name, hex, h: hsl.h, s: hsl.s, l: hsl.l }); document.getElementById('new-color-name').value = ''; render(); saveConfig();
  });

  document.getElementById('add-sound').addEventListener('click', ()=>{
    const nameEl = document.getElementById('new-sound-name');
    const urlEl = document.getElementById('new-sound-url');
    const name = nameEl.value.trim();
    const url = urlEl ? urlEl.value.trim() : '';
    if (!name) return alert('Name required');
    // validate URL if provided
    if (url && !isValidUrl(url)) {
      try { urlEl.setCustomValidity('Please enter a valid URL (e.g. https://example.com/sound.mp3)'); urlEl.reportValidity(); } catch (e) {}
      urlEl.style.border = '1px solid #e05';
      return;
    }
    // clear any previous validation state
    if (urlEl) { try { urlEl.setCustomValidity(''); } catch (e) {} urlEl.style.border = ''; }
    config.sounds.push({ name, url: url || null });
    nameEl.value = '';
    if (urlEl) urlEl.value = '';
    render(); saveConfig();
  });

  render();

})();
