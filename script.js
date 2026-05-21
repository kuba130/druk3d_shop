const SUPABASE_URL = 'https://ussbdnhpgjnwmyaroecl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzc2JkbmhwZ2pud215YXJvZWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTcyNzAsImV4cCI6MjA5NDg5MzI3MH0.AiH1Z3Lwo3P8T9ZMFXKsDaY1fp_KtnVDju0fAj-3fFk';
const ADMIN_PASSWORD = 'admin123';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.remove(); }, 2600);
}

// SKLEP
async function loadShop() {
    var grid = document.getElementById('productsGrid');
    var empty = document.getElementById('emptyMessage');
    var loading = document.getElementById('loadingMessage');
    if (!grid) return;

    var result = await client.from('products').select('*').order('created_at', { ascending: false });
    
    if (loading) loading.style.display = 'none';
    
    if (result.error) {
        console.error(result.error);
        if (empty) empty.style.display = 'block';
        return;
    }
    
    var products = result.data;
    
    if (!products || products.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }

    var html = '';
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        html += '<article class="product-card">' +
            '<div class="product-image">' +
            (p.image ? '<img src="' + p.image + '" alt="' + p.name + '">' : '<span class="placeholder-icon">🖨️</span>') +
            '</div>' +
            '<div class="product-body">' +
            '<h3>' + p.name + '</h3>' +
            '<p class="product-description">' + (p.description || 'Brak opisu') + '</p>' +
            '<p class="product-price">' + Number(p.price).toFixed(2) + ' PLN</p>' +
            '<button class="btn btn-primary" disabled>🛒 Zamów (demo)</button>' +
            '</div>' +
            '</article>';
    }
    grid.innerHTML = html;
}

// ADMIN
function isLoggedIn() {
    return sessionStorage.getItem('admin') === 'yes';
}

async function loadAdminProducts() {
    var list = document.getElementById('adminProductsList');
    var empty = document.getElementById('adminEmpty');
    var badge = document.getElementById('productCount');
    if (!list) return;

    var result = await client.from('products').select('*').order('created_at', { ascending: false });
    
    if (badge) badge.textContent = result.data ? result.data.length : 0;
    
    if (!result.data || result.data.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    
    if (empty) empty.style.display = 'none';

    var html = '';
    for (var i = 0; i < result.data.length; i++) {
        var p = result.data[i];
        html += '<div class="admin-product-item">' +
            '<div class="admin-product-info">' +
            '<div class="admin-product-thumb">' + (p.image ? '<img src="' + p.image + '">' : '🖨️') + '</div>' +
            '<div class="admin-product-details"><strong>' + p.name + '</strong><span>' + Number(p.price).toFixed(2) + ' PLN</span></div>' +
            '</div>' +
            '<button class="btn btn-danger" data-id="' + p.id + '">🗑️ Usuń</button>' +
            '</div>';
    }
    list.innerHTML = html;

    var buttons = list.querySelectorAll('.btn-danger');
    for (var j = 0; j < buttons.length; j++) {
        buttons[j].addEventListener('click', async function() {
            var id = this.dataset.id;
            if (!confirm('Usunąć?')) return;
            await client.from('products').delete().eq('id', id);
            loadAdminProducts();
            showToast('Usunięto');
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadShop();

    var loginForm = document.getElementById('loginForm');
    var loginScreen = document.getElementById('loginScreen');
    var adminPanel = document.getElementById('adminPanel');
    var logoutBtn = document.getElementById('logoutBtn');
    var addForm = document.getElementById('addProductForm');
    var feedback = document.getElementById('formFeedback');

    if (loginForm) {
        if (isLoggedIn()) {
            loginScreen.style.display = 'none';
            adminPanel.style.display = 'grid';
            if (logoutBtn) logoutBtn.style.display = 'block';
            loadAdminProducts();
        }

        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var pass = document.getElementById('loginPassword').value;
            if (pass === ADMIN_PASSWORD) {
                sessionStorage.setItem('admin', 'yes');
                loginScreen.style.display = 'none';
                adminPanel.style.display = 'grid';
                if (logoutBtn) logoutBtn.style.display = 'block';
                loadAdminProducts();
            } else {
                var err = document.getElementById('loginError');
                if (err) { err.textContent = 'Złe hasło'; err.style.display = 'block'; }
            }
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                sessionStorage.removeItem('admin');
                loginScreen.style.display = 'flex';
                adminPanel.style.display = 'none';
                logoutBtn.style.display = 'none';
            });
        }
    }

    if (addForm) {
        addForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var name = document.getElementById('productName').value.trim();
            var price = parseFloat(document.getElementById('productPrice').value);
            var image = document.getElementById('productImage').value.trim();
            var desc = document.getElementById('productDescription').value.trim();

            if (!name || !price || price <= 0) {
                if (feedback) { feedback.textContent = 'Uzupełnij nazwę i cenę'; feedback.className = 'form-feedback error'; feedback.style.display = 'block'; }
                return;
            }

            var result = await client.from('products').insert([{ name: name, price: price, image: image, description: desc }]);

            if (result.error) {
                if (feedback) { feedback.textContent = 'Błąd: ' + result.error.message; feedback.className = 'form-feedback error'; feedback.style.display = 'block'; }
            } else {
                addForm.reset();
                loadAdminProducts();
                if (feedback) { feedback.textContent = 'Dodano!'; feedback.className = 'form-feedback success'; feedback.style.display = 'block'; }
                showToast('Produkt dodany');
            }
        });
    }
});
