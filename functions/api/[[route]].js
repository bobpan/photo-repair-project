// functions/api/[[route]].js

export async function onRequest(context) {
    // 1. 获取 Worker 绑定
    // ⚠️ 务必确认您在 Pages 设置 -> Functions -> Bindings 中
    // 将 Worker 绑定到了变量名 "REPAIR_WORKER"
    const worker = context.env.REPAIR_WORKER; 

    // 2. 检查绑定是否存在
    if (!worker) {
        return new Response(JSON.stringify({
            status: 'error',
            message: '前端代理错误: 未找到 Worker 绑定 (REPAIR_WORKER)。请在 Pages 设置中检查绑定。'
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        // 3. 将请求原封不动地转发给 Worker
        // 这会保留 URL 路径（如 /api/reward）、Method (POST) 和 Body
        return await worker.fetch(context.request);
        
    } catch (error) {
        return new Response(JSON.stringify({
            status: 'error',
            message: `代理转发失败: ${error.message}`
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}
