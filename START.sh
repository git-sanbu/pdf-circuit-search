#!/bin/bash

echo "=========================================="
echo "  PDF电路图搜索系统 - 启动脚本"
echo "=========================================="
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装Node.js"
    echo "请访问 https://nodejs.org/ 下载安装"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ 错误: Node.js版本过低 (当前: $(node -v), 需要: 20+)"
    exit 1
fi

echo "✓ Node.js版本: $(node -v)"

# 检查PDF文件
PDF_COUNT=$(find server/pdfs -name "*.pdf" 2>/dev/null | wc -l)
if [ "$PDF_COUNT" -eq 0 ]; then
    echo "⚠️  警告: server/pdfs/ 目录中没有PDF文件"
    echo "   请从网盘下载PDF文件: https://mega.nz/folder/OAVghZgC#IE2fw3wD9DoSLkPElhvcnQ"
    echo "   并将文件放入 server/pdfs/ 目录"
    echo ""
    read -p "是否继续? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✓ 找到 $PDF_COUNT 个PDF文件"
fi

# 检查依赖
echo ""
echo "📦 检查依赖..."

if [ ! -d "server/node_modules" ]; then
    echo "   安装后端依赖..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "   安装前端依赖..."
    cd client && npm install && cd ..
fi

echo "✓ 依赖已安装"

# 检查环境变量
if [ ! -f "server/.env" ]; then
    echo "⚠️  警告: server/.env 文件不存在"
    echo "   LLM功能将不可用"
    echo ""
fi

echo ""
echo "=========================================="
echo "  启动服务"
echo "=========================================="
echo ""
echo "后端服务将在 http://localhost:3000 启动"
echo "前端服务将在 http://localhost:5173 启动"
echo ""
echo "请在新终端窗口运行以下命令："
echo ""
echo "  终端1 (后端):  cd server && npm run dev"
echo "  终端2 (前端):  cd client && npm run dev"
echo ""
echo "或者使用以下命令自动启动："
echo ""
echo "  ./START.sh auto"
echo ""

if [ "$1" = "auto" ]; then
    echo "🚀 自动启动模式"
    echo ""

    # 启动后端
    echo "启动后端..."
    cd server
    npm run dev > ../server.log 2>&1 &
    SERVER_PID=$!
    cd ..

    sleep 3

    # 启动前端
    echo "启动前端..."
    cd client
    npm run dev > ../client.log 2>&1 &
    CLIENT_PID=$!
    cd ..

    echo ""
    echo "✅ 服务已启动!"
    echo ""
    echo "后端 PID: $SERVER_PID (日志: server.log)"
    echo "前端 PID: $CLIENT_PID (日志: client.log)"
    echo ""
    echo "访问: http://localhost:5173"
    echo ""
    echo "停止服务: kill $SERVER_PID $CLIENT_PID"
    echo ""

    # 保存PID
    echo "$SERVER_PID $CLIENT_PID" > .pids

    # 等待用户中断
    echo "按 Ctrl+C 停止服务"
    trap "kill $SERVER_PID $CLIENT_PID; rm .pids; echo '服务已停止'; exit" INT
    wait
fi
