const WORKER_ENDPOINT = '/api/repair';
const PROMPT_ENDPOINT = '/api/prompt';
const STATUS_ENDPOINT = '/api/status';

const filtersData = [
    { name: "盲盒公仔", en:"Pop Mart", img: "https://images.unsplash.com/photo-1618331835717-801e976710b2?w=100", prompt: "cute pop mart style blind box toy, 3d render, chibi, detailed, soft lighting, 8k", cat:"创意" },
    { name: "粘土世界", en:"Clay Style", img: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100", prompt: "claymation style, stop motion, plasticine texture, soft focus, cute", cat:"创意" },
    { name: "微缩景观", en:"Tiny World", img: "https://images.unsplash.com/photo-1541661538396-53ba2d051eed?w=100", prompt: "isometric tiny world in a glass bottle, highly detailed, miniature, macro photography", cat:"风景" },
    { name: "吉卜力", en:"Ghibli", img: "https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=100", prompt: "anime style, studio ghibli, hayao miyazaki, vibrant colors, detailed background", cat:"动漫" },
    { name: "老照片修复", en:"Restoration", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100", prompt: "restore old photo, fix scratches, deblur, high resolution, realistic colorization", cat:"修复" },
    { name: "职业照", en:"Headshot", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", prompt: "professional business headshot, suit, studio lighting, clean background", cat:"人像" },
    { name: "极简Logo", en:"Vector Logo", img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100", prompt: "minimalist vector logo design, flat style, clean lines, white background", cat:"设计" }
];

let currentFile = null;
let selectedStyle = "";
let curLang = localStorage.getItem('lang') || 'cn';
let allGalleryItems = []; let currentCategory = '全部';

const i18nData = {
    cn: { emptyTitle: "创意影像工作室", emptyDesc: "上传照片进行 AI 修复，或者直接在底部输入文字进行创作。", uploadBtn: "点击上传图片", alertLimit: "今日额度已尽！是否允许显示广告以开启无限模式？", galleryMore: "更多", obBtnNext: "下一步", obBtnStart: "开始", ob: { s1: { t: "开始创作", d: "上传照片或输入文字。" }, s2: { t: "选择风格", d: "点击卡片选择风格。" } } },
    en: { emptyTitle: "Creative Studio", emptyDesc: "Upload a photo to fix, or type below to create.", uploadBtn: "Click to Upload", alertLimit: "Limit reached! Enable Unlimited Mode?", galleryMore: "More", obBtnNext: "Next", obBtnStart: "Start", ob: { s1: { t: "Start Here", d: "Upload or type." }, s2: { t: "Pick Style", d: "Choose a style card." } } }
};

function renderFilters() {
    const container = document.getElementById('styleScroll');
    const t = i18nData[curLang];
    let html = filtersData.map(f => {
        const name = curLang === 'cn' ? f.name : f.en;
        const isActive = selectedStyle === f.name ? 'active' : '';
        return `<div class="style-card ${isActive}" onclick="selectStyle(this, '${f.name}', '${f.prompt.replace(/'/g,"\\'")}')">
            <img src="${f.img}"><span>${name}</span>
        </div>`;
    }).join('');
    html += `<div class="style-card more-card" onclick="openGallery()">
                <div class="more-circle">+</div><span>${t.galleryMore}</span>
             </div>`;
    container.innerHTML = html;
}

function updateLanguage() {
    const t = i18nData[curLang];
    document.querySelectorAll('[data-i18n]').forEach(el => { if(t[el.getAttribute('data-i18n')]) el.innerText = t[el.getAttribute('data-i18n')]; });
    document.getElementById('langToggle').innerText = curLang.toUpperCase();
    document.getElementById('promptInput').placeholder = "在这里开始你的天才想法...";
    renderFilters();
}
document.getElementById('langToggle').addEventListener('click', () => { curLang = curLang === 'cn' ? 'en' : 'cn'; localStorage.setItem('lang', curLang); updateLanguage(); });

window.selectStyle = function(el, name, prompt) {
    if (selectedStyle === name) { selectedStyle = ""; document.getElementById('promptInput').value = ""; renderFilters(); } 
    else { selectedStyle = name; document.getElementById('promptInput').value = prompt; renderFilters(); }
}

const magicBtn = document.getElementById('magicBtn');
magicBtn.addEventListener('click', async () => {
    for (let i = 0; i < 8; i++) {
    createParticle();
    }
    // Optional: add loading effect
    magicBtn.classList.add("loading");
    //setTimeout(() => magicBtn.classList.remove("loading"), 800);
    
    const formData = new FormData();
    formData.append('style', selectedStyle || "Creative");
    if (currentFile) formData.append('photo', await compressImage(currentFile, 512));
    try {
        const res = await fetch(PROMPT_ENDPOINT, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'success') document.getElementById('promptInput').value = data.prompt;
    } catch (e) { console.error(e); }
    magicBtn.classList.remove('loading');
});

function createParticle() {
  const particle = document.createElement("div");
  particle.className = "particle";
  
  // Random direction
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.random() * 20 + 10; // distance
  particle.style.setProperty('--tx', `${Math.cos(angle) * radius}px`);
  particle.style.setProperty('--ty', `${Math.sin(angle) * radius}px`);

  magicBtn.appendChild(particle);

  // Remove after animation
  setTimeout(() => particle.remove(), 600);
}

const photoFile = document.getElementById('photoFile');
photoFile.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        document.getElementById('displayImage').src = ev.target.result;
        document.getElementById('displayImage').classList.remove('pixelating');
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('imageContainer').style.display = 'inline-flex';
        document.getElementById('imageContainer').classList.add('loaded');
    }
    reader.readAsDataURL(file);
});

window.resetCanvas = function() {
    currentFile = null; photoFile.value = ''; 
    document.getElementById('displayImage').src = '';
    document.getElementById('imageContainer').style.display = 'none';
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('promptInput').value = '';
    document.getElementById('shareBtnNav').classList.remove('visible');
    selectedStyle = ""; renderFilters();
}

const previewModal = document.getElementById('previewModal');
const previewImg = document.getElementById('previewImg');
window.openPreview = function() { const src = document.getElementById('displayImage').src; if(!src) return; previewImg.src = src; previewModal.style.display = 'flex'; requestAnimationFrame(() => previewModal.classList.add('visible')); }
window.closePreview = function() { previewModal.classList.remove('visible'); setTimeout(() => previewModal.style.display = 'none', 300); }

const shareModal = document.getElementById('shareModal');
window.openShareModal = async function() {
    const src = document.getElementById('displayImage').src || "https://images.unsplash.com/photo-1518105570919-e342af1a2961?w=500&q=80"; 
    shareModal.style.display = 'flex'; setTimeout(() => shareModal.classList.add('visible'), 10);
    const canvasContainer = document.getElementById('canvasContainer'); canvasContainer.innerHTML = '生成海报中...';
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    const w = 1080, h = 1440; canvas.width = w; canvas.height = h;

    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);

    try {
        const img = new Image(); img.crossOrigin = "Anonymous"; img.src = src;
        await new Promise((r, j) => { img.onload = r; img.onerror = j; });
        const imgRatio = img.width / img.height;
        const drawH = 500; const drawW = drawH * imgRatio; const x = (w - drawW) / 2;
        ctx.drawImage(img, x, 100, drawW, drawH);
        ctx.fillStyle = '#1d1d1f'; ctx.font = '800 36px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.textAlign = 'center'; ctx.fillText("NANO BANANA", w/2, 660);
        ctx.fillStyle = '#86868b'; ctx.font = '500 20px -apple-system, BlinkMacSystemFont, sans-serif'; ctx.fillText("一句话 PS · 创意无限", w/2, 695); ctx.fillText("https://ps.bobot.fun", w/2, 725);
        const qrDiv = document.createElement('div'); new QRCode(qrDiv, { text: "https://ps.bobot.fun", width: 90, height: 90, colorDark : "#1d1d1f" });
        const qrImg = qrDiv.querySelector('img'); if(qrImg) { await new Promise(r => qrImg.onload = r); ctx.drawImage(qrImg, w - 135, 760, 90, 90); ctx.fillStyle = "#FFC20E"; ctx.font = "bold 14px sans-serif"; ctx.textAlign="center"; ctx.fillText("SCAN ME", w - 90, 870); }
        const finalImg = new Image(); finalImg.src = canvas.toDataURL(); finalImg.style.maxWidth = '100%'; finalImg.style.borderRadius = '12px'; finalImg.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
        canvasContainer.innerHTML = ''; canvasContainer.appendChild(finalImg);
    } catch (e) { console.error(e); canvasContainer.innerHTML = '生成失败 (CORS Error)'; }
}
window.closeShareModal = function() { shareModal.classList.remove('visible'); setTimeout(() => shareModal.style.display = 'none', 300); }

const commandForm = document.getElementById('commandForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const adToggle = document.getElementById('adToggle');
const adWrapper = document.getElementById('adWrapper');
const mockAd = document.getElementById('mockAd'); 
const realAd = document.getElementById('adBox');
const adSlot = document.getElementById('adSlot');

if(localStorage.getItem('hasHitLimit') === 'true' || localStorage.getItem('isUnlimitedMode') === 'true') {
    adWrapper.style.display = 'flex';
}
if(localStorage.getItem('isUnlimitedMode') === 'true') {
    adToggle.checked = true; 
    adSlot.style.display = 'block'; 
    mockAd.style.display = 'flex'; realAd.style.display = 'none';
}

adToggle.addEventListener('change', (e) => {
     localStorage.setItem('isUnlimitedMode', e.target.checked);
     adSlot.style.display = e.target.checked ? 'block' : 'none';
     if(e.target.checked) { mockAd.style.display = 'flex'; realAd.style.display = 'none'; }
});

async function compressImage(file, maxWidth = 1280) {
    return new Promise((resolve) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const c = document.createElement('canvas');
                let w = img.width, h = img.height;
                if(w>h) { if(w>maxWidth){h*=maxWidth/w;w=maxWidth}} else { if(h>maxWidth){w*=maxWidth/h;h=maxWidth}}
                c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
                c.toBlob(b=>resolve(new File([b],file.name,{type:'image/jpeg'})),'image/jpeg',0.8);
            }
        }
    });
}

async function pollTask(taskId) {
    for(let i=0; i<100; i++) {
        const res = await fetch(`${STATUS_ENDPOINT}?taskId=${taskId}`);
        const data = await res.json();
        if(data.status === 'completed') return data.image;
        if(data.status === 'error') throw new Error(data.message);
        await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error("Timeout");
}

let turnstileToken = null;
window.onTurnstileRender = function() {
     turnstile.render('#turnstile-container', {
        sitekey: '0x4AAAAAACC22XM_s96N5NEw',
        callback: (t) => { turnstileToken = t; document.getElementById('verifyModal').classList.remove('visible'); setTimeout(()=>{document.getElementById('verifyModal').style.display='none'},300); document.getElementById('commandForm').dispatchEvent(new Event('submit')); }
     });
}

commandForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = document.getElementById('promptInput').value.trim();
    if(!currentFile && !prompt) return;
    
    if(!currentFile) {
         document.getElementById('displayImage').src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNTAwIDMwMCI+PHJlY3Qgd2lkdGg9IjUwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMmZjZmYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSI0MCIgZmlsbD0iI2RkZCI+QUk8L3RleHQ+PC9zdmc+';
         document.getElementById('displayImage').classList.add('pixelating');
         document.getElementById('emptyState').style.display = 'none';
         document.getElementById('imageContainer').style.display = 'inline-flex';
         document.getElementById('imageContainer').classList.add('loaded');
    }

    if (localStorage.getItem('hasHitLimit') === 'true' || localStorage.getItem('isUnlimitedMode') === 'true') {
         document.getElementById('adWrapper').style.display = 'flex'; 
    }

    loadingOverlay.style.display = 'flex';
    requestAnimationFrame(()=>loadingOverlay.classList.add('visible'));
    document.querySelector('.snake-border').classList.add('active');

    const formData = new FormData();
    if(currentFile) formData.append('photo', await compressImage(currentFile));
    formData.append('prompt', prompt);
    if(adToggle.checked) formData.append('isUnlimited', 'true');
    if(turnstileToken) formData.append('turnstileToken', turnstileToken);

    try {
        if(adToggle.checked) await new Promise(r=>setTimeout(r,4000));

        const res = await fetch(WORKER_ENDPOINT, {method:'POST', body:formData});
        const data = await res.json();

        if(res.status === 401) {
            document.getElementById('verifyModal').style.display = 'flex';
            setTimeout(()=>document.getElementById('verifyModal').classList.add('visible'),10);
            window.onTurnstileRender(); 
            return;
        }
        if(res.status === 429) {
            if(confirm(i18nData[curLang].alertLimit)) {
                localStorage.setItem('hasHitLimit', 'true');
                adWrapper.style.display = 'flex';
                adToggle.checked = true;
                adSlot.style.display = 'block';
                mockAd.style.display = 'flex';
                localStorage.setItem('isUnlimitedMode', 'true');
                setTimeout(() => { commandForm.dispatchEvent(new Event('submit')); }, 500);
            }
            return;
        }
        
        let img = null;
        if(data.taskId) img = await pollTask(data.taskId);
        else if(data.image) img = data.image;
        
        if(img) {
            document.getElementById('displayImage').src = img;
            document.getElementById('displayImage').classList.remove('pixelating');
            const blob = await (await fetch(img)).blob();
            currentFile = new File([blob], "edit.png", {type:'image/png'});
            document.getElementById('promptInput').value = '';
            const shareBtn = document.getElementById('shareBtnNav');
            shareBtn.style.display = 'flex';
            shareBtn.classList.add('visible');
        }

    } catch(e) { console.error(e); alert("AI Busy or Error"); } finally {
        if(!turnstileToken) { 
            loadingOverlay.classList.remove('visible');
            setTimeout(()=>loadingOverlay.style.display='none',300);
            document.querySelector('.snake-border').classList.remove('active');
        }
        turnstileToken = null; 
    }
});

window.openGallery = function() { document.getElementById('galleryModal').classList.add('open'); fetchAndRenderGallery(); }
document.getElementById('closeGallery').onclick = ()=>document.getElementById('galleryModal').classList.remove('open');

async function fetchAndRenderGallery() {
     const res = await fetch('/api/gallery').catch(()=>null); 
     const data = res ? await res.json() : null;
     if(data && Array.isArray(data) && data.length > 0) { allGalleryItems = data; } 
     else { allGalleryItems = filtersData.map(i => ({...i, category: i.cat || '精选', img_url: i.img, title: i.name })); }
     renderGalleryTabs(); renderGalleryGrid();
}
function renderGalleryTabs() {
    const categories = ['全部', ...new Set(allGalleryItems.map(item => item.category || '其他'))];
    galleryTabs.innerHTML = categories.map(cat => `<button class="tab-btn ${cat === currentCategory ? 'active' : ''}" onclick="switchCategory('${cat}')">${cat}</button>`).join('');
}
window.switchCategory = function(cat) { currentCategory = cat; renderGalleryTabs(); renderGalleryGrid(); }
function renderGalleryGrid() {
     let items = currentCategory === '全部' ? allGalleryItems : allGalleryItems.filter(item => (item.category || '其他') === currentCategory);
     galleryGrid.innerHTML = items.map(i => `
         <div class="gallery-item" onclick="applyGallery('${i.prompt.replace(/'/g,"\\'")}','${i.img_url || i.img}')">
             <img src="${i.img_url || i.img}" class="gallery-img" alt="${i.title || i.name}" onerror="handleGalleryImageError(this)">
             <div class="gallery-overlay">
                 <div class="gallery-title">${i.title || i.name}</div>
             </div>
         </div>`).join('');
}
window.applyGallery = function(p, url) {
     document.getElementById('promptInput').value = p;
     document.getElementById('galleryModal').classList.remove('open');
}

const obSteps = [ { id: 'emptyState', key: 's1', pos: 'bottom' }, { id: 'styleScroll', key: 's2', pos: 'top' } ];
let curStepIdx = 0;
function initOnboarding() { if (!localStorage.getItem('hasSeenOb_v_final_split')) { document.getElementById('obBackdrop').style.display = 'block'; setTimeout(() => document.getElementById('obBackdrop').classList.add('visible'), 10); showStep(0); } }
function showStep(idx) {
    document.querySelectorAll('.ob-highlight').forEach(el => el.classList.remove('ob-highlight'));
    const tooltip = document.getElementById('obTooltip'); tooltip.style.display = 'none'; tooltip.className = 'ob-tooltip'; 
    if (idx >= obSteps.length) { document.getElementById('obBackdrop').classList.remove('visible'); setTimeout(() => document.getElementById('obBackdrop').style.display = 'none', 300); localStorage.setItem('hasSeenOb_v_final_split', 'true'); return; }
    curStepIdx = idx; const step = obSteps[idx]; const el = document.getElementById(step.id) || document.querySelector('.magic-bar-wrapper'); const content = i18nData[curLang].ob[step.key];
    el.classList.add('ob-highlight'); const rect = el.getBoundingClientRect();
    tooltip.style.display = 'block'; document.getElementById('obTitle').innerText = content.t; document.getElementById('obDesc').innerText = content.d;
    const btnText = idx === obSteps.length - 1 ? i18nData[curLang].obBtnStart : i18nData[curLang].obBtnNext;
    document.getElementById('obBtn').innerText = btnText;
    const tooltipWidth = 280; let left = rect.left + rect.width / 2 - (tooltipWidth / 2); let arrowPos = '50%';
    const padding = 20; if (left + tooltipWidth > window.innerWidth - padding) { left = window.innerWidth - tooltipWidth - padding; const targetCenter = rect.left + rect.width / 2; arrowPos = `${targetCenter - left}px`; } if (left < padding) { left = padding; const targetCenter = rect.left + rect.width / 2; arrowPos = `${targetCenter - padding}px`; }
    document.documentElement.style.setProperty('--arrow-pos', arrowPos); tooltip.style.left = left + 'px';
    if (step.pos === 'bottom') { tooltip.style.top = (rect.bottom + 15) + 'px'; tooltip.classList.add('arrow-top'); } else { tooltip.style.top = (rect.top - tooltip.offsetHeight - 15) + 'px'; tooltip.classList.add('arrow-bottom'); }
}
document.getElementById('obBtn').addEventListener('click', () => showStep(curStepIdx + 1));
setTimeout(initOnboarding, 1000);

renderFilters(); updateLanguage();

// 处理图片加载失败
window.handleGalleryImageError = function(img) {
    img.classList.add('img-error');
    img.removeAttribute('src');
    console.log('图片加载失败:', img.alt || '未命名图片');
}

// 检查已存在的图片
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.gallery-img').forEach(img => {
        if (img.complete && img.naturalWidth === 0) {
            handleGalleryImageError(img);
        }
    });
});
