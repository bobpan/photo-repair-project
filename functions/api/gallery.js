// functions/api/gallery.js

export async function onRequest(context) {
    const staticData = [
        {
            id: 1,
            title: "盲盒公仔",
            category: "3D",
            img_url: "https://images.unsplash.com/photo-1618331835717-801e976710b2?w=300",
            prompt: "cute pop mart style blind box toy, 3d render, chibi, detailed, soft lighting, 8k"
        },
        {
            id: 2,
            title: "粘土世界",
            category: "艺术",
            img_url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300",
            prompt: "claymation style, stop motion, plasticine texture, soft focus, cute"
        },
        {
            id: 3,
            title: "微缩景观",
            category: "摄影",
            img_url: "https://images.unsplash.com/photo-1541661538396-53ba2d051eed?w=300",
            prompt: "isometric tiny world in a glass bottle, highly detailed, miniature, macro photography"
        },
        {
            id: 4,
            title: "吉卜力",
            category: "动漫",
            img_url: "https://images.unsplash.com/photo-1516724562728-afc824a36e84?w=300",
            prompt: "anime style, studio ghibli, hayao miyazaki, vibrant colors, detailed background"
        },
        {
            id: 5,
            title: "赛博汉服",
            category: "科幻",
            img_url: "https://images.unsplash.com/photo-1622627228758-1c6b23963237?w=300",
            prompt: "chinese hanfu, cyberpunk style, neon lights, futuristic city background, detailed"
        },
        {
            id: 6,
            title: "老照片4K",
            category: "修复",
            img_url: "https://images.unsplash.com/photo-1550136513-548af4445338?w=300",
            prompt: "restore old photo, fix scratches, deblur, high resolution, realistic colorization"
        },
        {
            id: 7,
            title: "职业照",
            category: "摄影",
            img_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
            prompt: "professional business headshot, suit, studio lighting, clean background"
        },
        {
            id: 8,
            title: "极简Logo",
            category: "设计",
            img_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=300",
            prompt: "minimalist vector logo design, flat style, clean lines, white background"
        }
    ];

    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    // 尝试从 D1 数据库获取数据
    try {
        const db = context.env.DB;
        if (db) {
            const { results } = await db.prepare('SELECT * FROM gallery ORDER BY id DESC').all();
            if (results && results.length > 0) {
                return new Response(JSON.stringify(results), { headers: corsHeaders });
            }
        }
    } catch (e) {
        console.error("D1 Database error (falling back to static data):", e.message);
    }

    // 降级方案：返回静态数据
    return new Response(JSON.stringify(staticData), { headers: corsHeaders });
}
