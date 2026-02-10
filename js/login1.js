console.log("✅ LOGIN JS LOADED");

const loginBtn = document.getElementById("loginBtn");

loginBtn.onclick = async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    alert("⚠️ لطفاً نام کاربری و رمز عبور را وارد کنید");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerText = "در حال ورود...";

  try {
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);
    body.append("grant_type", "password"); // OAuth2

    const res = await fetch("https://edu-api.havirkesht.ir/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: body.toString()
    });

    if (!res.ok) {
      let msg = "❌ نام کاربری یا رمز عبور اشتباه است";
      try {
        const err = await res.json();
        if (err.detail) msg = err.detail;
      } catch {}
      throw new Error(msg);
    }

    const data = await res.json();

    console.log("✅ LOGIN SUCCESS:", data);

    // ✅ ذخیره توکن‌ها
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.setItem("token_type", data.token_type);

    alert("✅ ورود با موفقیت انجام شد");

    // ✅ ریدایرکت
    window.location.replace("dashboard.html");

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    alert(err.message || "❌ خطا در ارتباط با سرور");

    loginBtn.disabled = false;
    loginBtn.innerText = "ورود به سیستم";
  }
};
