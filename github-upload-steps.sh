#!/bin/bash

# 1. 添加所有文件到暂存区（排除 .gitignore 中的文件）
git add .

# 2. 提交更改
git commit -m "feat: 完整的PDF电路图搜索系统

功能特性:
- ✅ PDF文件在线阅读和搜索
- ✅ 智能关键词搜索和高亮显示
- ✅ AI同义词扩展（支持中英文）
- ✅ OCR扫描版PDF支持（阿里云OCR）
- ✅ 文档智能问答功能
- ✅ 相关度排序和导航

技术栈:
- 前端: React 19, TypeScript, Vite, TailwindCSS
- 后端: Node.js, Express, SQLite, OpenAI API
- OCR: 阿里云OCR, Sharp图像处理

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. 添加远程仓库（将 YOUR_USERNAME 和 YOUR_REPO_NAME 替换为你的）
# git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 4. 推送到GitHub
# git push -u origin master

echo "======================"
echo "脚本已生成！"
echo "======================"
echo ""
echo "接下来的步骤:"
echo "1. 在GitHub上创建新仓库: https://github.com/new"
echo "2. 复制仓库URL（例如: https://github.com/username/repo-name.git）"
echo "3. 运行以下命令（替换YOUR_REPO_URL）:"
echo ""
echo "   git remote add origin YOUR_REPO_URL"
echo "   git push -u origin master"
echo ""
