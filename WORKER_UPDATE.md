# 🍌 Nano Banana AI - 后端 Worker 更新指南

为了修复“提示词语言不跟随设置”的问题，并增强灵感广场的数据返回能力，请将您的 Cloudflare Worker 代码更新为以下版本。

**安全提示**：此代码包含您的核心业务逻辑，请勿将其提交到公开仓库。

### 更新步骤：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2. 进入您的 Worker 项目 (例如 `nano-banana-backend`)。
3. 点击 "Edit Code" (编辑代码)。
4. 将 `src/index.js` (或 `worker.js`) 的内容**全选并替换**为下方的优化代码。
5. 点击 "Deploy" (部署)。

---

### ✅ 优化版 Worker 代码

```javascript
// Worker/src/index.js

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
}

async function verifyTurnstile(token, secret, ip) {
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);
    formData.append('remoteip', ip);
    const result = await fetch(url, { body: formData, method: 'POST' });
    const outcome = await result.json();
    return outcome.success;
}

// 通用 Gemini 调用
async function callGemini(model, requestBody, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) throw new Error(`Gemini API Error: ${await response.text()}`);
    return await response.json();
}

export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
             return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }});
        }

        const url = new URL(request.url);

        // =========================================================
        // 🆕 路由: 魔法提示词 (POST /api/prompt)
        // =========================================================
        if (url.pathname === '/api/prompt' && request.method === 'POST') {
            try {
                const formData = await request.formData();
                const style = formData.get('style') || 'Creative';
                const lang = formData.get('lang') || 'cn'; // 获取语言参数
                const file = formData.get('photo'); // 可选

                let promptText = "";
                const parts = [];

                // 动态调整输出语言指令
                const langInstruction = lang === 'en' ? "Output in English" : "Output in Chinese";

                if (file && file instanceof File) {
                    // 图生文：根据图片生成
                    const arrayBuffer = await file.arrayBuffer();
                    const base64Image = arrayBufferToBase64(arrayBuffer);
                    promptText = `You are a creative prompter. Look at this image.
                    The user wants to apply the style: "${style}".
                    Write a short, creative, and fun prompt describing how to modify this image to fit that style.
                    ${langInstruction}. Keep it under 20 words. Just the prompt, no intro.`;
                    parts.push({ text: promptText });
                    parts.push({ inlineData: { mimeType: file.type, data: base64Image } });
                } else {
                    // 文生文：随机脑洞
                    promptText = `You are a creative prompter.
                    Generate a short, imaginative, and fun image generation prompt based on the style: "${style}".
                    Example: "A cyberpunk cat eating noodles in neon rain".
                    ${langInstruction}. Keep it under 20 words. Just the prompt.`;
                    parts.push({ text: promptText });
                }

                // 使用 Flash 模型生成文本，速度快
                const data = await callGemini('gemini-2.5-flash', { contents: [{ role: 'user', parts: parts }] }, env.GEMINI_API_KEY);
                const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

                return new Response(JSON.stringify({ status: 'success', prompt: resultText.trim() }), {
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            } catch (e) {
                return new Response(JSON.stringify({ status: 'error', message: e.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
            }
        }

        // =========================================================
        // 路由: 提交任务 (POST /api/repair)
        // =========================================================
        if (url.pathname === '/api/repair' && request.method === 'POST') {
            try {
                const formData = await request.formData();
                const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
                const isUnlimitedMode = formData.get('isUnlimited') === 'true';
                const turnstileToken = formData.get('turnstileToken');
                const today = new Date().toISOString().split('T')[0];
                const limitKey = `limit:${clientIP}:${today}`;
                const sessionKey = `verified_session:${clientIP}`;

                // Session & Rate Limit Logic
                if (!env.img_limiter) throw new Error("KV missing");
                const hasSession = await env.img_limiter.get(sessionKey);

                if (!hasSession) {
                    if (!turnstileToken) return new Response(JSON.stringify({ status: 'error', code: 'VERIFY_REQUIRED' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*' }});
                    const isHuman = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, clientIP);
                    if (!isHuman) return new Response(JSON.stringify({ status: 'error', message: 'Verify Failed' }), { status: 403, headers: { 'Access-Control-Allow-Origin': '*' }});
                    await env.img_limiter.put(sessionKey, 'true', { expirationTtl: 3600 });
                }

                let requestCount = await env.img_limiter.get(limitKey);
                requestCount = requestCount ? parseInt(requestCount) : 0;
                if (requestCount >= 5 && !isUnlimitedMode) {
                    return new Response(JSON.stringify({ status: 'error', code: 'LIMIT_REACHED' }), { status: 429, headers: { 'Access-Control-Allow-Origin': '*' }});
                }

                // Image Processing
                const file = formData.get('photo');
                const prompt = formData.get('prompt');
                let base64Image = null;
                let mimeType = null;

                if (file && file instanceof File) {
                    const arrayBuffer = await file.arrayBuffer();
                    base64Image = arrayBufferToBase64(arrayBuffer);
                    mimeType = file.type;
                }

                // Start Task
                const taskId = crypto.randomUUID();
                await env.task_store.put(taskId, JSON.stringify({ status: 'processing' }), { expirationTtl: 3600 });

                // Async Call
                const aiBody = {
                    contents: [{
                        role: 'user',
                        parts: [
                            { text: prompt || "Enhance image" },
                            ...(base64Image ? [{ inlineData: { mimeType, data: base64Image } }] : [])
                        ]
                    }]
                };

                // Background Execution
                ctx.waitUntil((async () => {
                    try {
                        const data = await callGemini('gemini-3-pro-image-preview', aiBody, env.GEMINI_API_KEY);
                        const fixedPart = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                        if (fixedPart) {
                            await env.task_store.put(taskId, JSON.stringify({
                                status: 'completed',
                                image: `data:${fixedPart.inlineData.mimeType};base64,${fixedPart.inlineData.data}`
                            }), { expirationTtl: 3600 });
                        } else {
                            throw new Error("AI returned text only");
                        }
                    } catch (err) {
                        await env.task_store.put(taskId, JSON.stringify({ status: 'error', message: err.message }), { expirationTtl: 3600 });
                    }
                })());

                await env.img_limiter.put(limitKey, requestCount + 1, { expirationTtl: 86400 });

                return new Response(JSON.stringify({ status: 'queued', taskId: taskId }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
            } catch (e) {
                return new Response(JSON.stringify({ status: 'error', message: e.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
            }
        }

        // Status Poll
        if (url.pathname === '/api/status' && request.method === 'GET') {
            const taskId = url.searchParams.get('taskId');
            const taskData = await env.task_store.get(taskId);
            if (!taskData) return new Response(JSON.stringify({ status: 'error' }), { headers: { 'Access-Control-Allow-Origin': '*' }});
            return new Response(taskData, { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }

        // Gallery (Fallback for direct API access)
        if (url.pathname === '/api/gallery' && request.method === 'GET') {
             // 简单的返回空数组，因为主要逻辑已在前端 Page Function 中实现静态化
             return new Response(JSON.stringify([]), { headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        return new Response('Not Found', { status: 404 });
    }
};
```
