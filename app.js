(() => {
    'use strict';
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const storageKey = 'mangaforge.projects.v1';
    const sampleStory = 'On the last evening of summer, inventor Mira finds a tiny star hiding inside an old music box. The star has lost its way home. Mira builds a paper rocket, and her best friend Ren joins her. Together they launch from the rooftop into a quiet sea of clouds. A silver comet points the way to a glowing moonlit garden. The star remembers its home and shines brighter than ever. Mira and Ren wave goodbye as the star rises into the sky. They return home just as the first sunlight fills the city.';
    const sampleProjectId = 'mangaforge-sample-starbound-letter';
    const videoInput = $('#backgroundVideoInput');
    let backgroundVideoUrl = '';
    const originalCharacters = [
      {name:'Mira Vey',role:'Inventor',personality:'Curious, inventive, and kind',hair:'Short, wavy midnight-purple hair',outfit:'Lilac workshop jacket and brass goggles',description:'An original rooftop inventor who collects broken music boxes',art:'art-1'},
      {name:'Ren Solari',role:'Adventurer',personality:'Loyal, funny, and fearless',hair:'Messy chestnut hair with a pale streak',outfit:'Deep-blue travel coat and cloud-pattern scarf',description:'An original cloud-sailing explorer and Mira’s loyal co-pilot',art:'art-2'},
      {name:'Sena Briar',role:'Guardian',personality:'Patient, brave, and protective',hair:'Long rose-black braids',outfit:'Berry-red cloak with a leaf-shaped clasp',description:'An original forest guardian who can hear old trees whisper',art:'art-3'},
      {name:'Tavi Moss',role:'Healer',personality:'Gentle, observant, and upbeat',hair:'Curly moss-green bob',outfit:'Green field coat with a tiny seed pouch',description:'An original traveling healer who grows medicinal plants',art:'art-4'},
      {name:'Oru Fen',role:'Scholar',personality:'Thoughtful, witty, and curious',hair:'Soft copper hair tied in a loose bun',outfit:'Amber archive robe and ink-stained gloves',description:'An original map scholar searching for a city that moves at night',art:'art-5'},
      {name:'Iri Noct',role:'Adventurer',personality:'Quiet, clever, and optimistic',hair:'Blue-black shoulder-length hair',outfit:'Indigo stargazer cape with silver stitching',description:'An original young stargazer who charts secret paths between moons',art:'art-6'},
    ];
    const cast = $('#characters');
    const storyInput = $('#story');
    const area = $('#storyboardArea');
    let activeStoryboard = null;
    let activePage = 0;
    let history = [];
    let future = [];
    let sampleGeneration = false;
    let referenceData = '';
    let toastTimer;

    function toast(message, error = false) {
      const el = $('#toast');
      el.textContent = message;
      el.classList.toggle('error', error);
      el.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
    }

    $('#backgroundVideoButton').addEventListener('click',()=>videoInput.click());
    $('#removeBackgroundVideo').addEventListener('click',()=>{
      const video=$('#siteBackgroundVideo');
      video.pause();
      video.removeAttribute('src');
      video.load();
      $('#videoBackdrop').classList.add('hidden');
      $('#removeBackgroundVideo').hidden=true;
      if(backgroundVideoUrl)URL.revokeObjectURL(backgroundVideoUrl);
      backgroundVideoUrl='';
      videoInput.value='';
      toast('Background video removed.');
    });
    videoInput.addEventListener('change',async()=>{
      const file=videoInput.files?.[0];
      if(!file)return;
      if(!['video/mp4','video/webm','video/ogg'].includes(file.type)){
        videoInput.value='';
        toast('Choose an MP4, WebM, or OGG video.',true);
        return;
      }
      if(file.size>200*1024*1024){
        videoInput.value='';
        toast('Choose a video smaller than 200 MB.',true);
        return;
      }
      const video=$('#siteBackgroundVideo');
      const nextUrl=URL.createObjectURL(file);
      video.pause();
      video.src=nextUrl;
      video.muted=true;
      video.loop=true;
      video.playsInline=true;
      $('#videoBackdrop').classList.remove('hidden');
      $('#removeBackgroundVideo').hidden=false;
      video.addEventListener('error',()=>{
        toast('This video could not be played. Try an MP4 or WebM encoded for web playback.',true);
      },{once:true});
      try{
        await new Promise((resolve,reject)=>{
          video.addEventListener('loadedmetadata',resolve,{once:true});
          video.addEventListener('error',()=>reject(new Error('This video could not be played. Try an MP4 or WebM encoded for web playback.')),{once:true});
        });
        await video.play();
        if(backgroundVideoUrl)URL.revokeObjectURL(backgroundVideoUrl);
        backgroundVideoUrl=nextUrl;
        toast('Video is playing quietly behind the whole website.');
      }catch(error){
        URL.revokeObjectURL(nextUrl);
        video.removeAttribute('src');
        video.load();
        $('#videoBackdrop').classList.add('hidden');
        $('#removeBackgroundVideo').hidden=true;
        videoInput.value='';
        console.error('Unable to play the selected background video:',error);
        toast(error instanceof Error ? error.message : 'Could not play that video. Please try another file.',true);
      }
    });

    function safeProjects() {
      try {
        const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
        return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string') : [];
      } catch (error) {
        console.error('Unable to read saved MangaForge projects:', error);
        toast('Saved projects could not be read from this browser.', true);
        return [];
      }
    }

    function persistProjects(projects) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(projects));
        return true;
      } catch (error) {
        console.error('Unable to save MangaForge projects:', error);
        toast('Could not save. Browser storage may be full or disabled.', true);
        return false;
      }
    }

    function escapeHTML(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    }

    function updateCount() { $('#charCount').textContent = `${storyInput.value.length.toLocaleString()} / 5,000`; }

    function showView(id) {
      ['create', 'projects'].forEach(view => $(`#${view}`).classList.toggle('hidden', view !== id));
      if (id === 'projects') renderProjects();
      if (id === 'create') setTimeout(() => $('#create').scrollIntoView({behavior:'smooth', block:'start'}), 0);
      else if (id === 'projects') setTimeout(() => $('#projects').scrollIntoView({behavior:'smooth', block:'start'}), 0);
    }

    function chunks(text, count) {
      const sentences = text.match(/[^.!?।]+[.!?।]?/gu)?.map(part => part.trim()).filter(Boolean) || [];
      const source = sentences.length ? sentences : [text.trim()];
      const result = Array.from({length:count}, () => []);
      const sceneCount = Math.min(count, source.length);
      source.forEach((sentence, index) => result[Math.floor(index * sceneCount / source.length)].push(sentence));
      return result.map(parts => parts.join(' ') || 'Add another story beat for this panel.');
    }

    function characterSummary() {
      return $$('[data-character]', cast).map(block => {
        const values = {};
        $$('[data-char]', block).forEach(input => values[input.dataset.char] = input.value.trim());
        values.photo = block.characterPhoto || '';
        return values;
      }).filter(character => Object.values(character).some(Boolean));
    }

    function makeStoryboard(story, options = {}) {
      const scenesPerPage = Number($('#panelCount').value);
      const pageCount = Number($('#pageCount').value);
      const pieces = chunks(story, pageCount * scenesPerPage);
      const characters = characterSummary();
      const dialogueLines = {
        English: ['We can do this together.', 'I will find a way.', 'Did you see that?', 'Let’s keep going!'],
        Hindi: ['हम साथ मिलकर यह कर सकते हैं।', 'मैं कोई रास्ता ढूँढ़ लूँगा।', 'क्या तुमने वह देखा?', 'चलो, आगे बढ़ते हैं!'],
        Hinglish: ['Hum yeh saath kar sakte hain.', 'Main koi raasta dhoondh lunga.', 'Tumne woh dekha?', 'Chalo, aage badhte hain!'],
      };
      const speaker = characters.find(character => character.name)?.name || ({Hindi:'नायक', Hinglish:'Hero', English:'Hero'}[ $('#dialogueLanguage').value ]);
      const pages = Array.from({length:pageCount}, (_, pageIndex) => ({
        panels: Array.from({length:scenesPerPage}, (_, panelIndex) => {
          const sceneIndex = pageIndex * scenesPerPage + panelIndex;
          const scene = pieces[sceneIndex] || 'Add another story beat for this panel.';
          const character = characters.length ? characters[sceneIndex % characters.length] : null;
          return {
            id: `p${pageIndex + 1}-${panelIndex + 1}-${Math.random().toString(36).slice(2,7)}`,
            wide: false,
            description: scene,
            characterName: character?.name || speaker,
            characterPhoto: character?.photo || '',
            dialogue: `${character?.name || speaker}: ${dialogueLines[$('#dialogueLanguage').value][sceneIndex % 4]}`,
            caption: `Page ${pageIndex + 1} · Scene ${panelIndex + 1}`,
            sfx: '',
            bubble: '',
          };
        }),
      }));
      return {id:options.id || crypto.randomUUID(), title:options.title || $('#projectName').value.trim() || 'Untitled manga', story, language:$('#storyLanguage').value, dialogueLanguage:$('#dialogueLanguage').value, style:$('#style').value, pages, characters, panelCount:scenesPerPage, pageCount, aspectRatio:$('#aspectRatio').value, layout:$('#layout').value, rightToLeft:$('#rightToLeft').checked, referenceData, updatedAt:new Date().toISOString()};
    }

    function renderStoryboard() {
      if (!activeStoryboard) return;
      const page = activeStoryboard.pages[activePage];
      const total = activeStoryboard.pages.reduce((sum, item) => sum + item.panels.length, 0);
      const layoutClass = activeStoryboard.layout === 'Four-panel strip' ? 'strip' : activeStoryboard.layout === 'Dynamic action' ? 'dynamic' : '';
      const ratioClass = activeStoryboard.aspectRatio.startsWith('Portrait') ? 'portrait' : activeStoryboard.aspectRatio.startsWith('Square') ? 'square' : 'landscape';
      $('#editorStatus').textContent = `${activeStoryboard.title} · ${activeStoryboard.pages.length} page${activeStoryboard.pages.length === 1 ? '' : 's'}`;
      $('#panelSummary').textContent = `${total} storyboard panels · ${activeStoryboard.style}`;
      $('#editorControls').classList.remove('hidden');
      const tabs = `<button class="page-tab" data-page="${activePage - 1}" ${activePage === 0 ? 'disabled' : ''} aria-label="Previous page">←</button>${activeStoryboard.pages.map((item, index) => `<button class="page-tab${index === activePage ? ' active' : ''}" data-page="${index}">Page ${index + 1}</button>`).join('')}<button class="page-tab" data-page="${activePage + 1}" ${activePage === activeStoryboard.pages.length - 1 ? 'disabled' : ''} aria-label="Next page">→</button>`;
      const panels = page.panels.map((panel, index) => `<article class="scene-card${panel.wide ? ' wide' : ''}" data-panel-id="${escapeHTML(panel.id)}"><div class="scene-visual">${panel.characterPhoto ? `<img class="panel-reference" src="${escapeHTML(panel.characterPhoto)}" alt="${escapeHTML(panel.characterName || 'Character')} photo reference"><span class="reference-badge">YOUR PHOTO · DEMO PREVIEW</span>` : ''}<span class="scene-index">Panel ${index + 1}</span></div><div class="scene-content"><div class="scene-description">${escapeHTML(panel.description)}</div><input data-edit="dialogue" aria-label="Dialogue for panel ${index + 1}" placeholder="Add dialogue..." value="${escapeHTML(panel.dialogue)}"><textarea data-edit="caption" aria-label="Caption for panel ${index + 1}" placeholder="Caption">${escapeHTML(panel.caption)}</textarea><div class="field-row" style="margin-top:6px"><input data-edit="sfx" aria-label="Sound effect for panel ${index + 1}" placeholder="Sound effect" value="${escapeHTML(panel.sfx)}"><input data-edit="bubble" aria-label="Bubble text for panel ${index + 1}" placeholder="Bubble note" value="${escapeHTML(panel.bubble)}"></div><div class="scene-actions"><span class="subtle">${escapeHTML(panel.characterName || 'Storyboard placeholder')}</span><div class="panel-buttons"><button data-move="-1" aria-label="Move panel left">←</button><button data-move="1" aria-label="Move panel right">→</button><button data-action="toggle-size" aria-label="Toggle panel size">↔</button><button data-action="regenerate-panel" aria-label="Regenerate panel outline">↻</button></div></div></div></article>`).join('');
      area.innerHTML = `<div class="storyboard-toolbar"><div class="page-tabs">${tabs}</div><span class="subtle">${escapeHTML(activeStoryboard.layout)} · ${escapeHTML(activeStoryboard.aspectRatio)}</span></div><div class="panel-list ${layoutClass} ${ratioClass}">${panels}</div>`;
      $$('[data-page]', area).forEach(button => button.addEventListener('click', () => {const target = Number(button.dataset.page);if(target >= 0 && target < activeStoryboard.pages.length){activePage = target;renderStoryboard();}}));
      $$('.scene-card', area).forEach(card => {
        $$('[data-edit]', card).forEach(input => {
          input.addEventListener('focus', snapshot, {once:true});
          input.addEventListener('input', () => {
            const panel = findPanel(card.dataset.panelId);
            if (panel) panel[input.dataset.edit] = input.value;
            activeStoryboard.updatedAt = new Date().toISOString();
          });
        });
        card.addEventListener('click', event => {if (!event.target.closest('button')) card.classList.toggle('selected');});
        $$('[data-move]', card).forEach(button => button.addEventListener('click', () => movePanel(card.dataset.panelId, Number(button.dataset.move))));
        $('[data-action="toggle-size"]', card).addEventListener('click', () => {snapshot();const panel=findPanel(card.dataset.panelId);panel.wide=!panel.wide;renderStoryboard();});
        $('[data-action="regenerate-panel"]', card).addEventListener('click', () => regeneratePanel(card.dataset.panelId));
      });
    }

    function findPanel(id) { return activeStoryboard?.pages.flatMap(page => page.panels).find(panel => panel.id === id); }
    function snapshot() { if (activeStoryboard) { history.push(JSON.stringify(activeStoryboard)); if (history.length > 30) history.shift(); future = []; } }
    function movePanel(id, direction) {
      const panels = activeStoryboard.pages[activePage].panels;
      const index = panels.findIndex(panel => panel.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= panels.length) {toast('That panel cannot move any further.');return;}
      snapshot();
      [panels[index], panels[target]] = [panels[target], panels[index]];
      activeStoryboard.updatedAt = new Date().toISOString();
      renderStoryboard();
    }
    function regeneratePanel(id) {
      const panel = findPanel(id);
      if (!panel) return;
      snapshot();
      const parts = chunks(activeStoryboard.story, activeStoryboard.pages.reduce((n, page) => n + page.panels.length, 0));
      const all = activeStoryboard.pages.flatMap(page => page.panels);
      const index = all.findIndex(item => item.id === id);
      panel.description = parts[(index + 1) % parts.length] || 'A new story beat unfolds.';
      activeStoryboard.updatedAt = new Date().toISOString();
      renderStoryboard();
      toast('Panel outline refreshed. AI artwork generation is not configured.');
    }
    function undoRedo(from, to) {
      if (!activeStoryboard || !from.length) {toast('Nothing to change here.');return;}
      to.push(JSON.stringify(activeStoryboard));
      activeStoryboard = JSON.parse(from.pop());
      activePage = Math.min(activePage, activeStoryboard.pages.length - 1);
      renderStoryboard();
    }

    function saveActive() {
      if (!activeStoryboard) {toast('Generate a storyboard before saving.', true);return;}
      const projects = safeProjects();
      activeStoryboard.title = $('#projectName').value.trim() || activeStoryboard.title || 'Untitled manga';
      activeStoryboard.characters = characterSummary();
      activeStoryboard.updatedAt = new Date().toISOString();
      const index = projects.findIndex(project => project.id === activeStoryboard.id);
      if (index >= 0) projects[index] = activeStoryboard; else projects.unshift(activeStoryboard);
      if (persistProjects(projects)) {
        $('#editorStatus').textContent = `${activeStoryboard.title} · Saved locally`;
        toast('Project saved on this device.');
      }
    }

    function hydrate(project) {
      activeStoryboard = JSON.parse(JSON.stringify(project));
      activePage = 0; history = []; future = [];
      storyInput.value = project.story || '';
      $('#projectName').value = project.title || '';
      $('#storyLanguage').value = project.language || 'English';
      $('#dialogueLanguage').value = project.dialogueLanguage || 'English';
      $('#style').value = project.style || 'Traditional black-and-white';
      $('#pageCount').value = String(project.pages?.length || 4);
      $('#panelCount').value = String(project.panelCount || project.pages?.[0]?.panels?.length || 4);
      $('#aspectRatio').value = project.aspectRatio || 'Portrait (2:3)';
      $('#layout').value = project.layout || 'Classic grid';
      $('#rightToLeft').checked = project.rightToLeft !== false;
      $('#characters').innerHTML = '';
      (project.characters?.length ? project.characters : [{}]).forEach((character, i) => addCharacter(character, i + 1));
      renderCharacterLibrary();
      updateCount();
      showView('create');
      renderStoryboard();
    }

    function addCharacter(values = {}, index = $$('.character-block', cast).length + 1) {
      const block = document.createElement('div');
      block.className = 'character-block';
      block.dataset.character = '';
      block.innerHTML = `<div class="character-head"><span>Character ${index}</span><button class="btn-icon remove-character" type="button" aria-label="Remove character">×</button></div><div class="field-row"><div class="field"><label>Name</label><input type="text" data-char="name" maxlength="50" placeholder="e.g. Mira"></div><div class="field"><label>Personality</label><input type="text" data-char="personality" maxlength="100" placeholder="Curious, brave..."></div></div><div class="field-row"><div class="field"><label>Hairstyle</label><input type="text" data-char="hair" maxlength="100" placeholder="Short, wavy black hair"></div><div class="field"><label>Outfit</label><input type="text" data-char="outfit" maxlength="100" placeholder="Blue jacket, red scarf"></div></div><div class="field"><label>Description</label><input type="text" data-char="description" maxlength="180" placeholder="Distinctive features, age, or other details"></div><div class="character-photo-row"><img class="character-photo-preview hidden" data-photo-preview alt="Character photo preview"><label class="character-photo-upload">+ Add this character’s photo<input data-character-photo type="file" accept="image/png,image/jpeg,image/webp" aria-label="Add character photo"></label><button class="btn btn-quiet btn-small" type="button" data-remove-photo disabled>Remove</button></div><div class="field-help">Private to this browser · image is not uploaded to a server.</div>`;
      $$('[data-char]', block).forEach(input => input.value = values[input.dataset.char] || '');
      block.characterPhoto = values.photo || '';
      updateCharacterPhoto(block);
      cast.appendChild(block);
    }

    function updateCharacterPhoto(block) {
      const preview = $('[data-photo-preview]', block);
      const remove = $('[data-remove-photo]', block);
      if (!preview || !remove) return;
      preview.src = block.characterPhoto || '';
      preview.classList.toggle('hidden', !block.characterPhoto);
      remove.disabled = !block.characterPhoto;
    }

    async function readCharacterPhoto(file) {
      if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPG, or WebP image file.');
      if (file.size > 8 * 1024 * 1024) throw new Error('Character photos must be 8 MB or smaller.');
      const bitmap = await createImageBitmap(file);
      try {
        if (bitmap.width > 10000 || bitmap.height > 10000) throw new Error('This image is too large to use safely. Choose a smaller photo.');
        const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('This browser could not prepare the photo. Try a different image.');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.78);
      } finally {
        bitmap.close();
      }
    }

    function renderCharacterLibrary() {
      const search = ($('#characterSearch')?.value || '').trim().toLowerCase();
      const role = $('#characterRole')?.value || 'all';
      const selectedNames = characterSummary().map(character => character.name.toLowerCase());
      const filtered = originalCharacters.filter(character =>
        (role === 'all' || character.role === role) &&
        `${character.name} ${character.role} ${character.description}`.toLowerCase().includes(search));
      $('#characterLibrary').innerHTML = filtered.length ? filtered.map(character => {
        const added = selectedNames.includes(character.name.toLowerCase());
        return `<article class="roster-card"><div class="roster-art ${character.art}" aria-hidden="true"></div><div class="roster-info"><strong>${escapeHTML(character.name)}</strong><p>${escapeHTML(character.role)} · ${escapeHTML(character.personality)}</p><button class="btn ${added ? 'btn-quiet' : 'btn-primary'} btn-small" data-original-character="${escapeHTML(character.name)}" ${added ? 'disabled' : ''}>${added ? 'Added to cast' : '+ Add character'}</button></div></article>`;
      }).join('') : '<p class="small-print">No characters match. Try another name or role.</p>';
    }

    function selectOriginalCharacter(name) {
      const character = originalCharacters.find(item => item.name === name);
      if (!character) return;
      if (characterSummary().some(item => item.name.toLowerCase() === character.name.toLowerCase())) {
        toast(`${character.name} is already in your cast.`);
        return;
      }
      const current = $$('.character-block', cast);
      const emptySlot = current.find(block => ![...block.querySelectorAll('[data-char]')].some(input => input.value.trim()));
      const values = {name:character.name,personality:character.personality,hair:character.hair,outfit:character.outfit,description:character.description};
      if (emptySlot) {
        $$('[data-char]', emptySlot).forEach(input => input.value = values[input.dataset.char] || '');
      } else {
        if (current.length >= 8) {toast('Your cast is full. Remove a character first.', true);return;}
        addCharacter(values,current.length + 1);
      }
      renderCharacterLibrary();
      toast(`${character.name} added to your story.`);
    }

    function renderProjects() {
      const projects = safeProjects();
      const target = $('#projectsList');
      if (!projects.length) {
        target.innerHTML = '<div class="no-projects"><strong>No saved projects yet</strong><p>Build a storyboard and save it to find it here.</p><button class="btn btn-primary btn-small" data-go="create">Create your first project</button></div>';
        return;
      }
      target.innerHTML = `<div class="projects-list">${projects.map(project => `<article class="project-card"><h3>${escapeHTML(project.title || 'Untitled manga')}</h3><p>${escapeHTML(project.style || 'Manga')} · ${project.pages?.length || 0} pages · Edited ${new Date(project.updatedAt || Date.now()).toLocaleDateString()}</p><div class="project-actions"><button class="btn btn-primary btn-small" data-project="open" data-id="${escapeHTML(project.id)}">Open</button><button class="btn btn-quiet btn-small" data-project="rename" data-id="${escapeHTML(project.id)}">Rename</button><button class="btn btn-quiet btn-small" data-project="duplicate" data-id="${escapeHTML(project.id)}">Duplicate</button><button class="btn btn-quiet btn-small" data-project="delete" data-id="${escapeHTML(project.id)}">Delete</button></div></article>`).join('')}</div>`;
    }

    function openModal(title, message, options = {}) {
      const root = $('#modalRoot');
      root.innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><h2 id="modalTitle">${escapeHTML(title)}</h2><p>${escapeHTML(message)}</p>${options.input ? `<div class="field"><label for="modalInput">${escapeHTML(options.label || 'Name')}</label><input id="modalInput" type="text" maxlength="80" value="${escapeHTML(options.value || '')}"></div>` : ''}<div class="modal-actions"><button class="btn btn-quiet btn-small" data-modal="cancel">Cancel</button><button class="btn ${options.danger ? 'btn-quiet' : 'btn-primary'} btn-small" data-modal="confirm">${escapeHTML(options.confirm || 'OK')}</button></div></section></div>`;
      return new Promise(resolve => {
        const input = $('#modalInput', root);
        if (input) {input.focus();input.select();}
        root.addEventListener('click', function handler(event) {
          if (event.target.closest('[data-modal="cancel"]') || event.target.classList.contains('modal-backdrop')) {root.innerHTML='';root.removeEventListener('click',handler);resolve(null);}
          if (event.target.closest('[data-modal="confirm"]')) {const value = input ? input.value.trim() : true;root.innerHTML='';root.removeEventListener('click',handler);resolve(value || null);}
        });
      });
    }

    async function makeCanvas(pageIndex = activePage) {
      if (!activeStoryboard) return null;
      const page = activeStoryboard.pages[pageIndex];
      const canvas = document.createElement('canvas');
      const cols = activeStoryboard.layout === 'Four-panel strip' ? 1 : 2;
      const rows = Math.ceil(page.panels.length / cols);
      const width = 1200, gap = 18, margin = 30, cellW = (width - margin * 2 - gap * (cols - 1)) / cols, cellH = cellW * (activeStoryboard.aspectRatio.startsWith('Landscape') ? 2 / 3 : activeStoryboard.aspectRatio.startsWith('Square') ? 1 : 1.5);
      canvas.width = width; canvas.height = margin * 2 + rows * cellH + (rows - 1) * gap + 70;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f5f1e8';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='#201a2a';ctx.font='bold 24px sans-serif';ctx.fillText(`${activeStoryboard.title} — Page ${pageIndex + 1}`,margin,32);
      for (const [index,panel] of page.panels.entries()) {
        const col=index%cols,row=Math.floor(index/cols),x=margin+col*(cellW+gap),y=55+row*(cellH+gap);
        const gradient=ctx.createLinearGradient(x,y,x+cellW,y+cellH);gradient.addColorStop(0,'#e1d3ed');gradient.addColorStop(1,'#c7b5d5');
        ctx.fillStyle=gradient;ctx.fillRect(x,y,cellW,cellH);ctx.strokeStyle='#282231';ctx.lineWidth=7;ctx.strokeRect(x,y,cellW,cellH);
        ctx.fillStyle='#32273c';ctx.beginPath();ctx.ellipse(x+cellW/2,y+cellH*.4,cellW*.12,cellH*.16,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#d9b8b0';ctx.beginPath();ctx.ellipse(x+cellW/2,y+cellH*.44,cellW*.075,cellH*.105,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#251e2c';ctx.fillRect(x+cellW*.25,y+cellH*.59,cellW*.5,cellH*.37);
        ctx.fillStyle='#27212d';ctx.font='bold 16px sans-serif';ctx.fillText(`PANEL ${index+1} · STORYBOARD PREVIEW`,x+15,y+25);
        const sceneLines=wrapText(ctx,panel.description,cellW-34,'13px sans-serif',2);
        ctx.fillStyle='#f8f6f1e8';ctx.fillRect(x+7,y+37,cellW-14,sceneLines.length*17+10);
        ctx.fillStyle='#201a26';ctx.font='13px sans-serif';sceneLines.forEach((line,i)=>ctx.fillText(line,x+15,y+54+i*17));
        if(panel.dialogue){
          const bubbleWidth=Math.min(cellW-30,cellW*.8);
          const dialogueLines=wrapText(ctx,panel.dialogue,bubbleWidth-18,'13px sans-serif',2);
          const bubbleHeight=dialogueLines.length*17+16,bubbleY=y+cellH*.68;
          ctx.fillStyle='#fff';ctx.strokeStyle='#352b3b';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x+15,bubbleY,bubbleWidth,bubbleHeight,12);ctx.fill();ctx.stroke();
          ctx.fillStyle='#201a26';ctx.font='13px sans-serif';dialogueLines.forEach((line,i)=>ctx.fillText(line,x+24,bubbleY+20+i*17));
        }
        const footerText=[panel.caption,panel.sfx,panel.bubble].filter(Boolean).join(' · ');
        if(footerText){const footerLines=wrapText(ctx,footerText,cellW-30,'bold 11px sans-serif',2);ctx.fillStyle='#3d2c50';ctx.font='bold 11px sans-serif';footerLines.forEach((line,i)=>ctx.fillText(line,x+15,y+cellH-12-(footerLines.length-1-i)*14));}
        if(panel.characterPhoto){
          const image=await new Promise((resolve,reject)=>{const reference=new Image();reference.onload=()=>resolve(reference);reference.onerror=()=>reject(new Error(`Could not export ${panel.characterName || 'character'} photo reference.`));reference.src=panel.characterPhoto;});
          const size=Math.min(92,cellW*.19);
          ctx.fillStyle='#f8f6f1';ctx.fillRect(x+cellW-size-12,y+38,size+6,size+24);
          ctx.drawImage(image,x+cellW-size-9,y+41,size,size);
          ctx.fillStyle='#201a26';ctx.font='bold 9px sans-serif';ctx.fillText('PHOTO REF',x+cellW-size-8,y+41+size+14);
        }
      }
      return canvas;
    }
    function wrapText(ctx,text,maxWidth,font='15px sans-serif',maxLines=3){ctx.font=font;let line='',lines=[];for(const word of String(text||'').split(/\s+/)){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);return lines.slice(0,maxLines);}
    async function exportImage(type){try{const canvas=await makeCanvas();if(!canvas){toast('Generate a storyboard first.',true);return;}const link=document.createElement('a');link.download=`${(activeStoryboard.title||'manga').replace(/[^\w-]+/g,'-')}-page-${activePage+1}.${type==='image/jpeg'?'jpg':'png'}`;link.href=canvas.toDataURL(type,.92);link.click();toast(`${type==='image/jpeg'?'JPG':'PNG'} storyboard page downloaded.`);}catch(error){console.error('Unable to export storyboard image:',error);toast(error instanceof Error ? error.message : 'Could not export this page. Please try again.',true);}}

    document.addEventListener('click', async event => {
      const go = event.target.closest('[data-go]');
      if (go) {event.preventDefault();showView(go.dataset.go);}
      const originalCharacter = event.target.closest('[data-original-character]');
      if (originalCharacter) selectOriginalCharacter(originalCharacter.dataset.originalCharacter);
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'undo') undoRedo(history,future);
      if (action === 'redo') undoRedo(future,history);
      if (action === 'add-caption' || action === 'add-sfx' || action === 'add-bubble') {
        if (!activeStoryboard) {toast('Generate a storyboard before editing.',true);return;}
        const first=activeStoryboard.pages[activePage].panels[0];snapshot();
        const key=action==='add-caption'?'caption':action==='add-sfx'?'sfx':'bubble';
        first[key]=first[key] || (key==='caption'?'A moment to remember':key==='sfx'?'WHOOSH!':'Add speech here');
        renderStoryboard();toast(`${key==='sfx'?'Sound effect':key==='bubble'?'Speech bubble':'Caption'} added to panel 1.`);
      }
      if (action === 'export-png') exportImage('image/png');
      if (action === 'export-jpg') exportImage('image/jpeg');
      if (action === 'export-pdf') {
        if (!activeStoryboard) {toast('Generate a storyboard first.',true);return;}
        const pages=await Promise.all(activeStoryboard.pages.map(async (_,index)=>(await makeCanvas(index)).toDataURL('image/png')));
        const printWindow=window.open('','_blank');
        if(!printWindow){toast('Allow pop-ups to print or save your multi-page PDF.',true);return;}
        printWindow.onload=()=>setTimeout(()=>{printWindow.focus();printWindow.print();},250);
        printWindow.document.open();
        printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHTML(activeStoryboard.title)}</title><style>body{margin:0;color:#17131e;font:14px Arial,sans-serif}.page{height:100vh;display:grid;place-items:center;break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}img{display:block;max-width:100%;max-height:96vh;object-fit:contain}@page{size:auto;margin:8mm}</style></head><body>${pages.map(src=>`<div class="page"><img src="${src}" alt="Manga storyboard page"></div>`).join('')}</body></html>`);
        printWindow.document.close();
        toast('Print dialog opened. Choose “Save as PDF” for a multi-page export.');
      }
      if (action === 'pricing-info') await openModal('Coming soon', 'Paid plans will be offered after real image generation, sign-in, and cloud storage are connected.');
      if (action === 'footer-about') {event.preventDefault();await openModal('About MangaForge AI','A browser-based prototype for turning your written story into an editable manga storyboard. AI illustration, hosted accounts, and cloud services are not configured.');}
      if (action === 'footer-privacy') {event.preventDefault();await openModal('Privacy policy','Your story and projects are stored only in this browser using local storage. This prototype does not send stories, character references, or saved projects to a server. Clearing browser data will remove saved projects.');}
      if (action === 'footer-contact') {event.preventDefault();await openModal('Contact','This standalone prototype has no configured support inbox. Add your project contact details before publishing.');}
      const projectButton = event.target.closest('[data-project]');
      if (projectButton) {
        const projects=safeProjects(), index=projects.findIndex(item=>item.id===projectButton.dataset.id);
        if(index<0){toast('Project was not found on this device.',true);return;}
        const project=projects[index], operation=projectButton.dataset.project;
        if(operation==='open') hydrate(project);
        if(operation==='rename'){const name=await openModal('Rename project','Choose a name for your manga.',{input:true,label:'Project name',value:project.title,confirm:'Save'});if(name){project.title=name;project.updatedAt=new Date().toISOString();if(persistProjects(projects)){renderProjects();toast('Project renamed.');}}}
        if(operation==='duplicate'){const duplicate=JSON.parse(JSON.stringify(project));duplicate.id=crypto.randomUUID();duplicate.title=`${project.title} (copy)`;duplicate.updatedAt=new Date().toISOString();projects.unshift(duplicate);if(persistProjects(projects)){renderProjects();toast('Project duplicated.');}}
        if(operation==='delete'){const confirmed=await openModal('Delete project?','This removes the local project from this browser. This cannot be undone.',{confirm:'Delete',danger:true});if(confirmed){projects.splice(index,1);if(persistProjects(projects)){renderProjects();toast('Project deleted.');}}}
      }
    });

    storyInput.addEventListener('input',updateCount);
    $('#characterSearch').addEventListener('input',renderCharacterLibrary);
    $('#characterRole').addEventListener('change',renderCharacterLibrary);
    $('#exampleStory').addEventListener('click',()=>{storyInput.value=sampleStory;$('#projectName').value='The Starbound Letter';updateCount();storyInput.focus();});
    $('#galleryDemo').addEventListener('click',()=>{
      $('#pageCount').value='2';
      $('#panelCount').value='4';
      $('#style').value='Fantasy';
      $('#storyLanguage').value='English';
      $('#dialogueLanguage').value='English';
      storyInput.value=sampleStory;
      $('#projectName').value='The Starbound Letter';
      cast.innerHTML='';
      addCharacter({name:'Mira',personality:'Curious and inventive',hair:'Short, wavy dark hair',outfit:'Lilac jacket and a star-shaped hair clip',description:'A young rooftop inventor who collects broken music boxes'},1);
      addCharacter({name:'Ren',personality:'Loyal and quietly funny',hair:'Messy chestnut hair',outfit:'A deep blue travel coat',description:'Mira’s best friend and fearless co-pilot'},2);
      renderCharacterLibrary();
      updateCount();
      showView('create');
      sampleGeneration=true;
      $('#generateStoryboard').click();
      saveActive();
      toast('The Starbound Letter sample is ready and saved on this device.');
    });
    $('#addCharacter').addEventListener('click',()=>{if($$('.character-block',cast).length>=8){toast('You can add up to 8 characters.');return;}addCharacter();renderCharacterLibrary();});
    cast.addEventListener('click',event=>{
      const removePhoto=event.target.closest('[data-remove-photo]');
      if(removePhoto){
        const block=removePhoto.closest('[data-character]');
        const oldName=$('[data-char="name"]',block).value.trim();
        block.characterPhoto='';
        updateCharacterPhoto(block);
        if(activeStoryboard){
          const character=activeStoryboard.characters.find(item=>item.name===oldName);
          if(character)character.photo='';
          activeStoryboard.pages.flatMap(page=>page.panels).filter(panel=>panel.characterName===oldName).forEach(panel=>panel.characterPhoto='');
          renderStoryboard();
        }
        toast('Character photo removed from this device.');
      }
      if(event.target.closest('.remove-character')){
        if($$('.character-block',cast).length===1){toast('Keep at least one character slot.');return;}
        event.target.closest('.character-block').remove();
        $$('.character-head span',cast).forEach((label,i)=>label.textContent=`Character ${i+1}`);
        renderCharacterLibrary();
      }
    });
    cast.addEventListener('change',async event=>{
      const input=event.target.closest('[data-character-photo]');
      if(!input?.files?.[0])return;
      const block=input.closest('[data-character]');
      try{
        const photo=await readCharacterPhoto(input.files[0]);
        const name=$('[data-char="name"]',block).value.trim();
        block.characterPhoto=photo;
        updateCharacterPhoto(block);
        if(activeStoryboard){
          let character=activeStoryboard.characters.find(item=>item.name===name);
          if(!character){character={name,personality:'',hair:'',outfit:'',description:'',photo};activeStoryboard.characters.push(character);}
          character.photo=photo;
          activeStoryboard.pages.flatMap(page=>page.panels).filter(panel=>panel.characterName===name).forEach(panel=>panel.characterPhoto=photo);
          activeStoryboard.updatedAt=new Date().toISOString();
          renderStoryboard();
        }
        toast('Character photo added. It stays in this browser.');
      }catch(error){
        console.error('Unable to load character photo:',error);
        toast(error instanceof Error ? error.message : 'Could not load that photo. Try a PNG, JPG, or WebP image.',true);
      }
    });
    $('#referenceImage').addEventListener('change',event=>{
      const file=event.target.files?.[0];if(!file){referenceData='';$('#uploadStatus').textContent='No reference image selected. Upload is not sent to any service.';return;}
      if(file.size>2*1024*1024){event.target.value='';toast('Reference images must be 2 MB or smaller.',true);return;}
      const reader=new FileReader();reader.onload=()=>{referenceData=reader.result;$('#uploadStatus').textContent=`${file.name} · stored in this browser only; not uploaded.`;};reader.onerror=()=>{toast('Could not read that image. Please try another file.',true);};reader.readAsDataURL(file);
    });
    $('#clearStory').addEventListener('click',()=>{storyInput.value='';$('#projectName').value='';updateCount();});
    $('#generateStoryboard').addEventListener('click',()=>{
      const story=storyInput.value.trim();
      if(!story){toast('Write a story first, or load the example story.',true);storyInput.focus();return;}
      if(story.length<20){toast('Add a little more detail (at least 20 characters) to build a storyboard.',true);storyInput.focus();return;}
      snapshot();
      activeStoryboard=makeStoryboard(story,{id:sampleGeneration ? sampleProjectId : undefined});activePage=0;history=[];future=[];
      sampleGeneration=false;
      renderStoryboard();$('#editor').scrollIntoView({behavior:'smooth',block:'start'});
      toast(`Storyboard ready: ${activeStoryboard.pages.length} page${activeStoryboard.pages.length===1?'':'s'} in demo mode.`);
    });
    $('#saveProject').addEventListener('click',saveActive);
    $('#saveProjectTop').addEventListener('click',saveActive);
    $('#accountButton').addEventListener('click',()=>openModal('Guest mode','You are using MangaForge AI without an account. Sign-up and login require a configured authentication service; your saved projects stay in this browser.'));
    document.addEventListener('click',event=>{
      if(event.target.id==='modalDismiss')$('#modalRoot').innerHTML='';
    });
    const printStyle=document.createElement('style');printStyle.textContent='@media print{body{background:#fff;color:#111}.topbar,body>main>section:not(#create),#create>.workspace-head,#create>.notice,#create>.studio-grid>div:first-child,#create .editor-tools,#create .save-row button,.footer{display:none!important}#create{display:block!important;padding:0!important}.studio-grid{display:block!important}#create .card{border:0;background:#fff;padding:0}#editor{display:block!important}.scene-card{break-inside:avoid;border:1px solid #333}.scene-visual{background:#ddd!important}.page-tabs button{color:#111}.scene-content input,.scene-content textarea{color:#111;background:#fff;border-color:#ddd}.scene-content input::placeholder{color:transparent}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}';document.head.appendChild(printStyle);
    renderCharacterLibrary();
    updateCount();
  })();
