// $PROJECT_ROOT/functions/api/repair.js
// 这个文件会处理所有对 /api/repair 的 POST 请求

/**
 * Cloudflare Pages Function 入口
 * @param {Object} context - 包含 Pages 函数执行环境的上下文
 */
export async function onRequest(context) {
    // REPAIR_WORKER 必须在 Pages 设置中绑定到您的 Worker 服务
    const repairWorker = context.env.REPAIR_WORKER; 

    // 1. 检查 Worker 绑定是否存在
    if (!repairWorker) {
        return new Response(JSON.stringify({
            status: 'error',
            message: 'Worker API 绑定未找到，请检查 Pages 设置中的 Worker 绑定配置（变量名: REPAIR_WORKER）。'
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 2. 转发请求到绑定的 Worker
    try {
        const response = await repairWorker.fetch(context.request);
        
        // 3. 将 Worker 返回的响应直接返回给前端
        return response;
        
    } catch (error) {
        console.error('Worker fetch failed:', error);
        return new Response(JSON.stringify({
            status: 'error',
            message: `Pages Function 转发失败，请检查 Worker 运行状态: ${error.message}`
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}
