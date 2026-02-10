document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const API_BASE_URL = 'https://edu-api.havirkesht.ir';
    let currentPage = 1;
    const pageSize = 10;
    let searchTimeout;

    // =====================
    // توابع کمکی
    // =====================
    function getToken() {
        return localStorage.getItem('access_token');
    }

    function convertToFarsiNumber(n) {
        if (n === null || n === undefined) return '---';
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return n.toString().replace(/\d/g, x => farsiDigits[x]);
    }

    // =====================
    // مدیریت مدال
    // =====================
    window.openModal = function () {
        document.getElementById('addFarmerModal').style.display = 'flex';
    };

    window.closeModal = function () {
        document.getElementById('addFarmerModal').style.display = 'none';
        document.getElementById('addFarmerForm').reset();
    };

    window.onclick = function (event) {
        const modal = document.getElementById('addFarmerModal');
        if (event.target === modal) {
            closeModal();
        }
    };

    // =====================
    // ثبت کشاورز (دست نخورده)
    // =====================
    document.getElementById('addFarmerForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const token = getToken();
        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn.innerText;

        submitBtn.innerText = 'در حال ثبت...';
        submitBtn.disabled = true;

        const firstName = document.getElementById('f_firstName').value.trim();
        const lastName = document.getElementById('f_lastName').value.trim();

        const newFarmer = {
            full_name: `${firstName} ${lastName}`,
            national_id: document.getElementById('f_nationalId').value,
            father_name: document.getElementById('f_fatherName').value,
            phone_number: document.getElementById('f_mobile').value,
            sheba_number_1: document.getElementById('f_sheba').value,
            address: document.getElementById('f_address').value,
            sheba_number_2: "",
            card_number: null
        };

        try {
            const res = await fetch(`${API_BASE_URL}/farmer/`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify(newFarmer)
            });

            if (res.ok) {
                alert('کشاورز با موفقیت افزوده شد!');
                closeModal();
                loadFarmers(1);
            } else {
                const errorData = await res.json();
                let msg = 'خطا در ثبت اطلاعات:\n';

                if (Array.isArray(errorData.detail)) {
                    errorData.detail.forEach(err => {
                        const fieldName = err.loc ? err.loc.at(-1) : 'ناشناخته';
                        msg += `⛔ ${fieldName}: ${err.msg}\n`;
                    });
                } else if (typeof errorData.detail === 'string') {
                    msg += errorData.detail;
                } else {
                    msg += JSON.stringify(errorData);
                }

                alert(msg);
            }
        } catch (err) {
            alert('خطا در ارتباط با سرور');
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });

    // =====================
    // دریافت لیست کشاورزان
    // =====================
    async function loadFarmers(page = 1, searchQuery = '') {
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // ۱. تبدیل اجباری ورودی page به عدد (رفع خطای NaN)
    let currentPage = parseInt(page);
    if (isNaN(currentPage) || currentPage < 1) {
        currentPage = 1;
    }

    // استفاده از pageSize سراسری یا مقدار پیش‌فرض ۱۰
    const currentSize = (typeof pageSize !== 'undefined') ? pageSize : 10;

    // ۲. ساخت URL با عدد مطمئن
    let url = `${API_BASE_URL}/farmer/?page=${currentPage}&size=${currentSize}&sort_by=id&sort_order=desc`;

    // اگر جستجو داشتیم اضافه کن
    if (searchQuery && searchQuery.trim() !== '') {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    }

    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error("API Error Status:", res.status);
            if (res.status === 401) {
                // اگر توکن منقضی شده بود
                localStorage.removeItem('access_token');
                localStorage.removeItem('token');
                window.location.href = 'index.html';
            }
            return;
        }

        const data = await res.json();

        // ۳. رندر کردن جدول
        renderTable(data.items);

        // ۴. رفع باگ صفحه‌بندی (نکته کلیدی)
        // اگر سرور page را برنگرداند یا null بود، از currentPage که خودمان فرستادیم استفاده کن
        const safeTotal = parseInt(data.total) || 0;
        const safePage = data.page ? parseInt(data.page) : currentPage;
        const safeSize = data.size ? parseInt(data.size) : currentSize;

        renderPagination(safeTotal, safePage, safeSize);

    } catch (error) {
        console.error("Error loading farmers:", error);
    }
}


    // =====================
    // سرچ (اصلاح شده)
    // =====================
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value;

            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadFarmers(currentPage, query);
            }, 500);
        });
    }

    // =====================
    // جدول
    // =====================
    function renderTable(farmers) {
        const tbody = document.getElementById('farmersTableBody');
        tbody.innerHTML = '';

        if (!farmers || farmers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">موردی یافت نشد</td></tr>';
            return;
        }

        farmers.forEach(farmer => {
            const name = farmer.full_name || '---';
            tbody.innerHTML += `
                <tr>
                    <td>${name}</td>
                    <td>${convertToFarsiNumber(farmer.national_id)}</td>
                    <td>${farmer.father_name || '---'}</td>
                    <td>${convertToFarsiNumber(farmer.phone_number || '---')}</td>
                    <td>
                        <i class="fa-solid fa-trash action-btn" onclick="deleteFarmer('${farmer.national_id}')"></i>
                    </td>
                </tr>
            `;
        });
    }

    // =====================
    // صفحه‌بندی
    // =====================
    function renderPagination(totalItems, page, size) {
        const totalPages = Math.ceil(totalItems / size);
        const container = document.getElementById('pagination');

        container.innerHTML = '';
        if (totalPages <= 1) return;

        let html = '';

        // قبلی
        html += `
            <button 
                class="pagination-btn" 
                ${page === 1 ? 'disabled' : ''} 
                onclick="goToPage(${page - 1})">
                قبلی
            </button>
        `;

        const maxVisible = 5;
        let start = Math.max(1, page - 2);
        let end = Math.min(totalPages, page + 2);

        if (page <= 3) {
            start = 1;
            end = Math.min(totalPages, maxVisible);
        }

        if (page + 2 >= totalPages) {
            start = Math.max(1, totalPages - 4);
            end = totalPages;
        }

        if (start > 1) {
            html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
            if (start > 2) html += `<span class="pagination-dots">...</span>`;
        }

        for (let i = start; i <= end; i++) {
            html += `
                <button 
                    class="pagination-btn ${i === page ? 'active' : ''}" 
                    onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (end < totalPages) {
            if (end < totalPages - 1) html += `<span class="pagination-dots">...</span>`;
            html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
        }

        // بعدی
        html += `
            <button 
                class="pagination-btn" 
                ${page === totalPages ? 'disabled' : ''} 
                onclick="goToPage(${page + 1})">
                بعدی
            </button>
        `;

        container.innerHTML = html;
    }

        // تابع کمکی برای نمایش خطاها
    async function handleApiError(response) {
        // ۱. اگر خطای ۴۰۱ (عدم دسترسی/انقضا توکن) باشد
        if (response.status === 401) {
            alert("نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.");
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }

        // ۲. تلاش برای خواندن متن خطا از سمت سرور
        try {
            const errorData = await response.json();

            // بررسی ساختار خطای استاندارد FastAPI
            if (errorData.detail) {
                // اگر detail آرایه باشد (معمولاً خطاهای اعتبارسنجی فیلدها)
                if (Array.isArray(errorData.detail)) {
                    let msg = "لطفاً موارد زیر را اصلاح کنید:\n";
                    errorData.detail.forEach(err => {
                        // مثلا: field_name: error message
                        const field = err.loc && err.loc.length > 0 ? err.loc[err.loc.length - 1] : 'فیلد نامشخص';
                        msg += `- ${field}: ${err.msg}\n`;
                    });
                    alert(msg);
                } else {
                    // اگر detail فقط یک متن باشد
                    alert(`خطا: ${errorData.detail}`);
                }
            } else {
                alert(`خطای ناشناخته سرور: ${response.status}`);
            }
        } catch (e) {
            // ۳. اگر پاسخ سرور اصلا JSON نبود (مثلا خطای ۵۰۰ خام)
            alert(`خطای ارتباط با سرور (Status: ${response.status})`);
        }
    }


    // تابع تغییر صفحه
    window.goToPage = function (page) {
        if (page < 1) return;
        currentPage = page;

        const searchInput = document.getElementById('searchInput');
        const query = searchInput ? searchInput.value : '';

        loadFarmers(currentPage, query);
    };


    // =====================
    // شروع
    // =====================
    loadFarmers();
});
