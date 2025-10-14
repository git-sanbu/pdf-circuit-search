# 📤 上传到GitHub指南

## 🎯 快速上传（3步完成）

### 步骤1: 在GitHub上创建仓库

访问: **https://github.com/new**

填写信息：
```
Repository name: pdf-circuit-search
Description: 智能PDF电路图搜索系统 - 支持AI同义词扩展、OCR识别和文档问答
Visibility: Public 或 Private（你选择）
```

**重要**:
- ❌ 不要勾选 "Add a README file"
- ❌ 不要勾选 "Add .gitignore"
- ❌ 不要勾选 "Choose a license"

点击 **"Create repository"**

---

### 步骤2: 复制仓库URL

创建完成后，复制显示的仓库URL，例如：
```
https://github.com/YOUR_USERNAME/pdf-circuit-search.git
```

---

### 步骤3: 连接并推送

在终端运行（替换YOUR_REPO_URL为你的仓库地址）：

```bash
cd /home/test/pdftest

# 添加远程仓库
git remote add origin YOUR_REPO_URL

# 推送代码
git push -u origin master
```

---

## 📋 推荐的仓库设置

创建仓库后，在Settings中添加：

### Topics (标签)
```
pdf, search, ocr, ai, nlp, react, typescript, nodejs, express, sqlite
```

### About (简介)
```
智能PDF电路图搜索系统
• 支持关键词搜索和高亮显示
• AI同义词扩展（中英文）
• OCR扫描版PDF识别
• 文档智能问答
```

### Social Preview
- 可以截图你的应用界面作为预览图

---

## ✅ 已完成的准备工作

✅ Git仓库已初始化
✅ `.gitignore` 已配置（保护敏感文件）
✅ 所有代码已提交（4个提交）
✅ MIT许可证已添加
✅ README文档完整
✅ 环境变量示例文件已包含

---

## 🔐 安全检查

✅ **API密钥已排除** - `.env` 文件不会上传
✅ **数据库已排除** - `data/` 目录不会上传
✅ **PDF文件已排除** - `pdfs/` 目录不会上传
✅ **依赖已排除** - `node_modules/` 不会上传

---

## 🎉 完成！

推送成功后，你的代码就可以在GitHub上看到了！

访问你的仓库页面：
```
https://github.com/YOUR_USERNAME/pdf-circuit-search
```

---

## 📝 后续操作

### 克隆到其他机器
```bash
git clone YOUR_REPO_URL
cd pdf-circuit-search

# 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env 填入你的API密钥

# 安装依赖
cd server && npm install
cd ../client && npm install

# 启动开发服务器
cd ../server && npm run dev
cd ../client && npm run dev
```

### 更新代码到GitHub
```bash
git add .
git commit -m "你的更新说明"
git push
```

---

## 💡 常见问题

**Q: push时要求登录？**
A: 第一次push需要GitHub认证。推荐使用Personal Access Token。

**Q: push失败提示权限错误？**
A: 检查仓库URL是否正确，确认你有该仓库的写权限。

**Q: 如何更新远程URL？**
```bash
git remote set-url origin NEW_URL
```

**Q: 如何查看当前远程仓库？**
```bash
git remote -v
```

---

## 📞 需要帮助？

查看详细的项目状态：
```bash
cat PROJECT_STATUS.md
```

查看主要文档：
```bash
cat README.md
```
