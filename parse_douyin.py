#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音解析脚本 - 供Node.js调用
用法: python parse_douyin.py <抖音链接>
返回: JSON格式结果
"""

import sys
import json
import os

# 添加parser目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'parser'))

from scraper import Scraper

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "请提供抖音链接"}, ensure_ascii=False))
        sys.exit(1)
    
    url = sys.argv[1]
    
    try:
        api = Scraper()
        result = api.douyin(url)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    main()
