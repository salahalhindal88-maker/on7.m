const fs = require("fs");
const http = require("http");
const path = require("path");
const { randomUUID, timingSafeEqual } = require("crypto");

const DASHBOARD_PATH = path.join(__dirname, "dashboard.html");
const MAX_BODY_SIZE = 64 * 1024;
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000;

function sendJson(response, statusCode, data, headers = {}) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        ...headers
    });
    response.end(JSON.stringify(data));
}

function isLoopback(address) {
    return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.setEncoding("utf8");
        request.on("data", chunk => {
            body += chunk;
            if (Buffer.byteLength(body, "utf8") > MAX_BODY_SIZE) {
                reject(new Error("حجم الطلب أكبر من المسموح."));
                request.destroy();
            }
        });
        request.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                reject(new Error("صيغة البيانات المرسلة غير صحيحة."));
            }
        });
        request.on("error", reject);
    });
}

function parseCookies(header = "") {
    const cookies = {};
    for (const part of header.split(";")) {
        const separator = part.indexOf("=");
        if (separator !== -1) cookies[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
    }
    return cookies;
}

function startDashboard({ getItemsDatabase, updateItemPrices }) {
    const port = Number(process.env.PORT || process.env.DASHBOARD_PORT || 3030);
    const host = process.env.DASHBOARD_HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1");
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT or DASHBOARD_PORT must be a valid port number.");
    }

    const isPublic = !isLoopback(host);
    const password = process.env.DASHBOARD_PASSWORD;
    let publicUrl;
    if (isPublic) {
        if (!password || password.length < 16) {
            throw new Error("Public dashboard requires DASHBOARD_PASSWORD with at least 16 characters.");
        }
        if (!process.env.DASHBOARD_ORIGIN) {
            throw new Error("Public dashboard requires DASHBOARD_ORIGIN, such as https://dashboard.example.com.");
        }
        try {
            publicUrl = new URL(process.env.DASHBOARD_ORIGIN);
        } catch {
            throw new Error("DASHBOARD_ORIGIN must be a valid HTTPS URL.");
        }
        if (publicUrl.protocol !== "https:" || publicUrl.pathname !== "/" || publicUrl.search || publicUrl.hash || publicUrl.username || publicUrl.password) {
            throw new Error("DASHBOARD_ORIGIN must contain only the HTTPS site origin, such as https://dashboard.example.com.");
        }
    }

    const origin = publicUrl ? publicUrl.origin : `http://${host}:${port}`;
    const page = fs.readFileSync(DASHBOARD_PATH, "utf8");
    const sessions = new Map();
    const loginFailures = new Map();
    const cookieName = "dashboard_session";
    const csp = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'";

    function getSession(request) {
        const sessionId = parseCookies(request.headers.cookie)[cookieName];
        const session = sessions.get(sessionId);
        if (!session) return null;
        if (session.expiresAt <= Date.now()) {
            sessions.delete(sessionId);
            return null;
        }
        return { id: sessionId, ...session };
    }

    function setSessionCookie(response, sessionId, clear = false) {
        const parts = [`${cookieName}=${clear ? "" : sessionId}`, "Path=/", "HttpOnly", "SameSite=Strict"];
        if (isPublic) parts.push("Secure");
        if (clear) parts.push("Max-Age=0");
        else parts.push(`Max-Age=${SESSION_MAX_AGE_MS / 1000}`);
        response.setHeader("Set-Cookie", parts.join("; "));
    }

    function isExpectedOrigin(request) {
        return request.headers.origin === origin
            && (!isPublic || (request.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https");
    }

    function sendHtml(response, content) {
        response.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "Content-Security-Policy": csp
        });
        response.end(content);
    }

    const loginPage = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>دخول لوحة الأسعار</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1020;color:#edf2ff;font-family:"Segoe UI",Tahoma,sans-serif}
main{width:min(420px,calc(100% - 28px));padding:26px;background:#121a2e;border:1px solid #27324c;border-radius:14px}
h1{margin-top:0;font-size:24px}p{color:#aab5ce}label{display:block;margin:18px 0 8px}
input,button{font:inherit;width:100%;padding:12px;border-radius:8px}input{color:#edf2ff;background:#0b1020;border:1px solid #34415e}
button{margin-top:14px;color:#fff;background:#536fe0;border:0;cursor:pointer;font-weight:600}
#error{min-height:24px;color:#ff9292}
</style></head>
<body><main><h1>لوحة أسعار الشخصيات</h1><p>أدخل كلمة المرور التي استلمتها لفتح لوحة التحكم.</p>
<form id="login"><label for="password">كلمة المرور</label><input id="password" type="password" autocomplete="current-password" required>
<button type="submit">دخول</button><div id="error" role="alert"></div></form></main>
<script>
document.getElementById("login").addEventListener("submit",async event=>{
 event.preventDefault();const button=event.currentTarget.querySelector("button");const error=document.getElementById("error");button.disabled=true;error.textContent="";
 try{const response=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:document.getElementById("password").value})});const result=await response.json();if(!response.ok)throw new Error(result.error||"تعذر تسجيل الدخول.");location.href="/";}
 catch(reason){error.textContent=reason.message;}finally{button.disabled=false;}
});
</script></body></html>`;

    const server = http.createServer(async (request, response) => {
        const requestHost = request.headers.host;
        const expectedHost = publicUrl ? publicUrl.host : `${host}:${port}`;
        if ((!isPublic && !isLoopback(request.socket.remoteAddress)) || requestHost !== expectedHost) {
            return sendJson(response, 403, { error: "الوصول غير مسموح." });
        }

        if (request.method === "GET" && request.url === "/") {
            let session = getSession(request);
            if (isPublic && !session) return sendHtml(response, loginPage);
            if (!isPublic && !password && !session) {
                const id = randomUUID();
                session = { csrfToken: randomUUID(), expiresAt: Date.now() + SESSION_MAX_AGE_MS };
                sessions.set(id, session);
                setSessionCookie(response, id);
            }
            if (password && !session) return sendHtml(response, loginPage);
            return sendHtml(response, page.replace("__DASHBOARD_TOKEN__", session.csrfToken));
        }

        if (request.method === "POST" && request.url === "/api/login") {
            if (!password || !isExpectedOrigin(request)) {
                return sendJson(response, 403, { error: "تعذر التحقق من طلب تسجيل الدخول." });
            }
            const clientAddress = request.socket.remoteAddress || "unknown";
            const failures = loginFailures.get(clientAddress) || { count: 0, lockedUntil: 0 };
            if (failures.lockedUntil > Date.now()) {
                return sendJson(response, 429, { error: "محاولات كثيرة. حاول مرة أخرى بعد قليل." });
            }
            try {
                const body = await readJsonBody(request);
                const attempted = typeof body.password === "string" ? Buffer.from(body.password) : Buffer.alloc(0);
                const expected = Buffer.from(password);
                const valid = attempted.length === expected.length && timingSafeEqual(attempted, expected);
                if (!valid) {
                    failures.count += 1;
                    if (failures.count >= MAX_LOGIN_FAILURES) {
                        failures.count = 0;
                        failures.lockedUntil = Date.now() + LOGIN_LOCK_MS;
                    }
                    loginFailures.set(clientAddress, failures);
                    return sendJson(response, 401, { error: "كلمة المرور غير صحيحة." });
                }

                loginFailures.delete(clientAddress);
                const id = randomUUID();
                sessions.set(id, { csrfToken: randomUUID(), expiresAt: Date.now() + SESSION_MAX_AGE_MS });
                setSessionCookie(response, id);
                return sendJson(response, 200, { success: true });
            } catch (error) {
                console.error("Dashboard login failed:", error);
                return sendJson(response, 400, { error: error.message || "تعذر معالجة الطلب." });
            }
        }

        const session = getSession(request);
        if (request.method === "GET" && request.url === "/api/items") {
            if (!session) return sendJson(response, 401, { error: "سجل الدخول أولًا." });
            return sendJson(response, 200, { items: getItemsDatabase() });
        }

        if (request.method === "POST" && request.url === "/api/logout") {
            if (!session || !isExpectedOrigin(request) || request.headers["x-dashboard-token"] !== session.csrfToken) {
                return sendJson(response, 403, { error: "تعذر التحقق من طلب تسجيل الخروج." });
            }
            sessions.delete(session.id);
            setSessionCookie(response, "", true);
            return sendJson(response, 200, { success: true });
        }

        if (request.method === "POST" && request.url === "/api/prices") {
            if (!session || !isExpectedOrigin(request) || request.headers["x-dashboard-token"] !== session.csrfToken) {
                return sendJson(response, 403, { error: "سجل الدخول مجددًا للتحقق من طلبك." });
            }

            try {
                const body = await readJsonBody(request);
                const { name, basePrice, comboPrices } = body || {};
                const items = getItemsDatabase();
                const item = typeof name === "string" ? items[name] : null;
                if (!item || typeof item !== "object") {
                    return sendJson(response, 404, { error: "الشخصية غير موجودة." });
                }
                if (typeof basePrice !== "number" || !Number.isFinite(basePrice) || basePrice < 0) {
                    return sendJson(response, 400, { error: "السعر الأساسي يجب أن يكون رقمًا يساوي صفرًا أو أكبر." });
                }
                if (!comboPrices || typeof comboPrices !== "object" || Array.isArray(comboPrices)) {
                    return sendJson(response, 400, { error: "بيانات أسعار الطفرات غير صحيحة." });
                }

                const existingCombos = item.combosData || {};
                for (const [key, price] of Object.entries(comboPrices)) {
                    if (!Object.prototype.hasOwnProperty.call(existingCombos, key)) {
                        return sendJson(response, 400, { error: "تحتوي البيانات على توليفة غير معروفة." });
                    }
                    if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
                        return sendJson(response, 400, { error: `سعر التوليفة "${key}" يجب أن يكون رقمًا يساوي صفرًا أو أكبر.` });
                    }
                }

                if (!updateItemPrices(name, basePrice, comboPrices)) {
                    return sendJson(response, 500, { error: "تعذر حفظ الأسعار في قاعدة البيانات. لم يتم تأكيد التعديل." });
                }
                return sendJson(response, 200, { success: true });
            } catch (error) {
                console.error("Dashboard request failed:", error);
                return sendJson(response, 400, { error: error.message || "تعذر معالجة الطلب." });
            }
        }

        return sendJson(response, 404, { error: "المسار غير موجود." });
    });

    server.on("error", error => {
        console.error("Dashboard server error:", error);
    });
    server.listen(port, host, () => {
        if (isPublic) console.log(`[لوحة التحكم] جاهزة على ${origin} (الوصول يتطلب كلمة المرور).`);
        else console.log(`[لوحة التحكم] افتح ${origin} لتعديل الأسعار محليًا.`);
    });
    return server;
}

module.exports = { startDashboard };
