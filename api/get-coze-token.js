const fetch = require('node-fetch');

// CORS配置
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

module.exports = async (req, res) => {
  // 处理OPTIONS预检
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).set(CORS_HEADERS).json({
      code: 405,
      message: '仅支持POST请求',
      debug: '请求方法错误'
    });
  }

  try {
    // 1. 打印请求体（方便调试）
    console.log('前端传入参数：', req.body);
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).set(CORS_HEADERS).json({
        code: 400,
        message: 'user_id不能为空（会话隔离必需）',
        debug: '前端未传user_id'
      });
    }

    // 2. 读取环境变量（打印脱敏日志）
    const env = {
      COZE_API_KEY: process.env.COZE_API_KEY ? 'pat-****' : '未配置',
      COZE_BOT_ID: process.env.COZE_BOT_ID || '未配置',
      COZE_USER_ID: process.env.COZE_USER_ID || '未配置',
      COZE_BASE_URL: process.env.COZE_BASE_URL || 'https://api.coze.com/v1'
    };
    console.log('环境变量（脱敏）：', env);

    // 检查环境变量
    if (!process.env.COZE_API_KEY) {
      return res.status(500).set(CORS_HEADERS).json({
        code: 500,
        message: 'COZE_API_KEY未配置',
        debug: 'Vercel环境变量中缺少COZE_API_KEY'
      });
    }
    if (!process.env.COZE_BOT_ID) {
      return res.status(500).set(CORS_HEADERS).json({
        code: 500,
        message: 'COZE_BOT_ID未配置',
        debug: 'Vercel环境变量中缺少COZE_BOT_ID'
      });
    }
    if (!process.env.COZE_USER_ID) {
      return res.status(500).set(CORS_HEADERS).json({
        code: 500,
        message: 'COZE_USER_ID未配置',
        debug: 'Vercel环境变量中缺少COZE_USER_ID'
      });
    }

    // 3. 调用Coze官方Token接口（核心修复：域名改为api.coze.com）
    const tokenUrl = `${env.COZE_BASE_URL}/auth/token`;
    console.log('调用Coze API地址：', tokenUrl);
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.COZE_API_KEY}`
      },
      body: JSON.stringify({
        user_id: user_id,          // 前端传的唯一ID（隔离核心）
        bot_id: process.env.COZE_BOT_ID, // 智能体ID
        platform_user_id: process.env.COZE_USER_ID, // 你的Coze UID（必填）
        expire: 3600
      })
    });

    // 4. 打印Coze返回的原始数据
    const tokenData = await tokenResponse.json();
    console.log('Coze API返回：', tokenData);

    // 检查返回结果
    if (!tokenResponse.ok) {
      throw new Error(`Coze API返回错误：${tokenResponse.status} - ${JSON.stringify(tokenData)}`);
    }
    if (!tokenData.token) {
      throw new Error(`Coze API未返回token：${JSON.stringify(tokenData)}`);
    }

    // 5. 返回成功结果
    return res.status(200).set(CORS_HEADERS).json({
      code: 200,
      message: 'Token生成成功',
      data: {
        token: tokenData.token,
        expire: tokenData.expire || 3600
      },
      debug: '成功'
    });

  } catch (error) {
    // 详细错误日志（方便排查）
    console.error('Token生成失败：', error.message);
    return res.status(500).set(CORS_HEADERS).json({
      code: 500,
      message: 'Token生成失败',
      debug: error.message, // 前端能看到具体错误
      stack: process.env.NODE_ENV === 'development' ? error.stack : ''
    });
  }
};
