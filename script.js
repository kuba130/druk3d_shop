// =============================================
// Druk3D Shop - POPRAWIONY
// =============================================

const SUPABASE_URL = 'https://ussbdnhpgjnwmyaroecl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzc2JkbmhwZ2pud215YXJvZWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTcyNzAsImV4cCI6MjA5NDg5MzI3MH0.AiH1Z3Lwo3P8T9ZMFXKsDaY1fp_KtnVDju0fAj-3fFk';
const ADMIN_PASSWORD = 'admin123';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== POMOCNICZE =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.remove(); }, 2600);
}

// ===== SKLEP =====
async function loadShop() {
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('emptyMessage');
    const loading = document.getElementById('loadingMessage');
    if (!grid) return;

    if (loading) loading.style.display = 'block';
    if (empty) empty.style.display = 'none';
    grid.innerHTML = '';

    const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });

    if (loading) loading.style.display = 'none';

    if (error || !data || data.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }

    grid.innerHTML = data.map(p => `
        <article class="product-card">
            <div class="product-image">
                ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">` : '<span class="placeholder-icon">🖨️</span>'}
            </div>
            <div class="product-body">
                <h3>${escapeHtml(p.name)}</h3>
                <p class="product-description">${escapeHtml(p.description) || 'Brak opisu'}</p>
                <p class="product-price">${Number(p.price).toFixed(2)} PLN</p>
                <button class="btn btn-primary" disabled>🛒 Zamów (demo)</button>
            </div>
        </article>
    `).join('');
}

// ===== ADMIN =====
function isLoggedIn() {
    return sessionStorage.getItem('admin_logged_in') === 'true';
}

async function loadAdminProducts() {
    const list = document.getElementById('adminProductsList');
    const empty = document.getElementById('adminEmpty');
    const badge = document.getElementById('productCount');
    if (!list) return;

    const { data } = await client.from('products').select('*').order('created_at', { ascending: false });

    if (badge) badge.textContent = data ? data.length : 0;

    if (!data || data.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';

    list.innerHTML = data.map(p => `
        <div class="admin-product-item">
            <div class="admin-product-info">
                <div class="admin-product-thumb">${p.image ? `<img src="${escapeHtml(p.image)}">` : '🖨️'}</div>
                <div class="admin-product-details">
                    <strong>${escapeHtml(p.name)}</strong>
                    <span>${Number(p.price).toFixed(2)} PLN</span>
                </div>
            </div>
            <button class="btn btn-danger" data-id="${p.id}">🗑️ Usuń</button>
        </div>
    `).join('');

    list.querySelectorAll('.btn-danger').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.id;
            if (!confirm('Usunąć?')) return;
            await client.from('products').delete().eq('id', id);
            loadAdminProducts();
            showToast('🗑️ Usunięto');
        });
    });
}

// ===== INICJALIZACJA =====
document.addEventListener('DOMContentLoaded', () => {
    // SKLEP
    loadShop();

    // ADMIN - logowanie
    const loginForm = document.getElementById('loginForm');
    const loginScreen = document.getElementById('loginScreen');
    const adminPanel = document.getElementById('adminPanel');
    const logoutBtn = document.getElementById('logoutBtn');
    const addForm = document.getElementById('addProductForm');
    const feedback = document.getElementById('formFeedback');

    if (loginForm) {
        // Sprawdź sesję
        if (isLoggedIn()) {
            loginScreen.style.display = 'none';
            adminPanel.style.display = 'grid';
            if (logoutBtn) logoutBtn.style.display = 'block';
            loadAdminProducts();
        }

        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const pass = document.getElementById('loginPassword').value;
            if (pass === ADMIN_PASSWORD) {
                sessionStorage.setItem('admin_logged_in', 'true');
                loginScreen.style.display = 'none';
                adminPanel.style.display = 'grid';
                if (logoutBtn) logoutBtn.style.display = 'block';
                loadAdminProducts();
            } else {
                const err = document.getElementById('loginError');
                if (err) { err.textContent = '❌ Złe hasło'; err.style.display = 'block'; }
            }
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                sessionStorage.removeItem('admin_logged_in');
                loginScreen.style.display = 'flex';
                adminPanel.style.display = 'none';
                logoutBtn.style.display = 'none';
            });
        }
    }

    if (addForm) {
        addForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('productName').value.trim();
            const price = parseFloat(document.getElementById('productPrice').value);
            const image = document.getElementById('productImage').value.trim();
            const desc = document.getElementById('productDescription').value.trim();

            if (!name || !price || price <= 0) {
                if (feedback) { feedback.textContent = '❌ Uzupełnij nazwę i cenę'; feedback.className = 'form-feedback error'; feedback.style.display = 'block'; }
                return;
            }

            const { error } = await client.from('products').insert([{ name, price, image, description: desc }]);

            if (error) {
                if (feedback) { feedback.textContent = '❌ ' + error.message; feedback.className = 'form-feedback error'; feedback.style.display = 'block'; }
            } else {
                addForm.reset();
                loadAdminProducts();
                if (feedback) { feedback.textContent = '✅ Dodano!'; feedback.className = 'form-feedback success'; feedback.style.display = 'block'; }
                showToast('✅ Produkt dodany');
            }
        });
    }
});
