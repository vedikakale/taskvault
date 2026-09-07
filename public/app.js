const state = { token: localStorage.getItem('tv_token') || null };

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('Session expired');
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function showApp() {
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  loadTasks();
  loadKeys();
}

function showLogin() {
  $('#login-view').classList.remove('hidden');
  $('#app-view').classList.add('hidden');
}

function logout() {
  state.token = null;
  localStorage.removeItem('tv_token');
  showLogin();
}

// --- Login ---
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    const { token } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: $('#login-username').value,
        password: $('#login-password').value,
      }),
    });
    state.token = token;
    localStorage.setItem('tv_token', token);
    showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#logout-btn').addEventListener('click', logout);

// --- Tabs ---
$$('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.tab-panel').forEach((p) => p.classList.add('hidden'));
    $(`#${btn.dataset.tab}-tab`).classList.remove('hidden');
  });
});

// --- Tasks ---
async function loadTasks() {
  const tasks = await api('/api/tasks');
  const body = $('#tasks-body');
  body.innerHTML = tasks
    .map(
      (t) => `
    <tr>
      <td>${escapeHtml(t.title)}</td>
      <td><span class="badge ${t.status}">${t.status.replace('_', ' ')}</span></td>
      <td><span class="badge ${t.priority}">${t.priority}</span></td>
      <td>${new Date(t.updated_at).toLocaleString()}</td>
      <td class="row-actions">
        <button class="secondary" onclick="editTask('${t.id}')">Edit</button>
        <button class="secondary" onclick="deleteTask('${t.id}')">Delete</button>
      </td>
    </tr>`
    )
    .join('');
}

window.deleteTask = async (id) => {
  if (!confirm('Delete this task?')) return;
  await api(`/api/tasks/${id}`, { method: 'DELETE' });
  loadTasks();
};

window.editTask = async (id) => {
  const t = await api(`/api/tasks/${id}`);
  $('#task-modal-title').textContent = 'Edit Task';
  $('#task-id').value = t.id;
  $('#task-title').value = t.title;
  $('#task-description').value = t.description || '';
  $('#task-status').value = t.status;
  $('#task-priority').value = t.priority;
  $('#task-modal').classList.remove('hidden');
};

$('#new-task-btn').addEventListener('click', () => {
  $('#task-modal-title').textContent = 'New Task';
  $('#task-form').reset();
  $('#task-id').value = '';
  $('#task-modal').classList.remove('hidden');
});

$('#task-cancel').addEventListener('click', () => $('#task-modal').classList.add('hidden'));

$('#task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#task-id').value;
  const payload = {
    title: $('#task-title').value,
    description: $('#task-description').value,
    status: $('#task-status').value,
    priority: $('#task-priority').value,
  };
  if (id) {
    await api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    await api('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
  }
  $('#task-modal').classList.add('hidden');
  loadTasks();
});

// --- API Keys ---
async function loadKeys() {
  const keys = await api('/api/keys');
  const body = $('#keys-body');
  body.innerHTML = keys
    .map(
      (k) => `
    <tr>
      <td>${escapeHtml(k.label)}</td>
      <td><span class="badge ${k.scope}">${k.scope}</span></td>
      <td>${new Date(k.created_at).toLocaleString()}</td>
      <td>${k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}</td>
      <td><span class="badge ${k.revoked ? 'revoked' : 'active'}">${k.revoked ? 'Revoked' : 'Active'}</span></td>
      <td class="row-actions">
        ${k.revoked ? '' : `<button class="secondary" onclick="revokeKey('${k.id}')">Revoke</button>`}
      </td>
    </tr>`
    )
    .join('');
}

window.revokeKey = async (id) => {
  if (!confirm('Revoke this API key? Consumers using it will immediately lose access.')) return;
  await api(`/api/keys/${id}`, { method: 'DELETE' });
  loadKeys();
};

$('#new-key-btn').addEventListener('click', () => {
  $('#key-form').reset();
  $('#key-modal').classList.remove('hidden');
});
$('#key-cancel').addEventListener('click', () => $('#key-modal').classList.add('hidden'));

$('#key-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const result = await api('/api/keys', {
    method: 'POST',
    body: JSON.stringify({
      label: $('#key-label').value,
      scope: $('#key-scope').value,
    }),
  });
  $('#key-modal').classList.add('hidden');
  $('#key-reveal-value').textContent = result.key;
  $('#key-reveal-modal').classList.remove('hidden');
  loadKeys();
});

$('#key-reveal-close').addEventListener('click', () => $('#key-reveal-modal').classList.add('hidden'));

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// --- Init ---
if (state.token) {
  showApp();
} else {
  showLogin();
}
