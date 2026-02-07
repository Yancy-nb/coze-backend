const fetch = require('node-fetch');
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).headers(CORS_HEADERS).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).set(CORS_HEADERS).json({
      code: 405,
      message: '仅支持POST请求',
    });
  }

  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).set(CORS_HEADERS).json({
        code: 400,
        message: '用户ID不能为空',
      });
    }

    const { COZE_API_KEY, COZE_BOT_ID, COZE_USER_ID, COZE_BASE_URL } = process.env;
    if (!COZE_API_KEY || !COZE_BOT_ID || !COZE_USER_ID) {
      return res.status(500).set(CORS_HEADERS).json({
        code: 500,
        message: '服务器配置缺失',
      });
    }

    const tokenResponse = await fetch(`${COZE_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${COZE_API_KEY}`,
      },
      body: JSON.stringify({
        user_id: user_id,
        bot_id: COZE_BOT_ID,
        platform_user_id: COZE_USER_ID,
        expire: 3600,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData || !tokenData.token) {
      throw new Error(`Coze API返回异常: ${JSON.stringify(tokenData)}`);
    }

    return res.status(200).set(CORS_HEADERS).json({
      code: 200,
      message: 'Token生成成功',
      data: {
        token: tokenData.token,
        expire: tokenData.expire || 3600,
      },
    });
  } catch (error) {
    console.error('Token生成失败:', error);
    return res.status(500).set(CORS_HEADERS).json({
      code: 500,
      message: 'Token生成失败',
      error: process.env.NODE_ENV === 'development' ? error.message : '',
    });
  }
};
