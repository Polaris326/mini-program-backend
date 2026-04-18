/**
 * 请求日志中间件
 */

function logger(req, res, next) {
  const start = Date.now();
  
  // 请求完成后记录日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || ''
    };
    
    // 根据状态码着色
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 500 ? '\x1b[31m' : // 红色 - 服务器错误
                        statusCode >= 400 ? '\x1b[33m' : // 黄色 - 客户端错误
                        statusCode >= 200 ? '\x1b[32m' : // 绿色 - 成功
                        '\x1b[0m';
    
    console.log(
      `${statusColor}${log.method} ${log.url} ${log.status} ${duration}ms\x1b[0m`
    );
  });
  
  next();
}

module.exports = logger;
