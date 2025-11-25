// functions/api/gallery.js

export async function onRequest(context) {
    // 获取 D1 数据库绑定
    const db = context.env.DB;

    if (!db) {
        return new Response(JSON.stringify({ error: 'Database not bound' }), { status: 500 });
    }

    try {
        // 执行 SQL 查询所有数据
        const { results } = await db.prepare('SELECT * FROM gallery ORDER BY id DESC').all();

        return new Response(JSON.stringify(results), {
            headers: {
                'Content-Type': 'application/json',
                // 允许跨域（如果前端和API同源则不需要，但加上无妨）
                'Access-Control-Allow-Origin': '*' 
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
