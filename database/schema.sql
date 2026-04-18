-- 创作者备份箱 - 数据库结构
-- 
-- 支持 MySQL 5.7+ / MySQL 8.0+
-- 

-- 创建数据库
CREATE DATABASE IF NOT EXISTS creative_vault 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE creative_vault;

-- ══════════════════════════════════════════════════════════════
-- 备份记录表
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `backup_records` (
  `id` VARCHAR(64) NOT NULL COMMENT '记录ID',
  `user_id` VARCHAR(64) NOT NULL COMMENT '用户ID',
  `platform` VARCHAR(20) NOT NULL COMMENT '平台标识：douyin/kuaishou/xiaohongshu',
  `original_url` TEXT COMMENT '原始作品链接',
  `title` VARCHAR(500) COMMENT '作品标题',
  `content` TEXT COMMENT '作品正文内容',
  `tags` TEXT COMMENT '话题标签，JSON数组格式',
  `video_url` TEXT COMMENT '视频下载地址',
  `cover_url` TEXT COMMENT '封面图地址',
  `video_duration` INT COMMENT '视频时长（秒）',
  `video_width` INT COMMENT '视频宽度',
  `video_height` INT COMMENT '视频高度',
  `status` TINYINT DEFAULT 1 COMMENT '状态：0-已删除 1-正常',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` DATETIME DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_platform` (`platform`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_user_platform` (`user_id`, `platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='备份记录表';

-- ══════════════════════════════════════════════════════════════
-- 用户协议确认记录表
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `user_agreements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` VARCHAR(64) NOT NULL COMMENT '用户ID',
  `version` VARCHAR(10) NOT NULL DEFAULT '1.0' COMMENT '协议版本',
  `ip_address` VARCHAR(45) COMMENT '确认时的IP地址',
  `user_agent` VARCHAR(500) COMMENT '用户代理信息',
  `agreed_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '确认时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_version` (`user_id`, `version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户协议确认表';

-- ══════════════════════════════════════════════════════════════
-- API请求日志表（可选，用于监控和排查）
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `api_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `request_id` VARCHAR(64) COMMENT '请求唯一标识',
  `user_id` VARCHAR(64) COMMENT '用户ID',
  `endpoint` VARCHAR(100) COMMENT '请求端点',
  `method` VARCHAR(10) COMMENT '请求方法',
  `params` TEXT COMMENT '请求参数',
  `response_code` INT COMMENT '响应状态码',
  `response_time` INT COMMENT '响应时间（毫秒）',
  `ip_address` VARCHAR(45) COMMENT 'IP地址',
  `user_agent` VARCHAR(500) COMMENT '用户代理',
  `error_message` TEXT COMMENT '错误信息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_endpoint` (`endpoint`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API请求日志表';

-- ══════════════════════════════════════════════════════════════
-- 示例查询
-- ══════════════════════════════════════════════════════════════

-- 查询用户最近30天的备份记录
-- SELECT * FROM backup_records 
-- WHERE user_id = '用户ID' 
--   AND status = 1
--   AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
-- ORDER BY created_at DESC;

-- 统计各平台备份数量
-- SELECT platform, COUNT(*) as count 
-- FROM backup_records 
-- WHERE user_id = '用户ID' AND status = 1
-- GROUP BY platform;

-- 查询解析成功率（需要结合日志表）
