/* Private progress sync for the photonic AI learning guide. No credential is embedded. */
(() => {
  'use strict';
  const OWNER = 'Shaun050427';
  const REPO = 'photonic-ai-learning-data';
  const BRANCH = 'main';
  const PATH = 'data/photonic-progress.json';
  const LOCAL_KEY = 'photonicProgress_v1';
  const META_KEY = 'photonicProgressSyncMeta_v1';
  const TOKEN_KEY = 'photonicProgressToken_v1';
  const MODULES = [
    ['field', '光场与复振幅'], ['interference', '干涉'], ['propagation', '衍射与传播'],
    ['fresnel', 'Fresnel 衍射'], ['fraunhofer', 'Fraunhofer 与傅里叶'],
    ['spatial', '空间频率'], ['lens', '透镜与 4f'], ['asm', '角谱传播'],
    ['mask', '相位掩膜'], ['mzi', 'MZI'], ['nonlinear', '非线性'], ['sampling', '采样与 FFT']
  ];
  const DAYS = [
    '复振幅、相位与双光束干涉', '傅里叶变换与空间频率', 'Huygens 与衍射',
    'Fresnel 传播', '角谱传播 ASM', 'Fraunhofer 与孔径衍射',
    '透镜与 4f 滤波', '相位掩膜实验', 'MZI 与矩阵计算', '画光计算数据流并总结'
  ];
  const $ = id => document.getElementById(id);
  const blank = () => ({ modules: {}, days: {} });
  const clone = value => JSON.parse(JSON.stringify(value));
  function valid(input) {
    const value = input?.data || input;
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        !value.modules || typeof value.modules !== 'object' || Array.isArray(value.modules) ||
        !value.days || typeof value.days !== 'object' || Array.isArray(value.days)) throw Error('进度数据格式不正确');
    const result = blank();
    for (const [id] of MODULES) result.modules[id] = !!value.modules[id];
    for (let n = 1; n <= DAYS.length; n++) {
      const d = value.days[n];
      result.days[n] = { done: !!d?.done, note: typeof d?.note === 'string' ? d.note.slice(0, 10000) : '' };
    }
    return result;
  }
  function readJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
  const localExisted = !!localStorage.getItem(LOCAL_KEY);
  let data = valid(readJSON(LOCAL_KEY, blank()));
  let meta = readJSON(META_KEY, {});
  let token = sessionStorage.getItem(TOKEN_KEY) || '';
  let busy = false, timer = null, conflict = null, draftTimer = null;
  const fingerprint = value => JSON.stringify(valid(value));
  const isBlank = value => !Object.values(value.modules).some(Boolean) && !Object.values(value.days).some(d => d.done || d.note);
  const dirty = () => fingerprint(data) !== meta.snapshot;
  function status(message, tone = 'normal') {
    $('syncStatus').textContent = message;
    $('syncStatus').style.color = tone === 'error' ? '#b91c1c' : tone === 'ok' ? '#047857' : '#1e40af';
  }
  function render() {
    const modules = $('moduleProgress'), days = $('dayProgress');
    modules.replaceChildren(); days.replaceChildren();
    MODULES.forEach(([id, label]) => {
      const box = document.createElement('div'); box.className = 'progress-item';
      const text = document.createElement('label'), check = document.createElement('input');
      check.type = 'checkbox'; check.checked = !!data.modules[id];
      check.addEventListener('change', () => { data.modules[id] = check.checked; changed(); });
      text.append(check, document.createTextNode(label)); box.append(text); modules.append(box);
    });
    DAYS.forEach((title, i) => {
      const key = i + 1, box = document.createElement('div'), label = document.createElement('label');
      const check = document.createElement('input'), note = document.createElement('textarea');
      box.className = 'progress-item'; check.type = 'checkbox'; check.checked = !!data.days[key]?.done;
      check.addEventListener('change', () => { data.days[key].done = check.checked; changed(); });
      label.append(check, document.createTextNode(`Day ${key} · ${title}`));
      note.value = data.days[key]?.note || ''; note.maxLength = 10000;
      note.placeholder = '写下今天的推导、实验结果和疑问（私人）';
      note.setAttribute('aria-label', `Day ${key} 学习笔记`);
      note.addEventListener('input', () => { data.days[key].note = note.value; changed(); });
      box.append(label, note); days.append(box);
    });
    updateCount();
  }
  function updateCount() {
    const m = MODULES.filter(([id]) => data.modules[id]).length;
    const d = DAYS.filter((_, i) => data.days[i + 1]?.done).length;
    $('progressSummary').textContent = `${m} / 12 模块 · ${d} / 10 天`;
  }
  function changed() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); updateCount();
    if (conflict) { status('冲突待处理，本机改动已保存', 'error'); return; }
    status(token ? '本机有待同步修改' : '仅保存在本机');
    clearTimeout(timer); if (token) timer = setTimeout(() => sync(), 3000);
  }
  const toBase64 = str => {
    const bytes = new TextEncoder().encode(str); let out = '';
    for (let i = 0; i < bytes.length; i += 32768) out += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(out);
  };
  const fromBase64 = str => {
    const binary = atob(str.replace(/\s/g, '')); const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };
  async function api(route, options = {}) {
    if (!token) throw Error('请先连接 GitHub Token');
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${route}`, {
      ...options,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { const error = Error(body.message || `GitHub ${response.status}`); error.status = response.status; throw error; }
    return body;
  }
  async function remote(ref = BRANCH) {
    const file = await api(`contents/${PATH}?ref=${encodeURIComponent(ref)}`);
    const payload = JSON.parse(fromBase64(file.content));
    return { sha: file.sha, data: valid(payload), updatedAt: payload.updatedAt };
  }
  function remember(sha, snapshot) {
    meta = { sha, snapshot: fingerprint(snapshot), at: new Date().toISOString() };
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    status('已同步 · ' + new Date(meta.at).toLocaleString('zh-CN'), 'ok');
  }
  function adopt(value, sha) {
    data = valid(value); localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); remember(sha, data); render();
    conflict = null; $('syncConflict').hidden = true;
  }
  async function commit(expectedSha, next, message = 'sync: update learning progress') {
    const payload = { schemaVersion: 1, updatedAt: new Date().toISOString(), source: 'photonic-ai-learning', data: valid(next) };
    const result = await api(`contents/${PATH}`, { method: 'PUT', body: JSON.stringify({
      message, content: toBase64(JSON.stringify(payload, null, 2) + '\n'), branch: BRANCH, sha: expectedSha
    }) });
    return result.content.sha;
  }
  function showConflict(latest) {
    conflict = latest; $('syncPanel').hidden = false; $('syncConflict').hidden = false;
    status('多设备修改冲突 · 已暂停自动提交', 'error');
  }
  function failure(error) {
    console.error('Learning progress sync:', error);
    const message = error.status === 401 ? 'Token 无效或已过期' :
      error.status === 403 ? '权限不足、Token 过期或 API 限流' :
      error.status === 404 ? '无法访问私有仓库或进度文件；检查 Token 授权范围' :
      error.status === 409 ? '云端刚更新，请再试一次同步' : error.message;
    status('同步失败：' + message, 'error');
  }
  async function sync() {
    if (!token || busy || conflict) return;
    busy = true; status('正在检查云端…');
    try {
      const latest = await remote();
      if (dirty()) {
        if (meta.sha !== latest.sha) {
          if (fingerprint(data) === fingerprint(latest.data)) remember(latest.sha, data);
          else if (!localExisted && isBlank(data)) adopt(latest.data, latest.sha);
          else showConflict(latest);
        } else {
          const snapshot = clone(data);
          const sha = await commit(latest.sha, snapshot);
          remember(sha, snapshot);
          if (fingerprint(data) !== meta.snapshot) { status('新修改待同步'); clearTimeout(timer); timer = setTimeout(sync, 1000); }
        }
      } else if (latest.sha !== meta.sha) adopt(latest.data, latest.sha);
      else remember(latest.sha, data);
    } catch (error) { failure(error); }
    finally { busy = false; }
  }
  function exportData() {
    const payload = JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), data }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'photonic-learning-progress-backup.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('syncOpen').onclick = () => { $('syncPanel').hidden = !$('syncPanel').hidden; $('syncToken').value = ''; };
  $('syncConnect').onclick = () => {
    const entered = $('syncToken').value.trim();
    if (!entered) { status('请填写 Token', 'error'); return; }
    token = entered; sessionStorage.setItem(TOKEN_KEY, token); $('syncToken').value = '';
    conflict = null; $('syncConflict').hidden = true; sync();
  };
  $('syncDisconnect').onclick = () => {
    token = ''; sessionStorage.removeItem(TOKEN_KEY); $('syncToken').value = '';
    clearTimeout(timer); status('已移除此设备 Token · 本机保存');
  };
  $('syncNow').onclick = () => { if (conflict) { status('请先处理版本冲突', 'error'); return; } sync(); };
  $('progressExport').onclick = exportData; $('conflictExport').onclick = exportData;
  $('progressImportButton').onclick = () => $('progressImport').click();
  $('progressImport').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try { data = valid(JSON.parse(await file.text())); localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); render(); changed(); }
    catch (error) { status('导入失败：' + error.message, 'error'); }
    finally { event.target.value = ''; }
  };
  $('conflictRemote').onclick = () => { if (conflict) adopt(conflict.data, conflict.sha); };
  $('conflictLocal').onclick = async () => {
    if (!conflict || busy) return;
    busy = true; status('正在提交本机版本…');
    try { const latest = await remote(), snapshot = clone(data);
      const sha = await commit(latest.sha, snapshot, 'resolve: keep local learning progress');
      conflict = null; $('syncConflict').hidden = true; remember(sha, snapshot);
    } catch (error) { failure(error); } finally { busy = false; }
  };
  $('historyOpen').onclick = async () => {
    $('historyPanel').hidden = false; const list = $('historyList'); list.textContent = '读取版本中…';
    try {
      const commits = await api(`commits?path=${PATH}&sha=${BRANCH}&per_page=30`);
      list.replaceChildren();
      for (const item of commits) {
        const row = document.createElement('div'), label = document.createElement('span'), button = document.createElement('button');
        row.className = 'history-item';
        label.textContent = `${new Date(item.commit.author.date).toLocaleString('zh-CN')} · ${item.commit.message} · ${item.sha.slice(0, 7)}`;
        button.type = 'button'; button.textContent = '恢复此版';
        button.onclick = async () => {
          if (dirty() || conflict) { status('请先同步或处理本机改动，再恢复历史版本', 'error'); return; }
          if (!confirm('恢复此版？旧版本会作为新提交保存，当前云端版本仍保留在历史中。')) return;
          if (busy) return; busy = true;
          try { const old = await remote(item.sha), latest = await remote();
            if (latest.sha !== meta.sha) { adopt(latest.data, latest.sha); status('云端已有新版本，请检查后重新恢复', 'error'); return; }
            const sha = await commit(latest.sha, old.data, `restore: ${item.sha.slice(0, 7)}`);
            adopt(old.data, sha); $('historyPanel').hidden = true;
          } catch (error) { failure(error); } finally { busy = false; }
        };
        row.append(label, button); list.append(row);
      }
    } catch (error) { failure(error); list.textContent = '读取历史失败'; }
  };
  render();
  status(token ? '正在连接云端…' : '尚未连接 · 本机保存');
  if (token) sync();
  setInterval(() => { if (token) sync(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && token) sync(); });
})();
