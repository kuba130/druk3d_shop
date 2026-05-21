// =============================================
// Druk3D Shop - Supabase
// GitHub Pages ready
// =============================================

// ⚠️ WAŻNE: Wpisz TUTAJ swoje dane z Supabase!
// =============================================
// Druk3D Shop - Supabase
// =============================================

const SUPABASE_URL = 'https://ussbdnhpgjnwmyaroecl.supabase.com';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzc2JkbmhwZ2pud215YXJvZWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTcyNzAsImV4cCI6MjA5NDg5MzI3MH0.AiH1Z3Lwo3P8T9ZMFXKsDaY1fp_KtnVDju0fAj-3fFk';
const ADMIN_PASSWORD = 'admin123';
// ===== KLIENT SUPABASE =====
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== FUNKCJE BAZY DANYCH =====
async function getProducts() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Błąd pobierania:", error);
        return [];
    }
}

async function addProduct(product) {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .insert([{
                name: product.name,
                price: product.price,
                image: product.image,
                description: product.description
            }])
            .select();
        
        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error("Błąd dodawania:", error);
        return { success: false, error: error.message };
    }
}

async function deleteProduct(id) {
    try {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Błąd usuwania:", error);
        return { success: false, error: error.message };
    }
}

// ===== FUNKCJE POMOCNICZE =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderProductImage(imageUrl, altText) {
    if (imageUrl && imageUrl.trim() !== '') {
        return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><span class="placeholder-icon" style="display:none;">🖨️</span>`;
    }
    return '<span class="placeholder-icon">🖨️</span>';
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 2600);
}

// ===== SESJA LOGOWANIA =====
function isLoggedIn() {
    return sessionStorage.getItem('admin_logged_in') === 'true';
}

function login(password) {
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_logged_in', 'true');
        return true;
    }
    return false;
}

function logout() {
    sessionStorage.removeItem('admin_logged_in');
}

// ===== RENDEROWANIE SKLEPU =====
async function renderShop() {
    const grid = document.getElementById('productsGrid');
    const emptyMsg = document.getElementById('emptyMessage');
    const loadingMsg = document.getElementById('loadingMessage');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    if (loadingMsg) loadingMsg.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';
    
    const products = await getProducts();
    
    if (loadingMsg) loadingMsg.style.display = 'none';
    
    if (products.length === 0) {
        grid.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = 'block';
        return;
    }
    
    if (emptyMsg) emptyMsg.style.display = 'none';
    
    grid.innerHTML = products.map(product => `
        <article class="product-card">
            <div class="product-image">
                ${renderProductImage(product.image, product.name)}
            </div>
            <div class="product-body">
                <h3>${escapeHtml(product.name)}</h3>
                <p class="product-description">${escapeHtml(product.description) || 'Brak opisu produktu'}</p>
                <p class="product-price">${(Number(product.price) || 0).toFixed(2)} PLN</p>
                <button class="btn btn-primary" disabled>🛒 Zamów (demo)</button>
            </div>
        </article>
    `).join('');
}

// ===== RENDEROWANIE PANELU ADMINA =====
async function renderAdminProducts() {
    const list = document.getElementById('adminProductsList');
    const empty = document.getElementById('adminEmpty');
    const countBadge = document.getElementById('productCount');
    
    if (!list) return;
    
    const products = await getProducts();
    
    if (countBadge) countBadge.textContent = products.length;
    
    if (products.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    list.innerHTML = products.map(product => `
        <div class="admin-product-item">
            <div class="admin-product-info">
                <div class="admin-product-thumb">
                    ${renderProductImage(product.image, product.name)}
                </div>
                <div class="admin-product-details">
                    <strong title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</strong>
                    <span>${(Number(product.price) || 0).toFixed(2)} PLN</span>
                </div>
            </div>
            <button class="btn btn-danger" data-delete-id="${product.id}">🗑️ Usuń</button>
        </div>
    `).join('');
    
    // Podpinanie przycisków usuwania
    list.querySelectorAll('.btn-danger').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.dataset.deleteId;
            if (!confirm('Usunąć ten produkt?')) return;
            
            const result = await deleteProduct(id);
            if (result.success) {
                await renderAdminProducts();
                showToast('🗑️ Produkt usunięty');
            } else {
                showToast('❌ Błąd usuwania');
            }
        });
    });
}

// ===== OBSŁUGA LOGOWANIA =====
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const password = document.getElementById('loginPassword').value;
        
        if (login(password)) {
            showAdminPanel();
        } else {
            if (loginError) {
                loginError.textContent = '❌ Nieprawidłowe hasło';
                loginError.style.display = 'block';
                setTimeout(() => { loginError.style.display = 'none'; }, 3000);
            }
        }
    });
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', function() {
        logout();
        showLoginScreen();
    });
}

function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const adminPanel = document.getElementById('adminPanel');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (adminPanel) adminPanel.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    
    // Wyczyść pole hasła
    const passInput = document.getElementById('loginPassword');
    if (passInput) passInput.value = '';
}

function showAdminPanel() {
    const loginScreen = document.getElementById('loginScreen');
    const adminPanel = document.getElementById('adminPanel');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'grid';
    if (logoutBtn) logoutBtn.style.display = 'block';
    
    renderAdminProducts();
}

// ===== OBSŁUGA FORMULARZA DODAWANIA =====
function setupAdminForm() {
    const form = document.getElementById('addProductForm');
    const feedback = document.getElementById('formFeedback');
    
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const image = document.getElementById('productImage').value.trim();
        const description = document.getElementById('productDescription').value.trim();
        
        if (!name || !price || price <= 0) {
            if (feedback) {
                feedback.textContent = '❌ Wypełnij nazwę i prawidłową cenę';
                feedback.className = 'form-feedback error';
                feedback.style.display = 'block';
                setTimeout(() => { feedback.style.display = 'none'; }, 3000);
            }
            return;
        }
        
        const result = await addProduct({ name, price, image, description });
        
        if (result.success) {
            form.reset();
            await renderAdminProducts();
            if (feedback) {
                feedback.textContent = '✅ Produkt dodany!';
                feedback.className = 'form-feedback success';
                feedback.style.display = 'block';
                setTimeout(() => { feedback.style.display = 'none'; }, 3000);
            }
            showToast('✅ Produkt dodany');
        } else {
            if (feedback) {
                feedback.textContent = '❌ Błąd: ' + result.error;
                feedback.className = 'form-feedback error';
                feedback.style.display = 'block';
            }
        }
    });
}

// ===== INICJALIZACJA STRONY =====
function initPage() {
    // Sprawdź, która strona
    const isShop = document.getElementById('productsGrid');
    const isAdmin = document.getElementById('loginScreen');
    
    if (isShop) {
        renderShop();
    }
    
    if (isAdmin) {
        setupLoginForm();
        setupLogoutButton();
        setupAdminForm();
        
        // Sprawdź czy już zalogowany
        if (isLoggedIn()) {
            showAdminPanel();
        } else {
            showLoginScreen();
        }
    }
}

// Start
document.addEventListener('DOMContentLoaded', initPage);
