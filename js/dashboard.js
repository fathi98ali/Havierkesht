document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // تنظیمات اصلی API
    const API_BASE_URL = 'https://edu-api.havirkesht.ir';
    const CROP_YEAR_ID = 13;

    // ----------------------
    // ۱. توابع کمکی (Helper Functions)
    // ----------------------

    function getToken() {
        return localStorage.getItem('access_token');
    }
        // مدیریت مرکزی خطاها
    async function handleApiError(response) {
        // ۱. خطای احراز هویت (401)
        if (response.status === 401) {
            alert('نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.');
            localStorage.removeItem('access_token');
            window.location.href = 'index.html';
            return;
        }

        // ۲. تلاش برای خواندن متن خطا از سرور
        try {
            const errorData = await response.json();

            // خطاهای اعتبارسنجی (422)
            if (response.status === 422 && Array.isArray(errorData.detail)) {
                let errorMessage = 'خطای اعتبارسنجی:\n';
                errorData.detail.forEach(err => {
                    // نمایش فیلد و پیام خطا
                    const field = err.loc ? err.loc[err.loc.length - 1] : 'ناشناخته';
                    errorMessage += `- فیلد ${field}: ${err.msg}\n`;
                });
                alert(errorMessage);
            }
            // سایر خطاهای دارای پیام (مثل 400 یا 404)
            else if (errorData.detail) {
                alert(`خطا: ${errorData.detail}`);
            } else {
                alert(`خطای ناشناخته (کد ${response.status})`);
            }
        } catch (e) {
            // اگر سرور JSON برنگرداند یا خطا در پارس کردن بود
            alert(`خطای ارتباط با سرور: ${response.status} ${response.statusText}`);
        }
    }


    // فرمت کردن پول (سه رقم سه رقم)
    function formatMoney(num) {
        if (num === null || num === undefined) return '۰';
        let val = Math.round(Number(num));
        return new Intl.NumberFormat('fa-IR').format(val);
    }

    // تبدیل اعداد انگلیسی به فارسی
    function convertToFarsiNumber(n) {
        if (n === null || n === undefined) return '---';
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return n.toString().replace(/\d/g, x => farsiDigits[x]);
    }

    // تابع آپدیت کردن کارت‌های داشبورد
    function updateCardValue(elementId, value, unit) {
        const el = document.getElementById(elementId);
        if (el) {
            // اگر مقدار صفر بود، همان ۰ نمایش داده شود
            const formattedValue = convertToFarsiNumber(formatMoney(value));
            el.innerHTML = `${formattedValue} <small style="font-size:0.7em; color:#666">${unit}</small>`;
        }
    }

    // ----------------------
    // ۲. تابع اصلی راه‌اندازی (Init)
    // ----------------------
    async function initDashboard() {
        const token = getToken();

        if (!token) {
            console.warn("Token not found, redirecting to login...");
            window.location.href = 'index.html';
            return;
        }

        console.log('🚀 Dashboard Started. Crop Year:', CROP_YEAR_ID);

        loadUserInfo();
        loadFullReport();
    }

        // ----------------------
    // ۳. دریافت اطلاعات کاربر (اصلاح شده)
    // ----------------------
    async function loadUserInfo() {
        try {
            // تلاش برای گرفتن اطلاعات کاربر
            // نکته: اگر سرور اندپوینت /users/me را نداشته باشد، خطای 422 می‌دهد
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: {
                    'Authorization': 'Bearer ' + getToken(),
                    'accept': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                const userEl = document.getElementById('userName');
                if (userEl) userEl.innerText = data.fullname || "مدیر سیستم";
            } else if (res.status === 422 || res.status === 404) {
                // اگر اندپوینت me وجود نداشت، ارور نده، فقط پیش‌فرض را بنویس
                console.warn("API '/users/me' not found. Defaulting to 'مدیر سیستم'.");
                const userEl = document.getElementById('userName');
                if (userEl) userEl.innerText = "مدیر سیستم";
            } else {
                // سایر خطاها
                await handleApiError(res);
            }
        } catch (err) {
            console.error('Error fetching user info:', err);
            // اینجا الرت نمی‌دهیم تا تجربه کاربری خراب نشود، چون اطلاعات اصلی داشبورد لود شده است
        }
    }


    // ----------------------
    // ۴. دریافت گزارش کامل (اصلاح شده طبق JSON شما)
    // ----------------------
        // ----------------------
    // ۴. دریافت گزارش کامل
    // ----------------------
    async function loadFullReport() {
        try {
            // ساخت URL پارامتر دار
            const url = new URL(`${API_BASE_URL}/report-full/`);
            url.searchParams.append('crop_year_id', CROP_YEAR_ID);

            // توجه: متد گزارش معمولاً GET است، اما در کد قبلی شما POST بود.
            // اگر در مستندات Swagger متد GET است، خط زیر را به GET تغییر دهید.
            // طبق کد قبلی شما POST می‌فرستم:
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + getToken(),
                    'accept': 'application/json'
                }
            });

            if (!response.ok) {
                // ارجاع به مدیریت خطا
                await handleApiError(response);
                return;
            }

            const data = await response.json();
            console.log("📊 Final Data Received:", data);

            // --- بروزرسانی کارت‌ها ---

            // ۱. مانده فعلی در حساب پیمانکار
            updateCardValue('contractorBalance', data.current_contractor_remaining_balance, 'تومان');

            // ۲. تعداد قرارداد کشاورزان
            const fCountEl = document.getElementById('farmersCount');
            if (fCountEl) {
                fCountEl.innerHTML = convertToFarsiNumber(data.farmers_commitment_count);
            }

            // ۳. کل تناژ تحویلی
            updateCardValue('totalTonnage', data.total_delivered_tonnage, 'تن');

            // ۴. جمع بدهی به کشاورزان
            updateCardValue('totalDebtToFarmers', data.total_farmers_debt, 'تومان');

            // ۵. جمع طلب از کشاورزان
            updateCardValue('totalReceivableFromFarmers', data.total_farmers_receivable, 'تومان');

            // ۶. مانده تا تسویه
            updateCardValue('remainingSettlement', data.farmers_remaining_settlement, 'تومان');

            // ۷. کارمزد پیمانکار
            updateCardValue('contractorFee', data.contractor_fee, 'تومان');

            // ۸. سود پیمانکار از بذر
            updateCardValue('seedProfit', data.contractor_seed_profit, 'تومان');

            // ۹. سود پیمانکار از سم
            updateCardValue('pesticideProfit', data.contractor_pesticide_profit, 'تومان');

            // ۱۰. وضعیت کلی
            updateCardValue('overallStatus', data.overall_contractor_status, 'تومان');

            // بروزرسانی عنوان سال زراعی
            if (data.crop_year_name) {
                const headerTitle = document.querySelector('.header-title h2');
                if (headerTitle) {
                    headerTitle.innerText = `سال زراعی فعال: ${convertToFarsiNumber(data.crop_year_name)}`;
                }
            }

        } catch (err) {
            console.error('❌ Error in Full Report:', err);
            alert('خطا در دریافت گزارش داشبورد. لطفاً اتصال اینترنت را بررسی کنید.');
        }
    }


    // ----------------------
    // ۵. دکمه خروج
    // ----------------------
        // ----------------------
    // ۵. دکمه خروج (پیشرفته)
    // ----------------------
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // ۱. تایید از کاربر
            if (!confirm('آیا مطمئن هستید که می‌خواهید از حساب کاربری خارج شوید؟')) {
                return;
            }

            // تغییر متن دکمه برای اطلاع کاربر (اختیاری)
            const originalText = logoutBtn.innerHTML;
            logoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> در حال خروج...';

            try {
                const accessToken = localStorage.getItem('access_token');

                // اگر توکن داریم، به سرور درخواست خروج می‌دهیم
                if (accessToken) {
                    const url = new URL(`${API_BASE_URL}/logout`);
                    url.searchParams.append('access_token', accessToken);
                    // اگر رفرش توکن هم دارید، اینجا اضافه کنید:
                    // url.searchParams.append('refresh_token', localStorage.getItem('refresh_token'));

                    await fetch(url, {
                        method: 'POST',
                        headers: {
                            'accept': 'application/json'
                        }
                    });
                }
            } catch (error) {
                console.error('Logout API Warning:', error);
                // خطا در API مانع خروج کاربر نمی‌شود
            } finally {
                // ۲. پاکسازی کامل مرورگر
                localStorage.clear();

                // ۳. هدایت به صفحه ورود
                window.location.href = 'index.html';
            }
        });
    }


    // شروع
    initDashboard();
});
