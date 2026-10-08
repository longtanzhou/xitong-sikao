'use strict';
/* 系统思考练习工作台 · SPA
 * 路由（hash）：#/ 首页/练习本  #/login 登录
 * #/iceberg/new 新建冰山分析  #/iceberg/:id 查看  #/iceberg/:id/edit 编辑
 * #/archetype 基模诊断  #/arch/:id 查看诊断结果
 * #/loop/new 新建回路图  #/loop/:id 查看回路图
 */

const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDT = iso => { try { return new Date(iso).toLocaleString('zh-CN', { hour12: false }); } catch (e) { return ''; } };
function setHTML(html) { app.innerHTML = html; window.scrollTo(0, 0); }

/* ---------- 配置 ---------- */
const CFG = window.APP_CONFIG || {};
const SB_URL = String(CFG.supabaseUrl || '').replace(/\/+$/, '');
const SB_KEY = String(CFG.supabaseAnonKey || '');
const READY = SB_URL.startsWith('https://') && SB_KEY.length > 20;

/* ---------- 极简 Supabase 客户端（GoTrue + PostgREST，无外部依赖） ---------- */
const LS_KEY = 'st_session_v1';
const store = {
  read() { try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { return null; } },
  write(s) { localStorage.setItem(LS_KEY, JSON.stringify(s)); },
  clear() { localStorage.removeItem(LS_KEY); }
};
async function authFetch(path, opts = {}) {
  const res = await fetch(SB_URL + path, {
    ...opts,
    headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error((data && (data.msg || data.message || data.error_description)) || ('请求失败 ' + res.status));
  return data;
}
const Auth = {
  session: null,
  async sendLink(email) {
    await authFetch('/auth/v1/otp', {
      method: 'POST',
      body: JSON.stringify({ email, options: { email_redirect_to: location.origin + '/app/' } })
    });
  },
  async getSession() {
    let s = this.session || store.read();
    if (!s) return null;
    if (s.expires_at * 1000 - Date.now() < 60000) {
      try {
        const d = await authFetch('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', body: JSON.stringify({ refresh_token: s.refresh_token })
        });
        s = {
          access_token: d.access_token, refresh_token: d.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + d.expires_in, user: d.user || s.user
        };
        this.session = s; store.write(s);
      } catch (e) { this.session = null; store.clear(); return null; }
    } else this.session = s;
    return this.session;
  },
  async user() { const s = await this.getSession(); return s ? s.user : null; },
  async logout() {
    const s = this.session;
    try { if (s) await authFetch('/auth/v1/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + s.access_token } }); } catch (e) {}
    this.session = null; store.clear();
  }
};
async function dbFetch(path, opts = {}) {
  const s = await Auth.getSession();
  if (!s) throw new Error('登录已过期，请重新登录');
  const res = await fetch(SB_URL + '/rest/v1' + path, {
    ...opts,
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + s.access_token, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  let data = null; try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error((data && (data.message || data.hint)) || ('请求失败 ' + res.status));
  return data;
}
const DB = {
  list: () => dbFetch('/works?select=*&order=updated_at.desc'),
  get: id => dbFetch('/works?select=*&id=eq.' + id).then(r => r[0] || null),
  create: row => dbFetch('/works', { method: 'POST', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify(row) }).then(r => r[0]),
  update: (id, patch) => dbFetch('/works?id=eq.' + id, { method: 'PATCH', headers: { 'Prefer': 'return=representation' }, body: JSON.stringify(patch) }).then(r => r[0]),
  remove: id => dbFetch('/works?id=eq.' + id, { method: 'DELETE' })
};

/* ---------- 内容：十大系统基模（源自《如何系统思考》第 7 章） ---------- */
const ARCHETYPES = [
  { id: 'turning', name: '关键转折点', group: 'growth',
    def: '自我增强的过程，但行动与结果之间有时间延迟：初期进展缓慢，积累到"临界值"后才会迅猛变革。意识不到延迟，就会过早放弃、功亏一篑。',
    structure: '一个带有明显时间延迟的增强回路。',
    ex: '咨询公司拓展培训业务，半年亏损后果断终止；半年后客户主动上门，却已无力承接。',
    warn: '初期没动静，你开始怀疑"这方法到底行不行"。',
    tip: '识别延迟，坚持到临界点；用先行指标而非即时结果判断进展；别在黎明前放弃。' },
  { id: 'limits', name: '成长上限', group: 'growth',
    def: '先加速增长，随后趋缓、停滞甚至逆转下滑——不是你不努力，而是撞上了限制因素。',
    structure: '一个增强回路（推动增长）+ 一个起制约作用的调节回路（限制因素）。',
    ex: '人民航空低价快速扩张，乘客增长超出服务容量，服务品质下降、客户流失。',
    warn: '增长明显放缓，但你还在拼命踩油门。',
    tip: '先问"什么在制约增长"，解除限制因素，而不是一味加大推动力度。' },
  { id: 'rich', name: '富者愈富', group: 'growth',
    def: '两项活动争夺有限资源，成功者获得更多支持、表现更好，另一方陷入恶性循环。',
    structure: '两个增强回路（一良性一恶性）；隐含假设：资源有限、分配标准是既往成功。',
    ex: '罗森塔尔"皮格马利翁效应"实验：被看好的学生获得更多关注，表现越来越好。',
    warn: '强者恒强、弱者恒弱，差距越拉越大。',
    tip: '审视分配标准是否只看既往成功；给弱势方独立的评价与资源通道。' },
  { id: 'commons', name: '共同悲剧', group: 'growth',
    def: '许多个体基于各自利益共同使用有限资源，收益先增后减，最终资源枯竭、大家一起受损。',
    structure: '多个局部的增强回路（个体追求成长）+ 一个全局的调节回路（资源极限）。',
    ex: '哈丁"公地悲剧"：牧民各自多放羊，草场最终退化，无人受益。',
    warn: '个体理性叠加成集体非理性；共享资源的总量在悄悄见底。',
    tip: '建立总量管控与使用规则；把公共资源的长期健康纳入每个人的激励。' },
  { id: 'underinvest', name: '成长与投资不足', group: 'growth',
    def: '成长接近上限时没有提前投资扩充产能，反而降低绩效标准来"达标"，导致增长受阻甚至逆转。',
    structure: '成长上限 + 舍本逐末：增强回路、产能制约的调节回路、标准降低的调节回路。',
    ex: '人民航空未及时招聘培训、反而降低服务标准，增长逆转；学校盲目扩招教学质量下滑。',
    warn: '为了保增长，标准正在被悄悄下调。',
    tip: '在接近上限前就投资产能；区分"调整方法"与"降低标准"，绝不用后者冒充前者。' },
  { id: 'delay', name: '延迟反应', group: 'fix',
    def: '行动与结果之间有时间延迟；意识不到延迟，就会过度矫正，或者过早放弃。',
    structure: '一个带有时间延迟的调节回路。',
    ex: '房地产开发周期导致供过于求；"啤酒游戏"中的牛鞭效应。',
    warn: '对策下去很久没动静，一有动静你又用力过猛。',
    tip: '决策时把延迟算进去；用"小步快走、等待观察"代替一次性重拳。' },
  { id: 'fixfail', name: '饮鸩止渴', group: 'fix',
    def: '短期见效的对策不断产生越来越严重的后遗症，问题持续恶化，让人难以自拔。',
    structure: '解决问题的调节回路 + 对策后遗症导致问题恶化的增强回路。',
    ex: '公司资金短缺→高息贷款→降价促销→品牌受损→现金流更糟。',
    warn: '需要越来越大剂量的"药"，才能维持同样的效果。',
    tip: '警惕"见效快"的对策；追踪后遗症指标，给每个短期对策设定退出条件。' },
  { id: 'shifting', name: '舍本逐末', group: 'fix',
    def: '习惯用见效快的"症状解"（治标），导致"根本解"的能力不断萎缩，对症状解产生更大依赖。',
    structure: '两个调节回路（症状解 / 根本解）+ 一个增强回路（症状解削弱根本解能力）。',
    ex: '借酒消愁愁更愁；靠创新成功的公司逐渐失去创新能力。',
    warn: '治标越来越熟练，治本越来越无力。',
    tip: '限制症状解的使用；把资源投向根本解，哪怕见效慢。' },
  { id: 'eroding', name: '目标侵蚀', group: 'fix',
    def: '短期"症状解"是悄悄放松要求、降低长期根本性目标。',
    structure: '两个调节回路：改变现状（根本解，有延迟）vs 降低目标（症状解）。人性使然：逃避压力、遵循阻力最小之路。',
    ex: '运动目标从每天半小时滑向彻底放弃；公司交货期标准越拉越长。',
    warn: '目标被"灵活调整"过不止一次。',
    tip: '把目标写下来并公开；每次想调目标时先问：是方法要改，还是目标被侵蚀了？' },
  { id: 'escalation', name: '恶性竞争', group: 'fix',
    def: '双方把利益建立在"超过对方"的基础上，对立不断升级，最后两败俱伤。',
    structure: '两个调节回路（各方回应对方的威胁）+ 一个增强回路（对立升级）；决策规则是"以眼还眼，以牙还牙"。',
    ex: '婴儿车价格战两败俱伤；美苏军备竞赛。',
    warn: '你的决策越来越取决于"对方做了什么"。',
    tip: '跳出"超过对方"的游戏规则；寻找把零和竞争变成正和合作的结构。' }
];
const archById = id => ARCHETYPES.find(a => a.id === id);
const SYMPTOMS = {
  growth: [
    { aid: 'turning', text: '事情进展比预期慢得多，开始怀疑"这方法到底行不行"' },
    { aid: 'limits', text: '曾经快速增长，现在明显放缓、停滞，甚至开始下滑' },
    { aid: 'rich', text: '资源总流向已经成功的一方，另一方越来越差' },
    { aid: 'commons', text: '大家各自追求自身利益，最后共享的资源被耗尽了' },
    { aid: 'underinvest', text: '快到增长上限了，却没人愿意提前投入扩充能力，标准反而在降低' }
  ],
  fix: [
    { aid: 'delay', text: '对策下去很久没动静，一有动静又容易用力过猛、矫枉过正' },
    { aid: 'fixfail', text: '短期对策见效很快，但后遗症越来越严重，问题反而在恶化' },
    { aid: 'shifting', text: '总在用"quick fix"救火，解决根本问题的能力却在萎缩' },
    { aid: 'eroding', text: '目标被一再下调，最后不了了之' },
    { aid: 'escalation', text: '和对手互相加码，谁都不敢先停手' }
  ]
};
const GROUP_LABEL = { growth: '推动成长', fix: '解决问题' };

/* ---------- 内容：冰山模型四层引导 ---------- */
const STEPS = [
  { key: 'l1', name: '事件层', q: '发生了什么？',
    hint: '从具体事件出发，识别关键变量。只描述事实，不急着下结论。',
    ph: '例如：公司技术骨干离职' },
  { key: 'l2', name: '趋势层', q: '把时间拉长看，呈现出什么趋势？',
    hint: '把同类事件联系起来看：是持续上升、震荡，还是 S 形增长？借助数据，避免主观臆断。',
    ph: '例如：近一年离职率持续走高' },
  { key: 'l3', name: '结构层', q: '是什么结构在产生这个趋势？',
    hint: '试着找出背后的反馈回路：哪些是增强回路（越演越烈），哪些是调节回路（试图纠偏），有没有时间延迟？',
    ph: '例如：高薪挖角补缺口（调节回路），却打击了老员工士气，形成恶性增强回路' },
  { key: 'l4', name: '心智模式层', q: '我们默认了什么假设？',
    hint: '反思那些"想当然"：为什么我们认为事情应该是这样的？这个假设今天还成立吗？',
    ph: '例如：我们默认"改善福利就能降低离职率"——为什么？' }
];
const ICEBERG_EXAMPLE = {
  title: '骨干离职的魔咒（示例）',
  l1: '公司技术骨干离职',
  l2: '离职率持续走高，且有加速趋势',
  l3: '"高薪挖角"是双刃剑：它补上人员缺口（一个调节回路），却通过老员工心理失衡形成恶性增强回路，其力量超过了改善福利的效果',
  l4: '我们默认"改善福利就能降低离职率"。反思：为什么我们认为这是对的？根本解可能是转向内部提拔与梯队建设'
};
const KIND_LABEL = { iceberg: '冰山分析', archetype: '基模诊断', loop: '回路图' };

/* ---------- 路由 ---------- */
function nav(hash) { location.hash = hash; }
function route() {
  const h = location.hash || '#/';
  let m;
  if ((m = h.match(/^#\/iceberg\/([0-9a-f-]{36})\/edit$/))) return ['icebergEdit', m[1]];
  if ((m = h.match(/^#\/iceberg\/([0-9a-f-]{36})$/))) return ['icebergView', m[1]];
  if (h === '#/iceberg/new') return ['icebergNew'];
  if ((m = h.match(/^#\/loop\/([0-9a-f-]{36})\/edit$/))) return ['loopEdit', m[1]];
  if ((m = h.match(/^#\/loop\/([0-9a-f-]{36})$/))) return ['loopView', m[1]];
  if (h === '#/loop/new') return ['loopNew'];
  if ((m = h.match(/^#\/arch\/([0-9a-f-]{36})$/))) return ['archView', m[1]];
  if (h === '#/archetype') return ['archetype'];
  if (h === '#/login') return ['login'];
  return ['home'];
}

/* ---------- 通用片段 ---------- */
const backLink = '<a class="back-link" href="#/">← 返回练习本</a>';
const notFoundHTML = '<div class="form-card"><p>这条练习不存在或已被删除。</p><a class="btn" href="#/">返回练习本</a></div>';
function errHTML(e) {
  return '<div class="form-card"><div class="msg msg-err">' + esc(e.message || '出错了') + '</div><a class="btn" href="#/">返回练习本</a></div>';
}
function setupHTML() {
  return '<div class="setup-card"><h2 style="margin-top:0">还差一步配置</h2>'
    + '<p>练习工作台需要连接 Supabase（账号 + 数据库）才能使用。请按以下步骤完成配置：</p>'
    + '<ol><li>在 <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a> 创建免费项目；</li>'
    + '<li>在 SQL Editor 中执行仓库根目录 <code>supabase/schema.sql</code>；</li>'
    + '<li>在 Cloudflare Pages 项目设置 → 环境变量中添加 <code>SUPABASE_URL</code> 和 <code>SUPABASE_ANON_KEY</code>；</li>'
    + '<li>重新部署后刷新本页。</li></ol>'
    + '<p style="color:var(--muted);font-size:.9rem">详细步骤见仓库中的 SUPABASE_SETUP.md。</p></div>';
}

/* ---------- 视图：登录 ---------- */
function viewLogin(user) {
  if (user) { nav('#/'); return; }
  setHTML(
    '<div class="form-card" style="max-width:480px;margin:2rem auto">'
    + '<h2 style="margin-top:0">登录练习工作台</h2>'
    + '<p class="hint">输入邮箱，我们会发一封登录链接给你，点击即可登录，无需密码。</p>'
    + '<div class="field"><label for="loginEmail">邮箱</label>'
    + '<input type="email" id="loginEmail" placeholder="you@example.com" autocomplete="email"></div>'
    + '<div id="loginMsg"></div>'
    + '<button class="btn btn-primary" id="loginBtn" style="width:100%">发送登录链接</button>'
    + '</div>'
  );
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const msg = document.getElementById('loginMsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.innerHTML = '<div class="msg msg-err">请输入有效的邮箱地址</div>'; return; }
    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = '发送中…';
    try {
      await Auth.sendLink(email);
      msg.innerHTML = '<div class="msg msg-ok">登录链接已发送到 <b>' + esc(email) + '</b>，请查收邮件（注意垃圾箱），点击链接即可登录。</div>';
    } catch (e) {
      msg.innerHTML = '<div class="msg msg-err">' + esc(e.message) + '</div>';
      btn.disabled = false; btn.textContent = '发送登录链接';
    }
  });
}

/* ---------- 视图：首页 / 练习本 ---------- */
async function viewHome(user) {
  setHTML('<div class="app-loading">加载中…</div>');
  let works = [];
  try { works = await DB.list(); } catch (e) { setHTML(errHTML(e)); return; }
  const cards = works.map(w => {
    const viewHash = w.kind === 'iceberg' ? '#/iceberg/' + w.id : w.kind === 'loop' ? '#/loop/' + w.id : '#/arch/' + w.id;
    return '<div class="work-item"><div class="w-main">'
      + '<div class="w-title"><span class="kind-tag">' + KIND_LABEL[w.kind] + '</span>' + esc(w.title) + '</div>'
      + '<div class="w-meta">更新于 ' + fmtDT(w.updated_at) + '</div></div>'
      + '<div class="w-actions"><a class="btn btn-sm" href="' + viewHash + '">查看</a>'
      + '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + w.id + '">删除</button></div></div>';
  }).join('');
  setHTML(
    '<div class="topbar"><div><h1 style="margin:0 0 .2rem">练习工作台</h1>'
    + '<div class="user-line">' + esc(user.email) + ' · <a href="#" data-act="logout">退出登录</a></div></div></div>'
    + '<div class="tool-grid">'
    + '<a class="tool-card" href="#/iceberg/new"><div class="t-icon">🧊</div><h3>冰山模型练习</h3><p>从事件逐层下潜：趋势 → 结构 → 心智模式</p></a>'
    + '<a class="tool-card" href="#/archetype"><div class="t-icon">🧭</div><h3>基模诊断</h3><p>对照十大基模，看看你的困扰属于哪种结构</p></a>'
    + '<a class="tool-card" href="#/loop/new"><div class="t-icon">🔁</div><h3>回路图绘制</h3><p>填变量、定极性，自动生成因果回路图</p></a>'
    + '</div>'
    + '<div class="section-head"><h2>我的练习本</h2><span style="color:var(--muted);font-size:.9rem">' + works.length + ' 条</span></div>'
    + (works.length ? '<div class="work-list">' + cards + '</div>'
      : '<div class="empty-note">还没有练习。从上面的三个工具中选一个，开始第一次练习吧。</div>')
  );
}

/* ---------- 视图：冰山模型向导 ---------- */
let wiz = null;
async function viewIcebergEdit(id) {
  if (id) {
    setHTML('<div class="app-loading">加载中…</div>');
    const w = await DB.get(id);
    if (!w || w.kind !== 'iceberg') { setHTML(backLink + notFoundHTML); return; }
    wiz = { id, step: 0, title: w.title, d: Object.assign({ l1: '', l2: '', l3: '', l4: '' }, w.data) };
  } else if (!wiz || wiz.id !== null) {
    wiz = { id: null, step: 0, title: '', d: { l1: '', l2: '', l3: '', l4: '' } };
  }
  renderWiz();
}
function renderWiz() {
  const st = STEPS[wiz.step];
  const stepsBar = STEPS.map((s, i) =>
    '<div class="step' + (i === wiz.step ? ' active' : i < wiz.step ? ' done' : '') + '">' + (i + 1) + '. ' + s.name + '</div>'
  ).join('');
  setHTML(backLink
    + '<h1 style="margin:.2rem 0 1.2rem">' + (wiz.id ? '编辑冰山分析' : '新的冰山分析') + '</h1>'
    + '<div class="steps">' + stepsBar + '</div>'
    + '<div class="form-card">'
    + (wiz.step === 0
      ? '<div class="field"><label for="wizTitle">给这次练习起个标题</label>'
        + '<input type="text" id="wizTitle" placeholder="例如：团队士气持续低落" value="' + esc(wiz.title) + '"></div>' : '')
    + '<div class="field"><label>' + st.q + '</label>'
    + '<p class="hint">' + st.hint + '</p>'
    + '<textarea id="wizText" placeholder="' + esc(st.ph) + '">' + esc(wiz.d[st.key]) + '</textarea></div>'
    + (wiz.step === 0 ? '<button class="btn btn-sm" id="wizExample">载入示例：骨干离职的魔咒</button>' : '')
    + '<div class="wizard-nav"><div>'
    + (wiz.step > 0 ? '<button class="btn" id="wizPrev">← 上一步</button>' : '')
    + '</div><div style="display:flex;gap:.6rem">'
    + (wiz.step < 3 ? '<button class="btn btn-primary" id="wizNext">下一步 →</button>' : '')
    + '<button class="btn" id="wizDraft">保存草稿</button>'
    + (wiz.step === 3 ? '<button class="btn btn-primary" id="wizDone">完成并保存</button>' : '')
    + '</div></div></div>'
  );
  const read = () => {
    const t = document.getElementById('wizTitle'); if (t) wiz.title = t.value;
    const ta = document.getElementById('wizText'); if (ta) wiz.d[st.key] = ta.value;
  };
  const prev = document.getElementById('wizPrev');
  if (prev) prev.addEventListener('click', () => { read(); wiz.step--; renderWiz(); });
  const next = document.getElementById('wizNext');
  if (next) next.addEventListener('click', () => { read(); wiz.step++; renderWiz(); });
  const ex = document.getElementById('wizExample');
  if (ex) ex.addEventListener('click', () => {
    wiz.title = ICEBERG_EXAMPLE.title;
    Object.assign(wiz.d, { l1: ICEBERG_EXAMPLE.l1, l2: ICEBERG_EXAMPLE.l2, l3: ICEBERG_EXAMPLE.l3, l4: ICEBERG_EXAMPLE.l4 });
    renderWiz();
  });
  document.getElementById('wizDraft').addEventListener('click', () => saveWiz(false));
  const done = document.getElementById('wizDone');
  if (done) done.addEventListener('click', () => saveWiz(true));
}
async function saveWiz(done) {
  const t = document.getElementById('wizTitle'); if (t) wiz.title = t.value;
  const ta = document.getElementById('wizText'); if (ta) wiz.d[STEPS[wiz.step].key] = ta.value;
  const title = (wiz.title || '').trim() || '未命名分析';
  const data = Object.assign({}, wiz.d, { status: done ? 'done' : 'draft' });
  try {
    let saved;
    if (wiz.id) saved = await DB.update(wiz.id, { title, data });
    else { const user = await Auth.user(); saved = await DB.create({ user_id: user.id, kind: 'iceberg', title, data }); }
    wiz = null;
    nav('#/iceberg/' + saved.id);
  } catch (e) { alert('保存失败：' + e.message); }
}
async function viewIcebergView(id) {
  setHTML('<div class="app-loading">加载中…</div>');
  const w = await DB.get(id);
  if (!w || w.kind !== 'iceberg') { setHTML(backLink + notFoundHTML); return; }
  const d = w.data || {};
  const layers = STEPS.map(s =>
    '<div class="layer-view"><h3>' + s.name + ' · ' + s.q + '</h3><p>' + (esc(d[s.key]) || '<span style="color:var(--muted)">（未填写）</span>') + '</p></div>'
  ).join('');
  setHTML(backLink
    + '<div class="topbar"><h1 style="margin:0">' + esc(w.title) + '</h1>'
    + '<div style="display:flex;gap:.6rem"><a class="btn btn-sm" href="#/iceberg/' + w.id + '/edit">继续编辑</a>'
    + '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + w.id + '">删除</button></div></div>'
    + (d.status === 'draft' ? '<div class="msg" style="background:var(--accent-soft);color:var(--accent-text);border:1px solid var(--border)">草稿状态，可继续编辑完善。</div>' : '')
    + layers
  );
}

/* ---------- 视图：基模诊断 ---------- */
let diag = null;
function viewArchetype() {
  if (!diag) diag = { phase: 1, group: null, checked: {} };
  if (diag.phase === 1) {
    setHTML(backLink
      + '<h1 style="margin:.2rem 0 1.2rem">基模诊断</h1>'
      + '<div class="form-card"><p class="hint">系统基模是反复出现的结构形态，如同"常见病速查手册"。先选一个大方向：</p>'
      + '<div class="choice-grid">'
      + '<div class="choice" data-group="growth"><div class="t-icon" style="font-size:2rem">🌱</div><h3>推动成长</h3><p>想让一件好事持续增长、越做越大</p></div>'
      + '<div class="choice" data-group="fix"><div class="t-icon" style="font-size:2rem">🛠</div><h3>解决问题</h3><p>被一个反复出现的问题困扰</p></div>'
      + '</div></div>'
    );
    document.querySelectorAll('.choice').forEach(c => c.addEventListener('click', () => {
      diag.group = c.dataset.group; diag.phase = 2; diag.checked = {}; viewArchetype();
    }));
  } else if (diag.phase === 2) {
    const list = SYMPTOMS[diag.group].map(s =>
      '<label class="symptom' + (diag.checked[s.aid] ? ' selected' : '') + '">'
      + '<input type="checkbox" data-aid="' + s.aid + '"' + (diag.checked[s.aid] ? ' checked' : '') + '>'
      + '<span>' + esc(s.text) + '</span></label>'
    ).join('');
    setHTML(backLink
      + '<h1 style="margin:.2rem 0 1.2rem">基模诊断 · ' + GROUP_LABEL[diag.group] + '</h1>'
      + '<div class="form-card"><p class="hint">勾选所有符合你情况的描述（可多选）：</p>' + list
      + '<div class="wizard-nav"><button class="btn" id="diagBack">← 重选方向</button>'
      + '<button class="btn btn-primary" id="diagGo">查看诊断结果</button></div>'
      + '<div id="diagMsg"></div></div>'
    );
    document.querySelectorAll('.symptom input').forEach(cb => cb.addEventListener('change', () => {
      diag.checked[cb.dataset.aid] = cb.checked;
      cb.closest('.symptom').classList.toggle('selected', cb.checked);
    }));
    document.getElementById('diagBack').addEventListener('click', () => { diag.phase = 1; viewArchetype(); });
    document.getElementById('diagGo').addEventListener('click', () => {
      const ids = Object.keys(diag.checked).filter(k => diag.checked[k]);
      if (!ids.length) { document.getElementById('diagMsg').innerHTML = '<div class="msg msg-err">请至少勾选一项描述</div>'; return; }
      diag.matched = ids; diag.phase = 3; viewArchetype();
    });
  } else {
    const cards = diag.matched.map((aid, i) => {
      const a = archById(aid);
      return '<div class="arch-card"><h3>' + esc(a.name) + '<span class="match-score">匹配 ' + (i + 1) + '</span></h3>'
        + '<p class="a-def">' + esc(a.def) + '</p>'
        + '<dl><dt>结构</dt><dd>' + esc(a.structure) + '</dd>'
        + '<dt>典型案例</dt><dd>' + esc(a.ex) + '</dd>'
        + '<dt>预警信号</dt><dd>' + esc(a.warn) + '</dd>'
        + '<dt>管理原则</dt><dd>' + esc(a.tip) + '</dd></dl></div>';
    }).join('');
    setHTML(backLink
      + '<h1 style="margin:.2rem 0 1.2rem">诊断结果</h1>'
      + '<div class="form-card"><div class="field"><label for="diagTitle">保存标题</label>'
      + '<input type="text" id="diagTitle" value="基模诊断 · ' + esc(GROUP_LABEL[diag.group]) + '"></div>'
      + '<div class="wizard-nav"><button class="btn" id="diagRedo">重新诊断</button>'
      + '<button class="btn btn-primary" id="diagSave">保存到练习本</button></div></div>'
      + cards
      + '<div class="form-card"><p class="hint" style="margin:0">提醒：基模是"速查手册"而非确诊书。从行为模式反推基模只能作为参考，警惕"削足适履""对号入座"——最好先用冰山模型做一次规范分析，再回来对照。</p></div>'
    );
    document.getElementById('diagRedo').addEventListener('click', () => { diag = null; viewArchetype(); });
    document.getElementById('diagSave').addEventListener('click', async () => {
      const title = (document.getElementById('diagTitle').value || '').trim() || '基模诊断';
      try {
        const user = await Auth.user();
        const saved = await DB.create({
          user_id: user.id, kind: 'archetype', title,
          data: { group: diag.group, symptoms: diag.matched, status: 'done' }
        });
        diag = null;
        nav('#/arch/' + saved.id);
      } catch (e) { alert('保存失败：' + e.message); }
    });
  }
}
async function viewArchView(id) {
  setHTML('<div class="app-loading">加载中…</div>');
  const w = await DB.get(id);
  if (!w || w.kind !== 'archetype') { setHTML(backLink + notFoundHTML); return; }
  const d = w.data || {};
  const cards = (d.symptoms || []).map((aid, i) => {
    const a = archById(aid); if (!a) return '';
    return '<div class="arch-card"><h3>' + esc(a.name) + '<span class="match-score">匹配 ' + (i + 1) + '</span></h3>'
      + '<p class="a-def">' + esc(a.def) + '</p>'
      + '<dl><dt>结构</dt><dd>' + esc(a.structure) + '</dd>'
      + '<dt>典型案例</dt><dd>' + esc(a.ex) + '</dd>'
      + '<dt>预警信号</dt><dd>' + esc(a.warn) + '</dd>'
      + '<dt>管理原则</dt><dd>' + esc(a.tip) + '</dd></dl></div>';
  }).join('');
  setHTML(backLink
    + '<div class="topbar"><h1 style="margin:0">' + esc(w.title) + '</h1>'
    + '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + w.id + '">删除</button></div>'
    + '<p style="color:var(--muted)">诊断方向：' + esc(GROUP_LABEL[d.group] || '') + ' · ' + fmtDT(w.created_at) + '</p>'
    + cards
  );
}

/* ---------- 回路图 SVG 渲染 ---------- */
function loopSVG(type, vars, pols, size) {
  size = size || 340;
  const n = vars.length, cx = size / 2, cy = size / 2, R = size / 2 - 54;
  const pts = vars.map((_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  });
  let edges = '';
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [x1, y1] = pts[i], [x2, y2] = pts[j];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    let vx = mx - cx, vy = my - cy; const vl = Math.hypot(vx, vy) || 1;
    const bow = 24, qx = mx + vx / vl * bow, qy = my + vy / vl * bow;
    const t1 = 30 / len, t2 = 36 / len;
    const sx = x1 + dx * t1, sy = y1 + dy * t1, ex = x2 - dx * t2, ey = y2 - dy * t2;
    const pol = pols[i] || '+';
    edges += '<path d="M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1)
      + '" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#arr)"/>'
      + '<circle cx="' + qx.toFixed(1) + '" cy="' + qy.toFixed(1) + '" r="11" fill="var(--card)" stroke="var(--accent)" stroke-width="1.5"/>'
      + '<text x="' + qx.toFixed(1) + '" y="' + (qy + 4.5).toFixed(1) + '" text-anchor="middle" font-size="13" font-weight="700" fill="var(--accent-text)">' + (pol === '+' ? '+' : '−') + '</text>';
  }
  const nodes = pts.map((p, i) => {
    const label = (vars[i] || '').trim() || ('变量' + (i + 1));
    const short = label.length > 8 ? label.slice(0, 8) + '…' : label;
    return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="30" fill="var(--card)" stroke="var(--accent)" stroke-width="2"/>'
      + '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 4.5).toFixed(1) + '" text-anchor="middle" font-size="12.5" fill="var(--text)">' + esc(short) + '</text>';
  }).join('');
  const center = '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="34" font-weight="800" fill="var(--accent)">'
    + (type === 'R' ? 'R' : 'B') + '</text>'
    + '<text x="' + cx + '" y="' + (cy + 34) + '" text-anchor="middle" font-size="12" fill="var(--muted)">'
    + (type === 'R' ? '增强回路' : '调节回路') + '</text>';
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img">'
    + '<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
    + '<path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>'
    + edges + nodes + center + '</svg>';
}

/* ---------- 视图：回路图编辑 ---------- */
let loopSt = null;
async function viewLoopEdit(id) {
  if (id) {
    setHTML('<div class="app-loading">加载中…</div>');
    const w = await DB.get(id);
    if (!w || w.kind !== 'loop') { setHTML(backLink + notFoundHTML); return; }
    const d = w.data || {};
    loopSt = { id, title: w.title, type: d.type || 'R', vars: (d.vars || []).concat(['', '', '']).slice(0, Math.max(3, (d.vars || []).length)), pols: d.pols || [] };
    loopSt.vars = loopSt.vars.slice(0, 6);
    while (loopSt.pols.length < loopSt.vars.length) loopSt.pols.push('+');
  } else if (!loopSt || loopSt.id !== null) {
    loopSt = { id: null, title: '', type: 'R', vars: ['', '', ''], pols: ['+', '+', '+'] };
  }
  renderLoopForm();
}
function defaultPols(type, n) {
  const p = new Array(n).fill('+');
  if (type === 'B') p[n - 1] = '-';
  return p;
}
function renderLoopForm() {
  const rows = loopSt.vars.map((v, i) => {
    const j = (i + 1) % loopSt.vars.length;
    return '<div class="var-row"><input type="text" data-var="' + i + '" placeholder="变量' + (i + 1) + '" value="' + esc(v) + '">'
      + '<select class="edge-pol" data-pol="' + i + '" title="变量' + (i + 1) + ' → 变量' + (j + 1) + ' 的影响极性">'
      + '<option value="+" ' + (loopSt.pols[i] !== '-' ? 'selected' : '') + '>+ 同向变化</option>'
      + '<option value="-" ' + (loopSt.pols[i] === '-' ? 'selected' : '') + '>− 反向变化</option></select>'
      + (loopSt.vars.length > 2 ? '<button class="btn btn-sm btn-danger" data-rmvar="' + i + '">✕</button>' : '')
      + '</div>';
  }).join('');
  setHTML(backLink
    + '<h1 style="margin:.2rem 0 1.2rem">' + (loopSt.id ? '编辑回路图' : '新的回路图') + '</h1>'
    + '<div class="form-card"><div class="field"><label for="loopTitle">标题</label>'
    + '<input type="text" id="loopTitle" placeholder="例如：加班—效率恶性循环" value="' + esc(loopSt.title) + '"></div>'
    + '<div class="field"><label for="loopType">回路类型</label>'
    + '<select id="loopType"><option value="R"' + (loopSt.type === 'R' ? ' selected' : '') + '>增强回路（R）：越演越烈</option>'
    + '<option value="B"' + (loopSt.type === 'B' ? ' selected' : '') + '>调节回路（B）：趋向目标</option></select></div>'
    + '<div class="field"><label>变量（2–6 个，按顺时针排列成环）</label>' + rows
    + (loopSt.vars.length < 6 ? '<button class="btn btn-sm" id="addVar" style="margin-top:.4rem">+ 添加变量</button>' : '')
    + '<p class="hint" style="margin-top:.6rem">极性表示前一个变量对后一个的影响：+ 为同向变化，− 为反向变化。</p></div>'
    + '<div class="wizard-nav"><div></div><button class="btn btn-primary" id="loopSave">保存到练习本</button></div></div>'
    + '<div class="loop-svg-wrap" id="loopPreview"></div>'
  );
  const refreshPreview = () => {
    document.getElementById('loopPreview').innerHTML = loopSVG(loopSt.type, loopSt.vars, loopSt.pols);
  };
  refreshPreview();
  document.querySelectorAll('[data-var]').forEach(inp => inp.addEventListener('input', () => {
    loopSt.vars[+inp.dataset.var] = inp.value; refreshPreview();
  }));
  document.querySelectorAll('[data-pol]').forEach(sel => sel.addEventListener('change', () => {
    loopSt.pols[+sel.dataset.pol] = sel.value; refreshPreview();
  }));
  document.querySelectorAll('[data-rmvar]').forEach(btn => btn.addEventListener('click', () => {
    const i = +btn.dataset.rmvar;
    loopSt.vars.splice(i, 1); loopSt.pols.splice(i, 1);
    loopSt.pols = defaultPols(loopSt.type, loopSt.vars.length).map((d, k) => loopSt.pols[k] || d);
    renderLoopForm();
  }));
  const addBtn = document.getElementById('addVar');
  if (addBtn) addBtn.addEventListener('click', () => {
    loopSt.vars.push(''); loopSt.pols.push('+'); renderLoopForm();
  });
  document.getElementById('loopType').addEventListener('change', e => {
    loopSt.type = e.target.value;
    loopSt.pols = defaultPols(loopSt.type, loopSt.vars.length);
    renderLoopForm();
  });
  document.getElementById('loopTitle').addEventListener('input', e => { loopSt.title = e.target.value; });
  document.getElementById('loopSave').addEventListener('click', async () => {
    const vars = loopSt.vars.map(v => v.trim());
    if (vars.filter(Boolean).length < 2) { alert('请至少填写 2 个变量'); return; }
    const title = (loopSt.title || '').trim() || '未命名回路图';
    const data = { type: loopSt.type, vars, pols: loopSt.pols.slice(0, vars.length), status: 'done' };
    try {
      let saved;
      if (loopSt.id) saved = await DB.update(loopSt.id, { title, data });
      else { const user = await Auth.user(); saved = await DB.create({ user_id: user.id, kind: 'loop', title, data }); }
      loopSt = null;
      nav('#/loop/' + saved.id);
    } catch (e) { alert('保存失败：' + e.message); }
  });
}
async function viewLoopView(id) {
  setHTML('<div class="app-loading">加载中…</div>');
  const w = await DB.get(id);
  if (!w || w.kind !== 'loop') { setHTML(backLink + notFoundHTML); return; }
  const d = w.data || {};
  const vars = d.vars || [], pols = d.pols || [];
  const detail = vars.map((v, i) => {
    const j = (i + 1) % vars.length;
    return '<div class="var-row"><input type="text" value="' + esc(v) + '" disabled>'
      + '<span class="edge-pol" style="text-align:center;color:var(--muted);font-size:.9rem">→ 变量' + (j + 1) + '（' + (pols[i] === '-' ? '−' : '+') + '）</span></div>';
  }).join('');
  setHTML(backLink
    + '<div class="topbar"><h1 style="margin:0">' + esc(w.title) + '</h1>'
    + '<div style="display:flex;gap:.6rem"><button class="btn btn-sm" id="loopEditBtn">编辑</button>'
    + '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + w.id + '">删除</button></div></div>'
    + '<div class="loop-svg-wrap">' + loopSVG(d.type || 'R', vars, pols, 380) + '</div>'
    + '<div class="form-card"><div class="field"><label>变量与极性</label>' + detail + '</div>'
    + '<p class="hint" style="margin:0">回路类型：' + (d.type === 'B' ? '调节回路（B）' : '增强回路（R）') + ' · 更新于 ' + fmtDT(w.updated_at) + '</p></div>'
  );
  document.getElementById('loopEditBtn').addEventListener('click', () => nav('#/loop/' + id + '/edit'));
}

/* ---------- 主渲染 ---------- */
async function render() {
  if (/#access_token=/.test(location.hash)) {
    const p = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
    if (p.access_token) {
      const s = {
        access_token: p.access_token, refresh_token: p.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + parseInt(p.expires_in || 3600, 10), user: null
      };
      try {
        const me = await authFetch('/auth/v1/user', { headers: { 'Authorization': 'Bearer ' + p.access_token } });
        s.user = { id: me.id, email: me.email };
      } catch (e) {}
      Auth.session = s; store.write(s);
    }
    location.hash = '#/';
    return;
  }
  if (!READY) { setHTML(setupHTML()); return; }
  const [name, arg] = route();
  if (name === 'login') { viewLogin(await Auth.user()); return; }
  const user = await Auth.user();
  if (!user) { nav('#/login'); return; }
  try {
    switch (name) {
      case 'home': return await viewHome(user);
      case 'icebergNew': return await viewIcebergEdit(null);
      case 'icebergEdit': return await viewIcebergEdit(arg);
      case 'icebergView': return await viewIcebergView(arg);
      case 'archetype': diag = null; return viewArchetype();
      case 'archView': return await viewArchView(arg);
      case 'loopNew': return await viewLoopEdit(null);
      case 'loopEdit': return await viewLoopEdit(arg);
      case 'loopView': return await viewLoopView(arg);
      default: return await viewHome(user);
    }
  } catch (e) { setHTML(errHTML(e)); }
}

/* ---------- 启动 ---------- */
app.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  if (t.dataset.act === 'del') {
    e.preventDefault();
    if (confirm('确定删除这条练习吗？删除后无法恢复。')) {
      try { await DB.remove(t.dataset.id); } catch (err) { alert('删除失败：' + err.message); return; }
      const [name] = route();
      if (name === 'home') render(); else nav('#/');
    }
  }
  if (t.dataset.act === 'logout') {
    e.preventDefault();
    await Auth.logout();
    nav('#/login');
  }
});
window.addEventListener('hashchange', render);
if (!location.hash) history.replaceState(null, '', '#/');
render();
