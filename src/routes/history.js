/**
 * 历史记录路由
 * 
 * 注意：当前实现使用内存存储
 * 生产环境应使用数据库（MySQL/MongoDB/Redis等）
 */

const express = require('express');
const router = express.Router();

// 错误码定义
const ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PARAMS: 1001,
  RECORD_NOT_FOUND: 1002,
  SERVER_ERROR: 5001
};

// 内存存储（生产环境应使用数据库）
const historyStore = new Map();

/**
 * GET /api/v1/history
 * 获取历史记录列表
 */
router.get('/', (req, res) => {
  try {
    const { userId, page = 1, pageSize = 20, platform = '' } = req.query;
    
    if (!userId) {
      return res.json({
        code: ERROR_CODES.INVALID_PARAMS,
        message: '请提供用户ID'
      });
    }
    
    // 获取用户的历史记录
    let records = historyStore.get(userId) || [];
    
    // 按平台筛选
    if (platform && platform !== 'all') {
      records = records.filter(r => r.platform === platform);
    }
    
    // 按时间倒序
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 分页
    const pageNum = parseInt(page);
    const size = parseInt(pageSize);
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paginatedRecords = records.slice(start, end);
    
    res.json({
      code: ERROR_CODES.SUCCESS,
      message: 'success',
      data: {
        list: paginatedRecords,
        page: pageNum,
        pageSize: size,
        total: records.length,
        totalPages: Math.ceil(records.length / size)
      }
    });
    
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.json({
      code: ERROR_CODES.SERVER_ERROR,
      message: '获取历史记录失败'
    });
  }
});

/**
 * POST /api/v1/history/add
 * 添加历史记录
 */
router.post('/add', (req, res) => {
  try {
    const { userId, platform, originalUrl, title, content, tags, video } = req.body;
    
    if (!userId || !platform) {
      return res.json({
        code: ERROR_CODES.INVALID_PARAMS,
        message: '缺少必要参数'
      });
    }
    
    // 创建记录
    const record = {
      id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      platform,
      originalUrl,
      title,
      content,
      tags: tags || [],
      video,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 存储记录
    const userRecords = historyStore.get(userId) || [];
    userRecords.unshift(record);
    historyStore.set(userId, userRecords);
    
    res.json({
      code: ERROR_CODES.SUCCESS,
      message: '添加成功',
      data: record
    });
    
  } catch (error) {
    console.error('添加历史记录失败:', error);
    res.json({
      code: ERROR_CODES.SERVER_ERROR,
      message: '添加历史记录失败'
    });
  }
});

/**
 * POST /api/v1/history/delete
 * 删除历史记录
 */
router.post('/delete', (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.json({
        code: ERROR_CODES.INVALID_PARAMS,
        message: '请提供记录ID'
      });
    }
    
    // 遍历所有用户查找并删除记录
    for (const [userId, records] of historyStore.entries()) {
      const index = records.findIndex(r => r.id === id);
      if (index !== -1) {
        records.splice(index, 1);
        historyStore.set(userId, records);
        return res.json({
          code: ERROR_CODES.SUCCESS,
          message: '删除成功'
        });
      }
    }
    
    res.json({
      code: ERROR_CODES.RECORD_NOT_FOUND,
      message: '记录不存在'
    });
    
  } catch (error) {
    console.error('删除历史记录失败:', error);
    res.json({
      code: ERROR_CODES.SERVER_ERROR,
      message: '删除历史记录失败'
    });
  }
});

/**
 * POST /api/v1/history/clear
 * 清空用户历史记录
 */
router.post('/clear', (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.json({
        code: ERROR_CODES.INVALID_PARAMS,
        message: '请提供用户ID'
      });
    }
    
    historyStore.delete(userId);
    
    res.json({
      code: ERROR_CODES.SUCCESS,
      message: '清空成功'
    });
    
  } catch (error) {
    console.error('清空历史记录失败:', error);
    res.json({
      code: ERROR_CODES.SERVER_ERROR,
      message: '清空历史记录失败'
    });
  }
});

module.exports = router;
