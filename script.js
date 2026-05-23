const SUPABASE_URL = 'https://ussbdnhpgjnwmyaroecl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzc2JkbmhwZ2pud215YXJvZWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTcyNzAsImV4cCI6MjA5NDg5MzI3MH0.AiH1Z3Lwo3P8T9ZMFXKsDaY1fp_KtnVDju0fAj-3fFk';
const ADMIN_PASSWORD = 'admin123';
const NTFY_TOPIC = 'sklep3d'; // ← ZMIEŃ NA SWÓJ KANAŁ NTFY!
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

// ===== MODAL ZAMÓWIENIA =====
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

        if (!name || !phone) {
            fb.textContent = 'Uzupelnij wszystkie pola';
            fb.style.display = 'block';
            return;
        }

        var prod = await client.from('products').select('*').eq('id', pid).single();
        var stock = prod.data.stock || 0;
        
        if (stock <= 0) {
            fb.textContent = 'Przepraszamy, produkt wlasnie sie wyprzedal';
            fb.style.display = 'block';
            return;
        }

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
        html += '<div class="admin-product-item">' +
            '<div class="admin-product-info">' +
            '<div class="admin-product-thumb">' + (p.image ? '<img src="' + p.image + '">' : '🖨️') + '</div>' +
            '<div class="admin-product-details"><strong>' + p.name + '</strong><span>' + Number(p.price).toFixed(2) + ' PLN | Stan: ' + stock + ' szt.</span></div>' +
            '</div>' +
            '<button class="btn btn-danger" data-id="' + p.id + '">Usun</button>' +
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
}

// ===== INICJALIZACJA =====
loadShop();

var loginForm = document.getElementById('loginForm');
var loginScreen = document.getElementById('loginScreen');
var adminPanel = document.getElementById('adminPanel');
var logoutBtn = document.getElementById('logoutBtn');
var addForm = document.getElementById('addProductForm');

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
        var pass = document.getElementById('loginPassword').value;
        if (pass === ADMIN_PASSWORD) {
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

if (addForm) {
    addForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var name = document.getElementById('productName').value.trim();
        var price = parseFloat(document.getElementById('productPrice').value);
        var stock = parseInt(document.getElementById('productStock').value) || 1;
        var image = document.getElementById('productImage').value.trim();
        var desc = document.getElementById('productDescription').value.trim();

        if (!name || !price) return;

        var result = await client.from('products').insert([{ name: name, price: price, stock: stock, image: image, description: desc }]);
        if (!result.error) {
            addForm.reset();
            document.getElementById('productStock').value = 1;
            loadAdminProducts();
            showToast('Dodano produkt (stan: ' + stock + ' szt.)');
        }
    });
}
