/* ── Auth helpers ── */
const getToken = () => localStorage.getItem('token');
const getUser  = () => JSON.parse(localStorage.getItem('user') || 'null');

const api = async (path, opts = {}) => {
  const res = await fetch('/api' + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken(),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

/* ── Toast ── */
const toast = (msg, type = 'success') => {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
};

/* ── Modal ── */
const openModal = (title, html, onSubmit) => {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
  if (onSubmit) {
    const form = document.getElementById('modalForm');
    if (form) form.onsubmit = (e) => { e.preventDefault(); onSubmit(); };
  }
};

const closeModal = () => document.getElementById('modalOverlay').classList.remove('open');

document.getElementById('modalClose').onclick = closeModal;
document.getElementById('modalOverlay').onclick = (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
};

/* ── Router ── */
const pages = ['dashboard', 'records', 'users'];
let currentPage = 'dashboard';

const navigate = (page) => {
  currentPage = page;
  pages.forEach(p => {
    document.getElementById('page-' + p).classList.toggle('active', p === page);
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  });
  window.history.pushState({}, '', '/' + page);
  renderPage(page);
};

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', (e) => { e.preventDefault(); navigate(el.dataset.page); });
});

/* ── Format helpers ── */
const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/* ══════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════ */
let monthlyChart = null;
let categoryChart = null;

const renderDashboard = async () => {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">Financial overview at a glance</div>
      </div>
    </div>
    <div class="cards-grid" id="summaryCards">
      ${[1,2,3,4].map(() => `<div class="stat-card"><div class="loading"><span class="spinner"></span></div></div>`).join('')}
    </div>
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-title">Monthly Income vs Expenses</div>
        <div class="chart-wrap"><canvas id="monthlyChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">Spending by Category</div>
        <div class="chart-wrap"><canvas id="categoryChart"></canvas></div>
      </div>
    </div>
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">Recent Activity</div>
      </div>
      <div style="padding:0 20px 8px" id="recentList">
        <div class="loading"><span class="spinner"></span> Loading...</div>
      </div>
    </div>
  `;

  try {
    const [summary, monthly, categories, recent] = await Promise.all([
      api('/dashboard/summary'),
      api('/dashboard/monthly-trends'),
      api('/dashboard/by-category'),
      api('/dashboard/recent?limit=8'),
    ]);

    // Summary cards
    document.getElementById('summaryCards').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Total Income</div>
        <div class="stat-value green">${fmt(summary.total_income)}</div>
        <span class="stat-badge green">↑ Income</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Expenses</div>
        <div class="stat-value red">${fmt(summary.total_expenses)}</div>
        <span class="stat-badge red">↓ Expense</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">Net Balance</div>
        <div class="stat-value ${summary.net_balance >= 0 ? 'green' : 'red'}">${fmt(summary.net_balance)}</div>
        <span class="stat-badge ${summary.net_balance >= 0 ? 'green' : 'red'}">${summary.net_balance >= 0 ? '▲ Positive' : '▼ Negative'}</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Records</div>
        <div class="stat-value purple">${summary.total_records}</div>
        <span class="stat-badge blue">Transactions</span>
      </div>
    `;

    // Monthly chart
    if (monthlyChart) monthlyChart.destroy();
    const mCtx = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(mCtx, {
      type: 'bar',
      data: {
        labels: monthly.map(r => r.month),
        datasets: [
          { label: 'Income',   data: monthly.map(r => r.income),   backgroundColor: 'rgba(16,185,129,0.7)',  borderRadius: 4 },
          { label: 'Expenses', data: monthly.map(r => r.expenses), backgroundColor: 'rgba(239,68,68,0.7)',   borderRadius: 4 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } } },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#64748b', callback: v => '₹' + v.toLocaleString('en-IN') }, grid: { color: 'rgba(255,255,255,0.04)' } },
        },
      },
    });

    // Category chart
    const expCats = categories.filter(c => c.type === 'expense').slice(0, 6);
    if (categoryChart) categoryChart.destroy();
    const cCtx = document.getElementById('categoryChart').getContext('2d');
    const palette = ['#6c63ff','#10b981','#f59e0b','#ef4444','#3b82f6','#a78bfa'];
    categoryChart = new Chart(cCtx, {
      type: 'doughnut',
      data: {
        labels: expCats.length ? expCats.map(c => c.category) : ['No data'],
        datasets: [{
          data: expCats.length ? expCats.map(c => c.total) : [1],
          backgroundColor: palette,
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 12 } },
        },
      },
    });

    // Recent activity
    document.getElementById('recentList').innerHTML = recent.length
      ? `<div class="activity-list">${recent.map(r => `
          <div class="activity-item">
            <div class="activity-dot ${r.type}"></div>
            <div class="activity-info">
              <div class="activity-cat">${r.category}</div>
              <div class="activity-date">${fmtDate(r.date)} · ${r.created_by_name}</div>
            </div>
            <div class="activity-amount ${r.type}">${r.type === 'income' ? '+' : '-'}${fmt(r.amount)}</div>
          </div>`).join('')}
        </div>`
      : `<div class="empty-state"><div class="empty-icon">📭</div><p>No recent activity</p></div>`;

  } catch (err) {
    toast(err.message, 'error');
  }
};

/* ══════════════════════════════════════
   RECORDS PAGE
══════════════════════════════════════ */
let recordsState = { page: 1, type: '', category: '', from: '', to: '' };

const renderRecords = async () => {
  const user = getUser();
  const canWrite = user.role === 'admin' || user.role === 'analyst';
  const el = document.getElementById('page-records');

  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Financial Records</div>
        <div class="page-subtitle">Manage all income and expense entries</div>
      </div>
      ${canWrite ? `<button class="btn-primary" id="addRecordBtn">+ Add Record</button>` : ''}
    </div>
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">All Records</div>
        <div class="table-filters">
          <select class="filter-select" id="filterType">
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input class="filter-input" id="filterCategory" placeholder="Category..." style="width:130px"/>
          <input class="filter-input" id="filterFrom" type="date" title="From date"/>
          <input class="filter-input" id="filterTo"   type="date" title="To date"/>
          <button class="btn-ghost" id="applyFilter">Filter</button>
          <button class="btn-ghost" id="clearFilter">Clear</button>
        </div>
      </div>
      <div id="recordsTableWrap"><div class="loading"><span class="spinner"></span> Loading...</div></div>
    </div>
  `;

  if (canWrite) {
    document.getElementById('addRecordBtn').onclick = () => openRecordModal();
  }

  document.getElementById('applyFilter').onclick = () => {
    recordsState.page = 1;
    recordsState.type     = document.getElementById('filterType').value;
    recordsState.category = document.getElementById('filterCategory').value;
    recordsState.from     = document.getElementById('filterFrom').value;
    recordsState.to       = document.getElementById('filterTo').value;
    loadRecordsTable();
  };

  document.getElementById('clearFilter').onclick = () => {
    recordsState = { page: 1, type: '', category: '', from: '', to: '' };
    document.getElementById('filterType').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterFrom').value = '';
    document.getElementById('filterTo').value = '';
    loadRecordsTable();
  };

  loadRecordsTable();
};

const loadRecordsTable = async () => {
  const user = getUser();
  const canWrite = user.role === 'admin' || user.role === 'analyst';
  const wrap = document.getElementById('recordsTableWrap');
  if (!wrap) return;
  wrap.innerHTML = `<div class="loading"><span class="spinner"></span> Loading...</div>`;

  try {
    const { type, category, from, to, page } = recordsState;
    const q = new URLSearchParams({ page, limit: 15 });
    if (type)     q.set('type', type);
    if (category) q.set('category', category);
    if (from)     q.set('from', from);
    if (to)       q.set('to', to);

    const { records, pagination } = await api('/records?' + q);

    if (!records.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📂</div><p>No records found</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Date</th><th>Category</th><th>Type</th>
              <th>Amount</th><th>Notes</th><th>By</th>
              ${canWrite ? '<th>Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td style="color:var(--muted)">${r.id}</td>
                <td>${fmtDate(r.date)}</td>
                <td style="font-weight:500;color:var(--text)">${r.category}</td>
                <td><span class="badge badge-${r.type}">${r.type}</span></td>
                <td class="amount-cell ${r.type}">${r.type === 'income' ? '+' : '-'}${fmt(r.amount)}</td>
                <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.notes || '—'}</td>
                <td>${r.created_by_name}</td>
                ${canWrite ? `
                  <td>
                    <div class="action-btns">
                      <button class="btn-ghost" onclick="openRecordModal(${JSON.stringify(r).replace(/"/g,'&quot;')})">Edit</button>
                      <button class="btn-danger" onclick="deleteRecord(${r.id})">Delete</button>
                    </div>
                  </td>` : ''}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span>Showing ${records.length} of ${pagination.total} records</span>
        <div class="pagination-btns">
          <button class="page-btn" ${pagination.page <= 1 ? 'disabled' : ''} onclick="changePage(${pagination.page - 1})">← Prev</button>
          <button class="page-btn active">${pagination.page}</button>
          <button class="page-btn" ${pagination.page * pagination.limit >= pagination.total ? 'disabled' : ''} onclick="changePage(${pagination.page + 1})">Next →</button>
        </div>
      </div>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p style="color:var(--red)">${err.message}</p></div>`;
  }
};

window.changePage = (p) => { recordsState.page = p; loadRecordsTable(); };

window.openRecordModal = (record = null) => {
  const isEdit = !!record;
  const today = new Date().toISOString().split('T')[0];
  openModal(isEdit ? 'Edit Record' : 'Add Record', `
    <form id="modalForm">
      <div class="form-row">
        <div class="form-group">
          <label>Amount (₹)</label>
          <input type="number" id="f_amount" step="0.01" min="0.01" placeholder="0.00" value="${isEdit ? record.amount : ''}" required/>
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="f_type">
            <option value="income"  ${isEdit && record.type==='income'  ? 'selected':''}>Income</option>
            <option value="expense" ${isEdit && record.type==='expense' ? 'selected':''}>Expense</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Category</label>
          <input type="text" id="f_category" placeholder="e.g. Salary, Rent" value="${isEdit ? record.category : ''}" required/>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="f_date" value="${isEdit ? record.date : today}" required/>
        </div>
      </div>
      <div class="form-group">
        <label>Notes (optional)</label>
        <textarea id="f_notes" placeholder="Add a note...">${isEdit ? (record.notes || '') : ''}</textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">${isEdit ? 'Save Changes' : 'Add Record'}</button>
      </div>
    </form>
  `, async () => {
    const body = {
      amount:   parseFloat(document.getElementById('f_amount').value),
      type:     document.getElementById('f_type').value,
      category: document.getElementById('f_category').value,
      date:     document.getElementById('f_date').value,
      notes:    document.getElementById('f_notes').value,
    };
    try {
      if (isEdit) {
        await api('/records/' + record.id, { method: 'PUT', body });
        toast('Record updated successfully');
      } else {
        await api('/records', { method: 'POST', body });
        toast('Record added successfully');
      }
      closeModal();
      loadRecordsTable();
    } catch (err) { toast(err.message, 'error'); }
  });
};

window.deleteRecord = async (id) => {
  if (!confirm('Delete this record? This action cannot be undone.')) return;
  try {
    await api('/records/' + id, { method: 'DELETE' });
    toast('Record deleted');
    loadRecordsTable();
  } catch (err) { toast(err.message, 'error'); }
};

/* ══════════════════════════════════════
   USERS PAGE
══════════════════════════════════════ */
const renderUsers = async () => {
  const el = document.getElementById('page-users');
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">User Management</div>
        <div class="page-subtitle">Manage roles and access levels</div>
      </div>
    </div>
    <div class="table-card">
      <div class="table-header">
        <div class="table-title">All Users</div>
        <div class="table-filters">
          <select class="filter-select" id="filterRole">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="analyst">Analyst</option>
            <option value="viewer">Viewer</option>
          </select>
          <select class="filter-select" id="filterStatus">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button class="btn-ghost" id="applyUserFilter">Filter</button>
        </div>
      </div>
      <div id="usersTableWrap"><div class="loading"><span class="spinner"></span> Loading...</div></div>
    </div>
  `;

  document.getElementById('applyUserFilter').onclick = loadUsersTable;
  loadUsersTable();
};

const loadUsersTable = async () => {
  const wrap = document.getElementById('usersTableWrap');
  if (!wrap) return;
  wrap.innerHTML = `<div class="loading"><span class="spinner"></span> Loading...</div>`;

  try {
    const role   = document.getElementById('filterRole')?.value   || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const q = new URLSearchParams({ limit: 50 });
    if (role)   q.set('role', role);
    if (status) q.set('status', status);

    const { users } = await api('/users?' + q);
    const me = getUser();

    if (!users.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>No users found</p></div>`;
      return;
    }

    wrap.innerHTML = `
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td style="color:var(--muted)">${u.id}</td>
                <td style="font-weight:500;color:var(--text)">${u.name} ${u.id === me.id ? '<span style="font-size:10px;color:var(--accent2)">(you)</span>' : ''}</td>
                <td>${u.email}</td>
                <td><span class="badge badge-${u.role}">${u.role}</span></td>
                <td><span class="badge badge-${u.status}">${u.status}</span></td>
                <td>${fmtDate(u.created_at)}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn-ghost" onclick="openUserModal(${JSON.stringify(u).replace(/"/g,'&quot;')})">Edit</button>
                    ${u.id !== me.id ? `<button class="btn-danger" onclick="deleteUser(${u.id})">Delete</button>` : ''}
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p style="color:var(--red)">${err.message}</p></div>`;
  }
};

window.openUserModal = (user) => {
  openModal('Edit User', `
    <form id="modalForm">
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="u_name" value="${user.name}" required/>
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="u_role">
          <option value="viewer"  ${user.role==='viewer'  ? 'selected':''}>Viewer</option>
          <option value="analyst" ${user.role==='analyst' ? 'selected':''}>Analyst</option>
          <option value="admin"   ${user.role==='admin'   ? 'selected':''}>Admin</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="u_status">
          <option value="active"   ${user.status==='active'   ? 'selected':''}>Active</option>
          <option value="inactive" ${user.status==='inactive' ? 'selected':''}>Inactive</option>
        </select>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn-primary">Save Changes</button>
      </div>
    </form>
  `, async () => {
    try {
      await api('/users/' + user.id, {
        method: 'PATCH',
        body: {
          name:   document.getElementById('u_name').value,
          role:   document.getElementById('u_role').value,
          status: document.getElementById('u_status').value,
        },
      });
      toast('User updated successfully');
      closeModal();
      loadUsersTable();
    } catch (err) { toast(err.message, 'error'); }
  });
};

window.deleteUser = async (id) => {
  if (!confirm('Delete this user permanently?')) return;
  try {
    await api('/users/' + id, { method: 'DELETE' });
    toast('User deleted');
    loadUsersTable();
  } catch (err) { toast(err.message, 'error'); }
};

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
const renderPage = (page) => {
  if (page === 'dashboard') renderDashboard();
  if (page === 'records')   renderRecords();
  if (page === 'users')     renderUsers();
};

const init = () => {
  const token = getToken();
  const user  = getUser();

  if (!token || !user) {
    window.location.href = '/login';
    return;
  }

  // Show app
  document.getElementById('appShell').style.display = 'flex';

  // Set user info in sidebar
  document.getElementById('sidebarName').textContent = user.name;
  document.getElementById('sidebarRole').textContent = user.role;
  document.getElementById('userAvatar').textContent  = user.name.charAt(0).toUpperCase();

  // Show admin-only nav items
  if (user.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
  }

  // Logout
  document.getElementById('logoutBtn').onclick = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Determine initial page from URL
  const path = window.location.pathname.replace('/', '') || 'dashboard';
  const page = pages.includes(path) ? path : 'dashboard';
  navigate(page);
};

init();
