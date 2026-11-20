/* 拾物圖鑑 — Supabase 版 */
const CAT_COLORS = ["#c9a27a","#8fae8b","#d98e7a","#7fa3c2","#d1bc5f","#a68fc4","#c88ba6","#9a9a90"];
const ACCENTS = ["#222222","#8c5a3c","#3f6e74","#5b7553","#a8483a","#4a5a8a"];
const DEFAULT_STYLE = {title:"拾物圖鑑", sub:"", theme:"light", font:"sans", accent:"#222222", ratio:"1/1", cols:"2", captions:true, dots:true};
const BUCKET = "photos";

const cfg = window.SITE_CONFIG || {};
const configured = cfg.SUPABASE_URL && cfg.SUPABASE_KEY && !cfg.SUPABASE_URL.includes("YOUR_");
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY) : null;

let viewIds=[], currentId=null;
let canWrite=false, items=[], cats=[], style={...DEFAULT_STYLE};
let tab="__all", editing=null, formCat="", formPhotos=[], uploading=0;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const photoUrl = path => sb ? sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : "";
const fmtDate = d => d ? String(d).replace(/-/g,".") : "";
const catById = id => cats.find(c=>c.id===id);
const uid = () => Math.random().toString(36).slice(2,10);
const sizeOf = i => [i.l,i.w,i.h].filter(v=>v!==""&&v!=null).join(" × ");
const numLabel = i => "No." + String(i.num).padStart(3,"0");
const errMsg = e => e?.message || String(e);
function setNotice(t){ const n=$("notice"); if(t){n.textContent=t;n.classList.remove("hidden");} else n.classList.add("hidden"); }

/* ---------- data layer ---------- */
const fromRow = r => ({ id:r.id, num:r.num, categoryId:r.category_id||"", name:r.name, date:r.date||"", place:r.place||"",
  kind:r.kind||"", l:r.l??"", w:r.w??"", h:r.h??"", weight:r.weight??"", tags:r.tags||[], notes:r.notes||"",
  photos:r.photos||[], createdAt:r.created_at });
const nz = v => v===""||v==null ? null : Number(v);
const toRow = d => ({ num:d.num, category_id:d.categoryId||null, name:d.name, date:d.date||null, place:d.place, kind:d.kind,
  l:nz(d.l), w:nz(d.w), h:nz(d.h), weight:nz(d.weight), tags:d.tags, notes:d.notes, photos:d.photos, updated_at:new Date().toISOString() });

async function loadAll(){
  const [it, st] = await Promise.all([
    sb.from("items").select("*").order("num"),
    sb.from("settings").select("key,value")
  ]);
  if(it.error) throw it.error;
  if(st.error) throw st.error;
  items = it.data.map(fromRow);
  const get = k => st.data.find(r=>r.key===k)?.value;
  const c = get("categories");
  cats = Array.isArray(c?.list) ? c.list.filter(x=>x&&x.id&&x.name) : [];
  const s = get("style");
  style = {...DEFAULT_STYLE, ...(s&&typeof s==="object"?s:{})};
  items.forEach(i=>{ if(i.categoryId && !catById(i.categoryId)) i.categoryId=""; });
  applyStyle(); render();
}
async function saveSetting(key, value){
  const { error } = await sb.from("settings").upsert({key, value});
  if(error) throw error;
}

/* ---------- appearance ---------- */
function applyStyle(){
  const s=style, html=document.documentElement;
  html.dataset.theme = ["light","warm","dark"].includes(s.theme)?s.theme:"light";
  html.dataset.font = ["sans","serif","kai"].includes(s.font)?s.font:"sans";
  let accent = /^#[0-9a-f]{6}$/i.test(s.accent)?s.accent:"#222222";
  if(html.dataset.theme==="dark" && accent==="#222222") accent="#ededea";
  html.style.setProperty("--accent", accent);
  html.style.setProperty("--ratio", ["1/1","4/5","3/4","4/3"].includes(s.ratio)?s.ratio:"1/1");
  html.style.setProperty("--cols", ["1","2","3"].includes(String(s.cols))?s.cols:"2");
  html.classList.toggle("nocap", s.captions===false);
  $("siteTitle").textContent = s.title || DEFAULT_STYLE.title;
  document.title = s.title || DEFAULT_STYLE.title;
  $("siteSub").textContent = s.sub||""; $("siteSub").classList.toggle("hidden", !s.sub);
}
function renderStyleSheet(){
  document.querySelectorAll("#styleOv .seg").forEach(seg=>{
    seg.querySelectorAll("button").forEach(b=>b.classList.toggle("on", String(style[seg.dataset.key])===b.dataset.v));
  });
  $("accentSw").innerHTML = ACCENTS.map(c=>`<button class="sw ${style.accent===c?"on":""}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join("");
  $("capSwitch").classList.toggle("on", style.captions!==false);
  $("dotSwitch").classList.toggle("on", style.dots!==false);
}
let styleTimer=null;
function setStyle(patch, delay=0){
  style={...style,...patch}; applyStyle(); renderStyleSheet(); render();
  clearTimeout(styleTimer);
  styleTimer=setTimeout(()=>saveSetting("style",{...style}).catch(e=>console.warn(e)), delay);
}
$("styleBtn").addEventListener("click", ()=>{ $("sTitle").value=style.title||""; $("sSub").value=style.sub||""; renderStyleSheet(); open("styleOv"); });
document.querySelectorAll("#styleOv .seg").forEach(seg=>seg.addEventListener("click", e=>{
  const b=e.target.closest("button"); if(b) setStyle({[seg.dataset.key]:b.dataset.v});
}));
$("accentSw").addEventListener("click", e=>{ const b=e.target.closest(".sw"); if(b) setStyle({accent:b.dataset.c}); });
$("capSwitch").addEventListener("click", ()=>setStyle({captions: style.captions===false}));
$("dotSwitch").addEventListener("click", ()=>setStyle({dots: style.dots===false}));
$("sTitle").addEventListener("input", e=>setStyle({title:e.target.value.trim()}, 700));
$("sSub").addEventListener("input", e=>setStyle({sub:e.target.value.trim()}, 700));
$("resetStyle").addEventListener("click", ()=>{ setStyle({...DEFAULT_STYLE}); $("sTitle").value=style.title; $("sSub").value=""; });

/* ---------- main render ---------- */
function render(){
  const q=$("q").value.trim().toLowerCase(), sort=$("sort").value;
  const places=new Set(items.map(i=>(i.place||"").trim()).filter(Boolean)).size;
  $("count").textContent = items.length ? `${items.length} 件${places?` · ${places} 個地點`:""}` : "";
  const count=id=>items.filter(i=>i.categoryId===id).length, uncat=count("");
  if(tab!=="__all" && tab!=="" && !catById(tab)) tab="__all";
  if(tab==="" && !uncat) tab="__all";
  $("index").innerHTML =
    `<button class="tab ${tab==="__all"?"on":""}" data-t="__all">全部<span class="c">${items.length}</span></button>`
    + cats.map(c=>`<button class="tab ${tab===c.id?"on":""}" data-t="${esc(c.id)}">${esc(c.name)}<span class="c">${count(c.id)}</span></button>`).join("")
    + (uncat?`<button class="tab ${tab===""?"on":""}" data-t="">未分類<span class="c">${uncat}</span></button>`:"")
    + (canWrite?`<button class="tab manage" id="manageBtn">${cats.length?"編輯分類":"＋ 建立分類"}</button>`:"");

  let list=items.filter(i=>tab==="__all"||i.categoryId===tab);
  if(q) list=list.filter(i=>[i.name,i.place,i.kind,i.notes,catById(i.categoryId)?.name,numLabel(i),(i.tags||[]).join(" ")].join(" ").toLowerCase().includes(q));
  list.sort((a,b)=>{
    if(sort==="name") return (a.name||"").localeCompare(b.name||"","zh-Hant");
    if(sort==="size") return (Number(b.l)||0)-(Number(a.l)||0);
    if(sort==="date") return String(b.date||"").localeCompare(String(a.date||""));
    return a.num-b.num;
  });
  const showDot = style.dots!==false;
  viewIds = list.map(i=>i.id);
  $("grid").innerHTML=list.map(i=>{
    const p=(i.photos||[])[0], c=catById(i.categoryId);
    return `<article class="item" data-id="${esc(i.id)}">
      <div class="photo">${p?`<img loading="lazy" src="${esc(photoUrl(p))}" alt="${esc(i.name)}">`:`<span class="none">無照片</span>`}</div>
      <div class="cap"><h3>${showDot&&c?`<span class="dot" style="background:${esc(c.color)}"></span>`:""}${esc(i.name||"未命名")}</h3>
      <small><span>${numLabel(i)}</span><span>${esc(i.place||fmtDate(i.date))}</span></small></div>
    </article>`;
  }).join("");
  const e=$("empty"); e.classList.toggle("hidden", !(sb&&list.length===0));
  e.textContent = items.length ? "這裡還沒有東西。" : (canWrite ? "還沒有收藏。按右下角 ＋ 新增第一件。" : "還沒有收藏。");
  const uniq=f=>[...new Set(items.map(f).filter(Boolean))].map(v=>`<option value="${esc(v)}">`).join("");
  $("placeList").innerHTML=uniq(i=>i.place); $("kindList").innerHTML=uniq(i=>i.kind);
  if(!$("mgrOv").classList.contains("hidden") && !(document.activeElement?.tagName==="INPUT" && $("mgrList").contains(document.activeElement))) renderMgr();
}
$("q").addEventListener("input", render);
$("sort").addEventListener("change", render);
$("index").addEventListener("click", e=>{
  if(e.target.closest("#manageBtn")){ openMgr(); return; }
  const b=e.target.closest(".tab"); if(b){ tab=b.dataset.t; render(); }
});
$("grid").addEventListener("click", e=>{ const c=e.target.closest(".item"); if(c) openDetail(c.dataset.id); });
document.addEventListener("click", e=>{
  const c=e.target.closest("[data-close]"); if(c) close(c.dataset.close);
  if(e.target.classList.contains("overlay")) close(e.target.id);
});
function open(id){ $(id).classList.remove("hidden"); document.body.style.overflow="hidden"; }
function close(id){ $(id).classList.add("hidden"); if([...document.querySelectorAll(".overlay")].every(o=>o.classList.contains("hidden"))) document.body.style.overflow=""; }

/* ---------- auth ---------- */
function setAuthUI(session){
  canWrite = !!session;
  $("authBtn").textContent = session ? "登出" : "登入";
  $("styleBtn").classList.toggle("hidden", !canWrite);
  $("fab").classList.toggle("hidden", !canWrite);
  render();
}
$("authBtn").addEventListener("click", async ()=>{
  if(!sb) return;
  if(canWrite){ await sb.auth.signOut(); return; }
  $("loginErr").classList.add("hidden"); open("loginOv"); $("lEmail").focus();
});
$("loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  $("loginBtn").disabled=true;
  const { error } = await sb.auth.signInWithPassword({ email:$("lEmail").value.trim(), password:$("lPass").value });
  $("loginBtn").disabled=false;
  if(error){ const b=$("loginErr"); b.textContent = error.message.includes("Invalid") ? "Email 或密碼不對。" : "登入失敗："+error.message; b.classList.remove("hidden"); return; }
  $("lPass").value=""; close("loginOv");
});

/* ---------- categories ---------- */
let catWrite=Promise.resolve();
function saveCats(next){
  cats=next; render();
  catWrite=catWrite.then(()=>saveSetting("categories",{list:next})).catch(err=>{
    const b=$("mgrErr"); b.textContent="分類儲存失敗："+errMsg(err); b.classList.remove("hidden");
  });
  return catWrite;
}
function addCat(name){
  name=name.trim(); if(!name) return null;
  const exist=cats.find(c=>c.name===name); if(exist) return exist;
  const c={id:uid(), name, color:CAT_COLORS[cats.length%CAT_COLORS.length]};
  saveCats([...cats,c]); return c;
}
function openMgr(){ $("mgrErr").classList.add("hidden"); renderMgr(); open("mgrOv"); }
let pickerFor=null, delFor=null;
function renderMgr(){
  const count=id=>items.filter(i=>i.categoryId===id).length;
  $("mgrList").innerHTML = cats.length ? cats.map((c,ix)=>`
    <div class="mgr-row" data-id="${esc(c.id)}">
      <button class="cdot" data-act="color" style="background:${esc(c.color)}" aria-label="換顏色"></button>
      <input class="in" data-act="name" value="${esc(c.name)}" maxlength="20">
      <span class="cnt">${count(c.id)} 件</span>
      <button class="icon-btn" data-act="up" ${ix===0?"disabled style='opacity:.25'":""} aria-label="上移">↑</button>
      <button class="icon-btn" data-act="del" aria-label="刪除">刪除</button>
    </div>
    ${pickerFor===c.id?`<div class="swatches" style="padding:10px 0">${CAT_COLORS.map(col=>`<button class="sw ${col===c.color?"on":""}" data-sw="${col}" data-id="${esc(c.id)}" style="background:${col}"></button>`).join("")}</div>`:""}
    ${delFor===c.id?`<div class="confirm">刪除「${esc(c.name)}」？裡面的 ${count(c.id)} 件會移到「未分類」。
      <div class="btns" style="margin-top:12px"><button class="btn" data-act="delNo" data-id="${esc(c.id)}">取消</button><button class="btn danger" data-act="delYes" data-id="${esc(c.id)}">刪除</button></div></div>`:""}
  `).join("") : `<p class="hint" style="padding:6px 0">還沒有分類。</p>`;
}
$("mgrList").addEventListener("click", async e=>{
  const sw=e.target.closest("[data-sw]");
  if(sw){ pickerFor=null; saveCats(cats.map(c=>c.id===sw.dataset.id?{...c,color:sw.dataset.sw}:c)); renderMgr(); return; }
  const b=e.target.closest("[data-act]"); if(!b) return;
  const id=b.dataset.id||b.closest(".mgr-row")?.dataset.id, act=b.dataset.act;
  if(act==="color"){ pickerFor=pickerFor===id?null:id; delFor=null; renderMgr(); }
  if(act==="up"){ const ix=cats.findIndex(c=>c.id===id); if(ix>0){ const n=[...cats]; [n[ix-1],n[ix]]=[n[ix],n[ix-1]]; saveCats(n); renderMgr(); } }
  if(act==="del"){ delFor=delFor===id?null:id; pickerFor=null; renderMgr(); }
  if(act==="delNo"){ delFor=null; renderMgr(); }
  if(act==="delYes"){
    b.disabled=true;
    try{
      const { error } = await sb.from("items").update({category_id:null}).eq("category_id", id);
      if(error) throw error;
      items.forEach(i=>{ if(i.categoryId===id) i.categoryId=""; });
      delFor=null; await saveCats(cats.filter(c=>c.id!==id)); renderMgr();
    }catch(err){ const x=$("mgrErr"); x.textContent="刪除失敗："+errMsg(err); x.classList.remove("hidden"); }
  }
});
let nameTimer=null;
$("mgrList").addEventListener("input", e=>{
  if(e.target.dataset.act!=="name") return;
  const id=e.target.closest(".mgr-row").dataset.id, v=e.target.value.trim();
  clearTimeout(nameTimer);
  nameTimer=setTimeout(()=>{ if(v) saveCats(cats.map(c=>c.id===id?{...c,name:v}:c)); }, 600);
});
function mgrAdd(){ if(addCat($("mgrNew").value)){ $("mgrNew").value=""; renderMgr(); } }
$("mgrAdd").addEventListener("click", mgrAdd);
$("mgrNew").addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); mgrAdd(); } });

/* ---------- detail ---------- */
function stepDetail(dir){
  if(!currentId || viewIds.length<2) return;
  const ix=viewIds.indexOf(currentId); if(ix<0) return;
  openDetail(viewIds[(ix+dir+viewIds.length)%viewIds.length]);
  $("det").scrollTop=0;
}
document.addEventListener("keydown", e=>{
  if($("detOv").classList.contains("hidden")) return;
  if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
  if(e.key==="ArrowRight"){ e.preventDefault(); stepDetail(1); }
  else if(e.key==="ArrowLeft"){ e.preventDefault(); stepDetail(-1); }
  else if(e.key==="Escape"){ close("detOv"); }
});
function openDetail(id){
  const i=items.find(x=>x.id===id); if(!i) return;
  currentId=id;
  const pos=viewIds.indexOf(id), total=viewIds.length;
  const nav = total>1 && pos>=0 ? `<div class="dnav"><button class="navb" data-step="-1" aria-label="上一件">‹</button><span>${pos+1} / ${total}</span><button class="navb" data-step="1" aria-label="下一件">›</button></div>` : "";
  const c=catById(i.categoryId), photos=i.photos||[];
  const rows=[["分類",c?.name||"未分類"],["撿拾日期",fmtDate(i.date)||"無"],["地點",i.place],["種類／材質",i.kind],
    ["尺寸",sizeOf(i)?sizeOf(i)+" cm":""],["重量",i.weight!==""&&i.weight!=null?i.weight+" g":""]].filter(r=>r[1]);
  $("det").innerHTML=`
    <div class="sheet-h"><span class="d-sub">${numLabel(i)}</span>${nav}<button class="x" data-close="detOv">×</button></div>
    ${photos.length?`<div class="hero" id="hero">${photos.map(p=>`<img src="${esc(photoUrl(p))}" alt="">`).join("")}</div>
      ${photos.length>1?`<div class="dots" id="dots">1 / ${photos.length}</div>`:""}`:""}
    <div class="d-title">${esc(i.name||"未命名")}</div>
    <dl class="fields">${rows.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    ${(i.tags||[]).length?`<div class="tags">${i.tags.map(t=>`<span>#${esc(t)}</span>`).join("")}</div>`:""}
    ${i.notes?`<div class="notes"><div style="font-size:11px;color:var(--muted);letter-spacing:.06em;margin-bottom:4px">備註</div>${esc(i.notes)}</div>`:""}
    ${canWrite?`<div class="btns"><button class="btn danger" id="delBtn">刪除</button><button class="btn primary" id="editBtn">編輯</button></div><div id="delBox"></div>`:""}`;
  open("detOv");
  $("det").querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>stepDetail(Number(b.dataset.step)));
  const hero=$("hero");
  if(hero&&photos.length>1) hero.addEventListener("scroll",()=>{ $("dots").textContent=`${Math.round(hero.scrollLeft/hero.clientWidth)+1} / ${photos.length}`; });
  if(!canWrite) return;
  $("editBtn").onclick=()=>{ close("detOv"); openForm(i); };
  $("delBtn").onclick=()=>{
    $("delBox").innerHTML=`<div class="confirm">確定刪除「${esc(i.name||"未命名")}」和它的照片？無法復原。
      <div class="btns" style="margin-top:12px"><button class="btn" id="delNo">保留</button><button class="btn danger" id="delYes">刪除</button></div></div>`;
    $("delNo").onclick=()=>$("delBox").innerHTML="";
    $("delYes").onclick=async()=>{
      $("delYes").disabled=true;
      try{
        const { error } = await sb.from("items").delete().eq("id", i.id);
        if(error) throw error;
        if(photos.length) await sb.storage.from(BUCKET).remove(photos);
        items=items.filter(x=>x.id!==i.id); render(); close("detOv");
      }catch(err){ $("delBox").innerHTML=`<div class="err">刪除失敗：${esc(errMsg(err))}</div>`; }
    };
  };
}

/* ---------- item form ---------- */
function renderFormCats(){
  $("fCats").innerHTML=`<button type="button" class="chip ${formCat===""?"on":""}" data-c="">未分類</button>`
    + cats.map(c=>`<button type="button" class="chip ${formCat===c.id?"on":""}" data-c="${esc(c.id)}">${esc(c.name)}</button>`).join("")
    + `<button type="button" class="chip add" id="catAddBtn">＋ 新分類</button>`;
}
$("fCats").addEventListener("click", e=>{
  if(e.target.closest("#catAddBtn")){ $("newCatBox").classList.toggle("hidden"); $("newCatName").focus(); return; }
  const b=e.target.closest(".chip"); if(b){ formCat=b.dataset.c; renderFormCats(); }
});
function formAddCat(){ const c=addCat($("newCatName").value); if(c){ formCat=c.id; $("newCatName").value=""; $("newCatBox").classList.add("hidden"); renderFormCats(); } }
$("newCatOk").addEventListener("click", formAddCat);
$("newCatName").addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); formAddCat(); } });

let addedThisForm=[];
function openForm(item){
  editing=item||null; addedThisForm=[];
  $("formTitle").textContent=item?`編輯 ${numLabel(item)}`:"新增";
  formCat=item?item.categoryId:(tab!=="__all"?tab:"");
  $("fName").value=item?.name||"";
  const noDate = !!item && !item.date;
  $("fNoDate").checked = noDate;
  $("fDate").disabled = noDate;
  $("fDate").value = noDate ? "" : (item?.date||new Date().toLocaleDateString("sv"));
  $("fPlace").value=item?.place||"";
  $("fKind").value=item?.kind||"";
  $("fL").value=item?.l??""; $("fW").value=item?.w??""; $("fH").value=item?.h??"";
  $("fWeight").value=item?.weight??"";
  $("fTags").value=(item?.tags||[]).join(" ");
  $("fNotes").value=item?.notes||"";
  formPhotos=[...(item?.photos||[])];
  $("formErr").classList.add("hidden"); $("newCatBox").classList.add("hidden");
  renderFormCats(); renderPhotos(); open("formOv");
}
function renderPhotos(){
  $("photos").innerHTML=formPhotos.map((p,ix)=>`<div class="ph"><img src="${esc(photoUrl(p))}" alt="">
      <button type="button" data-rm="${ix}" aria-label="移除">×</button>${ix===0?'<span class="cover">封面</span>':""}</div>`).join("")
    + Array.from({length:uploading},()=>`<div class="ph loading">上傳中</div>`).join("")
    + `<button type="button" class="addph" id="addPh" aria-label="加照片">＋</button>`;
}
$("photos").addEventListener("click", e=>{
  const rm=e.target.closest("[data-rm]");
  if(rm){ formPhotos.splice(Number(rm.dataset.rm),1); renderPhotos(); return; }
  if(e.target.closest("#addPh")) $("file").click();
});
async function shrink(file){
  try{
    const bmp=await createImageBitmap(file,{imageOrientation:"from-image"});
    const s=Math.min(1,1800/Math.max(bmp.width,bmp.height));
    const c=document.createElement("canvas"); c.width=Math.round(bmp.width*s); c.height=Math.round(bmp.height*s);
    c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    const out=await new Promise(r=>c.toBlob(r,"image/jpeg",0.86));
    return out&&out.size<file.size?out:file;
  }catch(_){ return file; }
}
$("file").addEventListener("change", async e=>{
  const files=[...e.target.files]; e.target.value="";
  for(const f of files){
    uploading++; renderPhotos();
    try{
      const b=await shrink(f);
      const ext = b.type==="image/jpeg" ? "jpg" : (f.name.split(".").pop()||"img").toLowerCase().replace(/[^a-z0-9]/g,"");
      const path=`${new Date().toISOString().slice(0,7)}/${Date.now()}-${uid()}.${ext}`;
      const { error } = await sb.storage.from(BUCKET).upload(path, b, { contentType:b.type||"image/jpeg", cacheControl:"31536000" });
      if(error) throw error;
      formPhotos.push(path); addedThisForm.push(path);
    }catch(err){ const x=$("formErr"); x.textContent="有照片上傳失敗："+errMsg(err); x.classList.remove("hidden"); }
    finally{ uploading--; renderPhotos(); }
  }
});
// 取消表單時，清掉這次上傳但沒存的照片
document.querySelectorAll('[data-close="formOv"]').forEach(b=>b.addEventListener("click", ()=>{
  const orphan=addedThisForm.filter(p=>!(editing?.photos||[]).includes(p));
  if(orphan.length) sb.storage.from(BUCKET).remove(orphan); addedThisForm=[];
}));
$("form").addEventListener("submit", async e=>{
  e.preventDefault();
  const errBox=$("formErr");
  if(uploading){ errBox.textContent="照片還在上傳，請稍等。"; errBox.classList.remove("hidden"); return; }
  const num=v=>v===""?"":Number(v);
  const data={
    num:editing?editing.num:Math.max(0,...items.map(i=>i.num||0))+1,
    categoryId:formCat, name:$("fName").value.trim(), date:$("fNoDate").checked?"":$("fDate").value, place:$("fPlace").value.trim(),
    kind:$("fKind").value.trim(), l:num($("fL").value), w:num($("fW").value), h:num($("fH").value),
    weight:num($("fWeight").value),
    tags:$("fTags").value.split(/[,，、\s]+/).map(t=>t.replace(/^#/,"").trim()).filter(Boolean),
    notes:$("fNotes").value.trim(), photos:formPhotos
  };
  $("saveBtn").disabled=true;
  try{
    await catWrite;
    const q = editing ? sb.from("items").update(toRow(data)).eq("id",editing.id).select().single()
                      : sb.from("items").insert(toRow(data)).select().single();
    const { data:row, error } = await q;
    if(error) throw error;
    const removed=(editing?.photos||[]).filter(p=>!formPhotos.includes(p));
    if(removed.length) sb.storage.from(BUCKET).remove(removed);
    const saved=fromRow(row);
    items = editing ? items.map(x=>x.id===saved.id?saved:x) : [...items, saved];
    addedThisForm=[]; render(); close("formOv");
  }catch(err){
    errBox.textContent="儲存失敗："+errMsg(err); errBox.classList.remove("hidden");
  }finally{ $("saveBtn").disabled=false; }
});
$("fNoDate").addEventListener("change", e=>{
  $("fDate").disabled = e.target.checked;
  if(e.target.checked) $("fDate").value="";
  else if(!$("fDate").value) $("fDate").value=new Date().toLocaleDateString("sv");
});
$("fab").addEventListener("click", ()=>openForm(null));

/* ---------- boot ---------- */
(async()=>{
  applyStyle(); render();
  if(!sb){ setNotice("網站還沒設定 Supabase：請在 config.js 填入專案網址和金鑰。"); $("authBtn").classList.add("hidden"); return; }
  const { data:{ session } } = await sb.auth.getSession();
  setAuthUI(session);
  sb.auth.onAuthStateChange((_e, s)=>setAuthUI(s));
  try{ await loadAll(); setNotice(""); }
  catch(err){ setNotice("讀取資料時出錯："+errMsg(err)); }
})();
