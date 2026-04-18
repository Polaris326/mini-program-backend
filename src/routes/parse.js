/**
 * 作品链接解析路由
 * 
 * 功能：
 * 1. 验证链接格式和平台
 * 2. 解析抖音、快手、小红书作品
 * 3. 返回文案和视频信息
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// ============ 第三方解析API配置（api.ake999.com）============
const AKE_API_KEY = process.env.AKE_API_KEY || '324BFEC812CB9874DEACA5137AF2B9E41E9E49E238CEC88C2B';
const AKE_API_UID = process.env.AKE_API_UID || '202038600';
const AKE_API_BASE = 'https://api.ake999.com/api/dsp';
// ============================================================

// 错误码定义
const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_URL: 1001,
  UNSUPPORTED_PLATFORM: 1002,
  PARSE_FAILED: 1003,
  URL_EXPIRED: 1004,
  REQUEST_FREQUENT: 2001,
  SERVER_ERROR: 5001,
  API_ERROR: 1005  // 第三方API错误
};

// 平台配置
const PLATFORMS = {
  douyin: {
    name: '抖音',
    pattern: /douyin\.com/i,
    akeType: 'douyin',
  },
  kuaishou: {
    name: '快手',
    pattern: /kuaishou\.com/i,
    akeType: 'kuaishou',
  },
  xiaohongshu: {
    name: '小红书',
    pattern: /xiaohongshu\.com/i,
    akeType: 'xiaohongshu',
  },
  bilibili: {
    name: '哔哩哔哩',
    pattern: /bilibili\.com|b23\.tv/i,
    akeType: 'bilibili',
  },
  weibo: {
    name: '微博',
    pattern: /weibo\.com/i,
    akeType: 'weibo',
  }
};

/**
 * 检测URL平台
 */
function detectPlatform(url) {
  for (const [key, config] of Object.entries(PLATFORMS)) {
    if (config.pattern.test(url)) {
      return key;
    }
  }
  return null;
}

/**
 * 验证URL格式
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 通过第三方API (api.ake999.com) 统一解析
 * 支持：抖音、快手、小红书、哔哩哔哩、微博等
 */
async function parseViaAkeApi(url, platform) {
  const encodedUrl = encodeURIComponent(url);
  const apiUrl = `${AKE_API_BASE}/${AKE_API_KEY}/${AKE_API_UID}/?url=${encodedUrl}`;
  
  console.log(`[ake999] 解析请求: ${apiUrl.substring(0, 100)}...`);
  
  const resp = await axios.get(apiUrl, { timeout: 20000 });
  const result = resp.data;
  
  console.log(`[ake999] 响应: code=${result.code}, msg=${result.msg}`);
  
  // code 200 = 成功
  if (result.code === 200) {
    const d = result.data;
    const isAlbum = result.type == 2; // type=1视频 type=2图集
    
    if (isAlbum) {
      // 图集
      return {
        id: uuidv4(),
        platform: platform,
        title: d.title || '无标题',
        content: d.title || '',
        tags: [],
        video: {
          url: '',
          cover: d.cover || d.download_image || '',
          duration: 0,
          width: 0,
          height: 0,
          images: d.images ? d.images.map(img => ({ url: img })) : []
        },
        author: { name: '', avatar: '' },
        createdAt: new Date().toISOString()
      };
    } else {
      // 视频
      return {
        id: uuidv4(),
        platform: platform,
        title: d.title || '无标题',
        content: d.title || '',
        tags: [],
        video: {
          url: d.down || d.url || '',   // down=无水印下载链接
          cover: d.cover || d.download_image || '',
          duration: 0,
          width: 0,
          height: 0,
        },
        author: { name: '', avatar: '' },
        createdAt: new Date().toISOString()
      };
    }
  }
  
  // 错误处理
  const errorMap = {
    101: '解析失败，请稍后重试',
    102: '解析失败，请检查链接是否正确或视频是否已删除',
    103: '链接格式不正确',
    104: '接口不存在或已暂停',
    107: '数据解析异常',
    110: '解析次数已用完，请明天再试',
    113: '解析失败，请稍后重试',
    155: 'API Key或UID配置错误，请联系管理员',
  };
  
  const msg = errorMap[result.code] || `解析失败(code:${result.code})`;
  const err = new Error(msg);
  err.code = result.code;
  throw err;
}

/**
 * 解析快手作品
 */
async function parseKuaishou(url) {
  return parseViaAkeApi(url, 'kuaishou');
}

/**
 * 解析小红书作品
 */
async function parseXiaohongshu(url) {
  return parseViaAkeApi(url, 'xiaohongshu');
}

/**
 * 解析B站作品
 */
async function parseBilibili(url) {
  return parseViaAkeApi(url, 'bilibili');
}

/**
 * 解析微博作品
 */
async function parseWeibo(url) {
  return parseViaAkeApi(url, 'weibo');
}

/**
 * POST /api/v1/parse
 * 解析作品链接
 */
router.post('/', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.json({ code: ERROR_CODES.INVALID_URL, message: '请提供要解析的链接' });
    }
    
    if (!isValidUrl(url)) {
      return res.json({ code: ERROR_CODES.INVALID_URL, message: '链接格式不正确' });
    }
    
    const platform = detectPlatform(url);
    if (!platform) {
      return res.json({ code: ERROR_CODES.UNSUPPORTED_PLATFORM, message: '暂不支持该平台' });
    }
    
    let result;
    switch (platform) {
      case 'douyin':
        result = await parseViaAkeApi(url, 'douyin');
        break;
      case 'kuaishou':
        result = await parseKuaishou(url);
        break;
      case 'xiaohongshu':
        result = await parseXiaohongshu(url);
        break;
      case 'bilibili':
        result = await parseBilibili(url);
        break;
      case 'weibo':
        result = await parseWeibo(url);
        break;
      default:
        return res.json({ code: ERROR_CODES.UNSUPPORTED_PLATFORM, message: '暂不支持该平台' });
    }
    
    res.json({ code: ERROR_CODES.SUCCESS, message: '解析成功', data: result });
    
  } catch (error) {
    console.error('解析接口错误:', error);
    res.json({
      code: error.code || ERROR_CODES.PARSE_FAILED,
      message: error.message || '解析失败，请稍后重试'
    });
  }
});

/**
 * GET /api/v1/parse/platforms
 */
router.get('/platforms', (req, res) => {
  const platforms = Object.entries(PLATFORMS).map(([key, config]) => ({
    id: key,
    name: config.name,
    supported: true
  }));
  res.json({ code: ERROR_CODES.SUCCESS, message: 'success', data: platforms });
});

module.exports = router;
