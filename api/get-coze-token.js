// 引入请求库（Vercel 环境已预装）
const fetch = require('node-fetch');

// CORS 跨域配置（必须加，否则前端无法调用）
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',        // 允许所有域名访问（生产可限定你的前端域名）
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // 允许的请求方法
  'Access-Control-Allow-Headers': 'Content-Type'  // 允许的请求头
};

// Vercel Serverless 核心函数
module.exports = async (req, res) => {
  // 处理 OPTIONS 预检请求（跨域必处理）
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).set(CORS_HEADERS).json({
      code: 405,
      message: '仅支持 POST 请求'
    });
  }

  try {
    // 1. 获取前端传的用户唯一 ID（会话隔离核心）
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).set(CORS_HEADERS).json({
        code: 400,
        message: '用户唯一 ID 不能为空（会话隔离必需）'
      });
    }

    // 2. 读取 Vercel 环境变量（你在 Vercel 配置的密钥）
    const { COZE_API_KEY, COZE_BOT_ID, COZE_USER_ID, COZE_BASE_URL } = process.env;
    // 检查环境变量是否完整
    if (!COZE_API_KEY || !COZE_BOT_ID || !COZE_USER_ID) {
      return res.status(500).set(CORS_HEADERS).json({
        code: 500,
        message: 'Vercel 环境变量配置不全，请检查 COZE_API_KEY/BOT_ID/USER_ID'
      });
    }

    // 3. 调用 Coze 官方 API 生成用户专属 Token（会话隔离核心）
    const tokenResponse = await fetch(`${COZE_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_API_KEY}` // 用你的 PAT 鉴权
      },
      body: JSON.stringify({
        user_id: user_id,          // 前端传的唯一 ID（会话隔离关键）
        bot_id: COZE_BOT_ID,       // 你的智能体 ID
        platform_user_id: COZE_USER_ID, // 你的 Coze 平台用户 ID
        expire: 3600               // Token 有效期 1 小时（前端会自动刷新）
      })
    });

    // 4. 解析 Coze 返回的 Token
    const tokenData = await tokenResponse.json();
    if (!tokenData || !tokenData.token) {
      throw new Error(`Coze API 返回异常：${JSON.stringify(tokenData)}`);
    }

    // 5. 返回 Token 给前端
    return res.status(200).set(CORS_HEADERS).json({
      code: 200,
      message: 'Token 生成成功',
      data: {
        token: tokenData.token,    // 用户专属 Token
        expire: tokenData.expire || 3600 // 有效期
      }
    });

  } catch (error) {
    // 错误处理（生产环境可隐藏具体错误）
    console.error('Token 生成失败：', error);
    return res.status(500).set(CORS_HEADERS).json({
      code: 500,
      message: 'Token 生成失败，请检查 Coze 密钥或网络',
      error: process.env.NODE_ENV === 'development' ? error.message : '' // 开发环境显示错误详情
    });
  }
};
