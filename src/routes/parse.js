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

// 错误码定义
const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_URL: 1001,
  UNSUPPORTED_PLATFORM: 1002,
  PARSE_FAILED: 1003,
  URL_EXPIRED: 1004,
  REQUEST_FREQUENT: 2001,
  SERVER_ERROR: 5001
};

// 平台配置
const PLATFORMS = {
  douyin: {
    name: '抖音',
    pattern: /douyin\.com/i,
  },
  kuaishou: {
    name: '快手',
    pattern: /kuaishou\.com/i,
  },
  xiaohongshu: {
    name: '小红书',
    pattern: /xiaohongshu\.com/i,
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
 * 从抖音分享链接中提取视频ID
 */
function extractDouyinVideoId(url) {
  // 短链接 v.douyin.com 需要先重定向获取真实链接
  // 长链接格式: https://www.douyin.com/video/7086770907674348841
  // 或: https://www.douyin.com/discover?modal_id=7086770907674348841
  const videoMatch = url.match(/video\/(\d+)/);
  if (videoMatch) return videoMatch[1];
  
  const modalMatch = url.match(/modal_id=(\d+)/);
  if (modalMatch) return modalMatch[1];
  
  const noteMatch = url.match(/note\/(\d+)/);
  if (noteMatch) return noteMatch[1];
  
  return null;
}

/**
 * 解析抖音作品 - 通过抖音网页API
 */
async function parseDouyin(url) {
  const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Mobile Safari/537.36';
  
  let videoId = extractDouyinVideoId(url);
  let realUrl = url;
  
  // 如果没提取到ID，可能是短链接，需要先跟随重定向
  if (!videoId) {
    try {
      const resp = await axios.head(url, {
        maxRedirects: 5,
        timeout: 10000,
        headers: { 'User-Agent': MOBILE_UA }
      });
      realUrl = resp.request.res.responseUrl || realUrl;
      videoId = extractDouyinVideoId(realUrl);
    } catch (e) {
      // head可能失败，用get试一下
      try {
        const resp = await axios.get(url, {
          maxRedirects: 5,
          timeout: 10000,
          headers: { 'User-Agent': MOBILE_UA },
          validateStatus: () => true
        });
        realUrl = resp.request.res.responseUrl || realUrl;
        videoId = extractDouyinVideoId(realUrl);
      } catch (e2) {
        throw new Error('无法解析链接，请确认链接是否正确');
      }
    }
  }
  
  if (!videoId) {
    throw new Error('无法提取视频ID，请确认链接是否正确');
  }
  
  console.log(`抖音解析: videoId=${videoId}, realUrl=${realUrl}`);
  
  // 方法1: 使用抖音Web API
  try {
    const apiUrl = `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}`;
    const resp = await axios.get(apiUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.douyin.com/',
        'Accept': 'application/json, text/plain, */*',
      },
      validateStatus: () => true,
    });
    
    if (resp.data && resp.data.aweme_detail) {
      return transformDouyinData(resp.data.aweme_detail);
    }
  } catch (e) {
    console.log('方法1(Web API)失败:', e.message);
  }
  
  // 方法2: 使用 iesdouyin API
  try {
    const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;
    const resp = await axios.get(apiUrl, {
      timeout: 15000,
      headers: { 'User-Agent': MOBILE_UA },
      validateStatus: () => true,
    });
    
    if (resp.data && resp.data.item_list && resp.data.item_list.length > 0) {
      const item = resp.data.item_list[0];
      return transformDouyinData(item);
    }
  } catch (e) {
    console.log('方法2(iesdouyin)失败:', e.message);
  }
  
  // 方法3: 解析网页HTML
  try {
    const webUrl = `https://www.douyin.com/video/${videoId}`;
    const resp = await axios.get(webUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.douyin.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      validateStatus: () => true,
    });
    
    // 尝试从HTML中提取RENDER_DATA
    const renderMatch = resp.data.match(/id="RENDER_DATA"[^>]*value="([^"]+)"/);
    if (renderMatch) {
      const renderData = JSON.parse(decodeURIComponent(renderMatch[1]));
      // 遍历找到aweme detail
      for (const key of Object.keys(renderData)) {
        if (renderData[key] && renderData[key].awemeDetail) {
          return transformDouyinData(renderData[key].awemeDetail);
        }
      }
    }
  } catch (e) {
    console.log('方法3(HTML解析)失败:', e.message);
  }
  
  throw new Error('解析失败，该视频可能已删除或链接已过期');
}

/**
 * 转换抖音API数据为项目格式
 */
function transformDouyinData(data) {
  // 提取视频信息
  const video = data.video || {};
  const author = data.author || {};
  const statistics = data.statistics || {};
  
  // 视频地址 - 优先无水印
  let videoUrl = '';
  if (video.play_addr) {
    videoUrl = video.play_addr.url_list && video.play_addr.url_list[0]
      ? video.play_addr.url_list[0].replace('playwm', 'play')
      : video.play_addr.uri ? `https://www.douyin.com/aweme/v1/play/?video_id=${video.play_addr.uri}&line=0` : '';
  }
  if (video.download_addr && video.download_addr.url_list) {
    videoUrl = video.download_addr.url_list[0];
  }
  
  // 封面
  let coverUrl = '';
  if (video.cover) {
    coverUrl = video.cover.url_list ? video.cover.url_list[0] : '';
  }
  if (video.origin_cover) {
    coverUrl = video.origin_cover.url_list ? video.origin_cover.url_list[0] : coverUrl;
  }
  if (video.dynamic_cover) {
    coverUrl = video.dynamic_cover.url_list ? video.dynamic_cover.url_list[0] : coverUrl;
  }
  
  // 判断是图集还是视频
  const images = data.images;
  const isAlbum = images && images.length > 0;
  
  // 作者信息
  const authorName = author.nickname || author.unique_id || '未知作者';
  const authorAvatar = author.avatar_larger && author.avatar_larger.url_list 
    ? author.avatar_larger.url_list[0] 
    : (author.avatar_medium && author.avatar_medium.url_list ? author.avatar_medium.url_list[0] : '');
  
  return {
    id: data.aweme_id || data.aweme_id_str || uuidv4(),
    platform: 'douyin',
    title: data.desc || '无标题',
    content: data.desc || '',
    tags: [],
    video: isAlbum ? {
      url: '',
      cover: coverUrl,
      duration: 0,
      width: 0,
      height: 0,
      images: images.map(img => ({
        url: img.url_list ? img.url_list[0] : '',
      }))
    } : {
      url: videoUrl,
      cover: coverUrl,
      duration: video.duration || 0,
      width: video.width || 1080,
      height: video.height || 1920,
    },
    author: {
      name: authorName,
      avatar: authorAvatar,
    },
    statistics: {
      likes: statistics.digg_count || 0,
      comments: statistics.comment_count || 0,
      shares: statistics.share_count || 0,
    },
    createdAt: data.create_time ? new Date(data.create_time * 1000).toISOString() : new Date().toISOString()
  };
}

/**
 * 解析快手作品（模拟数据）
 */
async function parseKuaishou(url) {
  return {
    id: uuidv4(),
    platform: 'kuaishou',
    title: '快手测试视频 #日常分享',
    content: '这是一个快手的测试视频内容，用于测试解析功能是否正常工作。',
    tags: ['快手', '测试', '日常'],
    video: {
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      cover: 'https://media.w3.org/2010/05/sintel/poster.png',
      duration: 10,
      width: 320,
      height: 176
    },
    author: {
      name: '快手用户',
      avatar: ''
    },
    createdAt: new Date().toISOString()
  };
}

/**
 * 解析小红书作品（模拟数据）
 */
async function parseXiaohongshu(url) {
  return {
    id: uuidv4(),
    platform: 'xiaohongshu',
    title: '小红书测试笔记 #生活记录',
    content: '这是一篇小红书的测试笔记内容，用于测试解析功能是否正常工作。',
    tags: ['小红书', '生活', '记录', '测试'],
    video: {
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      cover: 'https://media.w3.org/2010/05/sintel/poster.png',
      duration: 20,
      width: 320,
      height: 176
    },
    author: {
      name: '小红书博主',
      avatar: ''
    },
    createdAt: new Date().toISOString()
  };
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
      return res.json({ code: ERROR_CODES.UNSUPPORTED_PLATFORM, message: '暂不支持该平台，仅支持抖音、快手、小红书' });
    }
    
    let result;
    switch (platform) {
      case 'douyin':
        result = await parseDouyin(url);
        break;
      case 'kuaishou':
        result = await parseKuaishou(url);
        break;
      case 'xiaohongshu':
        result = await parseXiaohongshu(url);
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
