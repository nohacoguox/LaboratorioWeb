(() => {
  // Secciones y tabs
  const authSection  = document.getElementById('authSection');
  const tasksSection = document.getElementById('tasksSection');
  const btnShowAuth  = document.getElementById('btnShowAuth');
  const btnShowTasks = document.getElementById('btnShowTasks');

  // Formularios
  const registerForm = document.getElementById('registerForm');
  const loginForm    = document.getElementById('loginForm');
  const taskForm     = document.getElementById('taskForm');

  // Estado/Salida
  const authStatus  = document.getElementById('authStatus');
  const tasksStatus = document.getElementById('tasksStatus');
  const tasksList   = document.getElementById('tasksList');

  // Barra de usuario (OCULTA al inicio en HTML)
  const btnLogout = document.getElementById('btnLogout');
  const userLabel = document.getElementById('userLabel');
  const userBar   = document.getElementById('userBar');

  // Cuando backend sirve el frontend en el mismo dominio (Render), dejamos base vacía
  const API_BASE = '';

  // --- Helpers de UI ---
  function setTab(show) {
    if (show === 'auth') {
      authSection.style.display  = '';
      tasksSection.style.display = 'none';
      btnShowAuth.classList.add('active');
      btnShowTasks.classList.remove('active');
    } else {
      authSection.style.display  = 'none';
      tasksSection.style.display = '';
      btnShowAuth.classList.remove('active');
      btnShowTasks.classList.add('active');
    }
  }

  function renderTasks(tasks) {
    tasksList.innerHTML = '';
    if (!tasks || tasks.length === 0) {
      tasksList.innerHTML = '<li class="muted">No hay tareas.</li>';
      return;
    }
    for (const t of tasks) {
      const li = document.createElement('li');
      li.className = 'task';

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = t.title;

      const meta = document.createElement('div');
      meta.className = 'meta';
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = t.description || 'Sin descripción';

      const status = document.createElement('span');
      status.className = `badge ${t.status}`;
      status.textContent = t.status;

      const actions = document.createElement('div');
      actions.className = 'actions';

      const btnAdvance = document.createElement('button');
      btnAdvance.className = 'outline';
      btnAdvance.textContent = 'Avanzar estado';
      btnAdvance.addEventListener('click', async () => {
        await advanceTask(t.id);
      });

      actions.appendChild(btnAdvance);
      meta.appendChild(desc);
      meta.appendChild(status);

      li.appendChild(title);
      li.appendChild(meta);
      li.appendChild(actions);
      tasksList.appendChild(li);
    }
  }

  // --- Estado de auth en memoria/localStorage ---
  const state = {
    token: localStorage.getItem('token') || null,
    user:  JSON.parse(localStorage.getItem('user') || 'null'),
  };

  function saveAuth(token, user) {
    state.token = token;
    state.user  = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    authStatus.textContent = `Sesión iniciada: ${user.name} (${user.email})`;

    // MOSTRAR barra de usuario al iniciar sesión
    if (userLabel) userLabel.textContent = `${user.name} (${user.email})`;
    if (userBar)   userBar.style.display = 'flex';
  }

  function clearAuth() {
    state.token = null;
    state.user  = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authStatus.textContent = 'No autenticado';

    // OCULTAR barra de usuario al cerrar sesión
    if (userLabel) userLabel.textContent = 'No autenticado';
    if (userBar)   userBar.style.display = 'none';
  }

  // --- Llamadas a la API ---
  async function fetchTasks() {
    if (!state.token || !state.user) return;
    tasksStatus.textContent = 'Cargando...';
    try {
      const res = await fetch(`${API_BASE}/tasks/${state.user.id}`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar tareas');
      renderTasks(data);
      tasksStatus.textContent = '';
    } catch (err) {
      tasksStatus.textContent = `Error: ${err.message}`;
    }
  }

  async function advanceTask(taskId) {
    if (!state.token) { tasksStatus.textContent = 'Debe iniciar sesión.'; return; }
    tasksStatus.textContent = 'Actualizando...';
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');
      await fetchTasks();
    } catch (err) {
      tasksStatus.textContent = `Error: ${err.message}`;
    }
  }

  // --- Eventos de UI ---
  btnShowAuth.addEventListener('click',  () => setTab('auth'));
  btnShowTasks.addEventListener('click', () => setTab('tasks'));

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        if (state.token) {
          await fetch(`${API_BASE}/users/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` }
          }).catch(() => {});
        }
      } finally {
        clearAuth();
        setTab('auth');
      }
    });
  }

  // --- Formularios ---
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('registerName').value.trim();
    const email    = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    authStatus.textContent = 'Registrando...';
    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
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
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    authStatus.textContent = 'Ingresando...';
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
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
    const title       = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    tasksStatus.textContent = 'Guardando...';
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ title, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      // Limpiar form y refrescar
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDescription').value = '';
      await fetchTasks();
      tasksStatus.textContent = 'Tarea creada.';
      setTimeout(() => tasksStatus.textContent = '', 1200);
    } catch (err) {
      tasksStatus.textContent = `Error: ${err.message}`;
    }
  });

  // --- Inicialización ---
  if (state.token && state.user) {
    // Si ya hay sesión guardada, mostrar barra y pasar a tareas
    if (userLabel) userLabel.textContent = `${state.user.name} (${state.user.email})`;
    if (userBar)   userBar.style.display = 'flex';
    setTab('tasks');
    fetchTasks();
  } else {
    // Si no hay sesión, ocultar barra y mostrar autenticación
    if (userBar) userBar.style.display = 'none';
    setTab('auth');
  }
})();
