const SUPABASE_URL = 'https://ussbdnhpgjnwmyaroecl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzc2JkbmhwZ2pud215YXJvZWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTcyNzAsImV4cCI6MjA5NDg5MzI3MH0.AiH1Z3Lwo3P8T9ZMFXKsDaY1fp_KtnVDju0fAj-3fFk';
const ADMIN_PASSWORD = 'admin123';
const NTFY_TOPIC = 'sklep3d'; // ← ZMIEŃ NA SWÓJ KANAŁ!
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function showToast(msg) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.remove(); }, 3000);
}

function sendNotification(order) {
    fetch('https://ntfy.sh/' + NTFY_TOPIC, {
        method: 'POST',
        body: 'NOWE ZAMOWIENIE!\n\n📦 ' + order.product_name + '\n💰 ' + Number(order.product_price).toFixed(2) + ' PLN\n👤 ' + order.customer_name + '\n📱 ' + order.customer_phone + '\n📦 Pozostało: ' + order.stock + ' szt.',
        headers: { 'Title': 'Nowe zamowienie!', 'Priority': 'high', 'Tags': 'package' }
    });
}

// ===== SKLEP =====
async function loadShop() {
    var grid = document.getElementById('productsGrid');
    var empty = document.getElementById('emptyMessage');
    var loading = document.getElementById('loadingMessage');
    if (!grid) return;

    var result = await client.from('products').select('*').order('created_at', { ascending: false });
    if (loading) loading.style.display = 'none';
    
    if (result.error || !result.data || result.data.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }

    var html = '';
    for (var i = 0; i < result.data.length; i++) {
        var p = result.data[i];
        var stock = p.stock || 0;
        var stockInfo = '';
        var orderBtn = '';
        
        if (stock > 0) {
            stockInfo = '<span style="color:#16a34a;font-weight:600;">✅ Dostępne: ' + stock + ' szt.</span>';
            orderBtn = '<button class="btn btn-primary" onclick="openOrderModal(\'' + p.id + '\',\'' + p.name.replace(/'/g,"\\'") + '\',' + p.price + ')">🛒 Zamów</button>';
        } else {
            stockInfo = '<span style="color:#dc2626;font-weight:600;">❌ Brak w magazynie</span>';
            orderBtn = '<button class="btn btn-primary" disabled style="background:#9ca3af;">🚫 Niedostępny</button>';
        }
        
        html += '<article class="product-card">' +
            '<div class="product-image">' + (p.image ? '<img src="' + p.image + '">' : '<span>🖨️</span>') + '</div>' +
            '<div class="product-body">' +
            '<h3>' + p.name + '</h3>' +
            '<p>' + (p.description || '') + '</p>' +
            '<p class="product-price">' + Number(p.price).toFixed(2) + ' PLN</p>' +
            '<p>' + stockInfo + '</p>' +
            orderBtn +
            '</div></article>';
    }
    grid.innerHTML = html;
}

// ===== MODAL =====
function openOrderModal(id, name, price) {
    document.getElementById('orderProduct').value = id;
    document.getElementById('orderProductName').textContent = name + ' - ' + Number(price).toFixed(2) + ' PLN';
    document.getElementById('orderModal').style.display = 'flex';
}

function closeOrderModal() {
    document.getElementById('orderModal').style.display = 'none';
    document.getElementById('orderFeedback').style.display = 'none';
    document.getElementById('orderForm').reset();
}

var orderForm = document.getElementById('orderForm');
if (orderForm) {
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var fb = document.getElementById('orderFeedback');
        var pid = document.getElementById('orderProduct').value;
        var name = document.getElementById('customerName').value.trim();
        var phone = document.getElementById('customerPhone').value.trim();

        if (!name || !phone) { fb.textContent = 'Uzupelnij wszystkie pola'; fb.style.display = 'block'; return; }

        var prod = await client.from('products').select('*').eq('id', pid).single();
        var stock = prod.data.stock || 0;
        if (stock <= 0) { fb.textContent = 'Produkt wyprzedany'; fb.style.display = 'block'; return; }

        await client.from('orders').insert([{ product_name: prod.data.name, product_price: prod.data.price, customer_name: name, customer_phone: phone }]);
        await client.from('products').update({ stock: stock - 1 }).eq('id', pid);
        sendNotification({ product_name: prod.data.name, product_price: prod.data.price, customer_name: name, customer_phone: phone, stock: stock - 1 });

        fb.textContent = 'Zamowienie przyjete!';
        fb.style.color = '#16a34a';
        fb.style.display = 'block';
        setTimeout(function() { closeOrderModal(); loadShop(); }, 2500);
    });
}

// ===== ADMIN =====
function isLoggedIn() { return sessionStorage.getItem('admin') === 'yes'; }

function editProduct(id) {
    client.from('products').select('*').eq('id', id).single().then(function(r) {
        var p = r.data;
        document.getElementById('editId').value = p.id;
        document.getElementById('productName').value = p.name;
        document.getElementById('productPrice').value = p.price;
        document.getElementById('productStock').value = p.stock || 0;
        document.getElementById('productImage').value = p.image || '';
        document.getElementById('productDescription').value = p.description || '';
        document.getElementById('formTitle').textContent = '✏️ Edytuj produkt';
        document.getElementById('submitBtn').textContent = 'Zapisz zmiany';
        document.getElementById('cancelEditBtn').style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function cancelEdit() {
    document.getElementById('editId').value = '';
    document.getElementById('addProductForm').reset();
    document.getElementById('productStock').value = 1;
    document.getElementById('formTitle').textContent = '➕ Dodaj nowy produkt';
    document.getElementById('submitBtn').textContent = 'Dodaj produkt';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

async function loadAdminProducts() {
    var list = document.getElementById('adminProductsList');
    var empty = document.getElementById('adminEmpty');
    var badge = document.getElementById('productCount');
    if (!list) return;

    var result = await client.from('products').select('*').order('created_at', { ascending: false });
    if (badge) badge.textContent = result.data ? result.data.length : 0;
    if (!result.data || result.data.length === 0) { list.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';

    var html = '';
    for (var i = 0; i < result.data.length; i++) {
        var p = result.data[i];
        var stock = p.stock || 0;
        var stockColor = stock > 0 ? '#16a34a' : '#dc2626';
        html += '<div class="admin-product-item">' +
            '<div class="admin-product-info">' +
            '<div class="admin-product-thumb">' + (p.image ? '<img src="' + p.image + '">' : '🖨️') + '</div>' +
            '<div class="admin-product-details"><strong>' + p.name + '</strong><span>' + Number(p.price).toFixed(2) + ' PLN | <b style="color:' + stockColor + '">Stan: ' + stock + ' szt.</b></span></div>' +
            '</div>' +
            '<div style="display:flex;gap:0.5rem;">' +
            '<button class="btn btn-primary" style="padding:0.4rem 0.8rem;font-size:0.8rem;" data-edit="' + p.id + '">✏️ Edytuj</button>' +
            '<button class="btn btn-danger" data-id="' + p.id + '">🗑️</button>' +
            '</div>' +
            '</div>';
    }
    list.innerHTML = html;
    
    list.querySelectorAll('.btn-danger').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            if (!confirm('Usunac?')) return;
            await client.from('products').delete().eq('id', this.dataset.id);
            loadAdminProducts();
            showToast('Usunieto');
        });
    });

    list.querySelectorAll('[data-edit]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            editProduct(this.dataset.edit);
        });
    });
}

// ===== INICJALIZACJA =====
loadShop();

var loginForm = document.getElementById('loginForm');
var loginScreen = document.getElementById('loginScreen');
var adminPanel = document.getElementById('adminPanel');
var logoutBtn = document.getElementById('logoutBtn');
var addForm = document.getElementById('addProductForm');
var cancelBtn = document.getElementById('cancelEditBtn');

if (loginScreen && adminPanel) {
    if (isLoggedIn()) {
        loginScreen.style.display = 'none';
        adminPanel.style.display = 'grid';
        if (logoutBtn) logoutBtn.style.display = 'block';
        loadAdminProducts();
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (document.getElementById('loginPassword').value === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin', 'yes');
            loginScreen.style.display = 'none';
            adminPanel.style.display = 'grid';
            if (logoutBtn) logoutBtn.style.display = 'block';
            loadAdminProducts();
            showToast('Zalogowano!');
        } else {
            var err = document.getElementById('loginError');
            if (err) { err.textContent = 'Zle haslo'; err.style.display = 'block'; }
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        sessionStorage.removeItem('admin');
        loginScreen.style.display = 'flex';
        adminPanel.style.display = 'none';
        logoutBtn.style.display = 'none';
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelEdit);
}

if (addForm) {
    addForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var id = document.getElementById('editId').value;
        var name = document.getElementById('productName').value.trim();
        var price = parseFloat(document.getElementById('productPrice').value);
        var stock = parseInt(document.getElementById('productStock').value) || 1;
        var image = document.getElementById('productImage').value.trim();
        var desc = document.getElementById('productDescription').value.trim();
        var fb = document.getElementById('formFeedback');

        if (!name || !price) return;

        if (id) {
            // EDYCJA - przez fetch
            var response = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + id, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ name: name, price: price, stock: stock, image: image, description: desc })
            });
            
            if (response.ok) {
                cancelEdit();
                loadAdminProducts();
                if (fb) { fb.textContent = '✅ Zapisano!'; fb.className = 'form-feedback success'; fb.style.display = 'block'; }
            } else {
                if (fb) { fb.textContent = '❌ Błąd: ' + response.status; fb.className = 'form-feedback error'; fb.style.display = 'block'; }
            }
        } else {
            // DODAWANIE
            var result = await client.from('products').insert([{ name: name, price: price, stock: stock, image: image, description: desc }]);
            if (!result.error) {
                addForm.reset();
                document.getElementById('productStock').value = 1;
                loadAdminProducts();
                if (fb) { fb.textContent = '✅ Dodano!'; fb.className = 'form-feedback success'; fb.style.display = 'block'; }
            } else {
                if (fb) { fb.textContent = '❌ Błąd dodawania'; fb.className = 'form-feedback error'; fb.style.display = 'block'; }
            }
        }
        setTimeout(function() { if (fb) fb.style.display = 'none'; }, 3000);
    });
}
