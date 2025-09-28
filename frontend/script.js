(() => {
  const authSection = document.getElementById('authSection');
  const tasksSection = document.getElementById('tasksSection');
  const btnShowAuth = document.getElementById('btnShowAuth');
  const btnShowTasks = document.getElementById('btnShowTasks');

  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const taskForm = document.getElementById('taskForm');

  const authStatus = document.getElementById('authStatus');
  const tasksStatus = document.getElementById('tasksStatus');
  const tasksList = document.getElementById('tasksList');
  const btnLogout = document.getElementById('btnLogout');
  const userLabel = document.getElementById('userLabel');

  // When deployed on Render (backend serves frontend), keep same-origin API_BASE:
  const API_BASE = '';

  function setTab(show) {
    if (show === 'auth') {
      authSection.classList.add('visible');
      tasksSection.classList.remove('visible');
      btnShowAuth.classList.add('active'); btnShowTasks.classList.remove('active');
    } else {
      tasksSection.classList.add('visible');
      authSection.classList.remove('visible');
      btnShowTasks.classList.add('active'); btnShowAuth.classList.remove('active');
    }
  }
  btnShowAuth.addEventListener('click', () => setTab('auth'));
  
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        if (state.token) {
          await fetch(`${API_BASE}/users/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${state.token}` }}).catch(() => {});
        }
      } finally {
        clearAuth();
        setTab('auth');
      }
    });
  }
btnShowTasks.addEventListener('click', () => setTab('tasks'));

  const state = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
  };

  function saveAuth(token, user) {
    state.token = token; state.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    authStatus.textContent = `Sesión iniciada: ${user.name} (${user.email})`;
    if (userLabel) userLabel.textContent = `${user.name} (${user.email})`;
  }

  function clearAuth() {
    state.token = null; state.user = null;
    localStorage.removeItem('token'); localStorage.removeItem('user');
    authStatus.textContent = 'No autenticado';
    if (userLabel) userLabel.textContent = 'No autenticado';
    if (userLabel) userLabel.textContent = 'No autenticado';
  }

  if (state.token && state.user) {
    authStatus.textContent = `Sesión activa: ${state.user.name} (${state.user.email})`;
    if (userLabel) userLabel.textContent = `${state.user.name} (${state.user.email})`;
  } else {
    authStatus.textContent = 'No autenticado';
    if (userLabel) userLabel.textContent = 'No autenticado';
    if (userLabel) userLabel.textContent = 'No autenticado';
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    authStatus.textContent = 'Registrando...';
    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error de registro');
      saveAuth(data.token, data.user);
      setTab('tasks');
      await fetchTasks();
    } catch (err) {
      authStatus.textContent = `Error: ${err.message}`;
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    authStatus.textContent = 'Ingresando...';
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error de inicio de sesión');
      saveAuth(data.token, data.user);
      setTab('tasks');
      await fetchTasks();
    } catch (err) {
      authStatus.textContent = `Error: ${err.message}`;
    }
  });

  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.token) { tasksStatus.textContent = 'Debe iniciar sesión.'; return; }
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    tasksStatus.textContent = 'Guardando...';
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.token}` },
        body: JSON.stringify({ title, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la tarea');
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDescription').value = '';
      tasksStatus.textContent = 'Tarea creada.';
      await fetchTasks();
    } catch (err) {
      tasksStatus.textContent = `Error: ${err.message}`;
    }
  });

  async function fetchTasks() {
    if (!state.token || !state.user) return;
    tasksStatus.textContent = 'Cargando tareas...';
    try {
      const res = await fetch(`${API_BASE}/tasks/${state.user.id}`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar tareas');
      renderTasks(data);
      tasksStatus.textContent = `${data.length} tareas`;
    } catch (err) {
      tasksStatus.textContent = `Error: ${err.message}`;
    }
  }

  function renderTasks(tasks) {
    tasksList.innerHTML = '';
    tasks.forEach(t => {
      const li = document.createElement('li');
      li.className = 'task';
      li.innerHTML = `
        <div class="meta">
          <div><strong>${t.title}</strong></div>
          <div class="badge ${t.status}">${t.status.replace('_',' ')}</div>
          ${t.description ? `<div class="desc">${t.description}</div>` : ''}
          <small class="muted">Creada: ${new Date(t.created_at).toLocaleString()}</small>
        </div>
        <div>
          <button class="small secondary" data-advance="${t.id}">Avanzar estado</button>
        </div>
      `;
      const btn = li.querySelector('[data-advance]');
      btn.addEventListener('click', () => advanceStatus(t.id));
      tasksList.appendChild(li);
    });
  }

  async function advanceStatus(taskId) {
    if (!state.token) return;
    tasksStatus.textContent = 'Actualizando estado...';
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');
      await fetchTasks();
    } catch (err) {
      tasksStatus.textContent = `Error: ${err.message}`;
    }
  }

  if (state.token && state.user) {
    setTab('tasks');
    fetchTasks();
  } else {
    setTab('auth');
  }
})();
