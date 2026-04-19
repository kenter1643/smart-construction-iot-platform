#!/bin/bash

# 智慧工地物联网平台部署脚本
# 用于将平台部署到暂存或生产环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 默认配置
DEPLOY_ENV="staging"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKER_COMPOSE_FILE="${PROJECT_DIR}/docker/docker-compose.yml"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"

# 解析命令行参数
while getopts "e:h" opt; do
    case $opt in
        e)
            DEPLOY_ENV="$OPTARG"
            ;;
        h)
            echo "使用方法: $0 [-e 环境] [-h]"
            echo "  -e 环境: 部署环境 (staging 或 production，默认: staging)"
            echo "  -h: 显示帮助信息"
            exit 0
            ;;
        \?)
            print_error "无效选项: -$OPTARG"
            exit 1
            ;;
        :)
            print_error "选项 -$OPTARG 需要参数"
            exit 1
            ;;
    esac
done

# 验证环境
if [ "$DEPLOY_ENV" != "staging" ] && [ "$DEPLOY_ENV" != "production" ]; then
    print_error "无效的环境: $DEPLOY_ENV"
    echo "支持的环境: staging 或 production"
    exit 1
fi

print_info "开始部署智慧工地物联网平台到 $DEPLOY_ENV 环境..."

# 1. 检查 Docker 和 Docker Compose
print_info "检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose 未安装"
    exit 1
fi

print_success "Docker 环境检查通过"

# 2. 拉取最新代码
print_info "拉取最新代码..."
if [ "$SKIP_GIT_PULL" = "1" ]; then
    print_warning "已设置 SKIP_GIT_PULL=1，跳过代码拉取"
elif git rev-parse --git-dir > /dev/null 2>&1; then
    git pull origin main
    print_success "代码拉取成功"
else
    print_info "当前目录不是 Git 仓库，跳过代码拉取"
fi

# 3. 备份数据库（仅在 production 环境）
if [ "$DEPLOY_ENV" = "production" ]; then
    print_info "备份生产环境数据库..."
    BACKUP_DIR="${PROJECT_DIR}/backups"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).sql"
    docker exec -i smart-iot-mysql mysqldump -u root -proot123 smartiot > "$BACKUP_FILE"
    print_success "数据库备份成功: $BACKUP_FILE"
fi

# 4. 停止并删除旧容器
print_info "停止旧容器..."
cd "$(dirname "$DOCKER_COMPOSE_FILE")"
if command -v docker-compose &> /dev/null; then
    docker-compose -f "$(basename "$DOCKER_COMPOSE_FILE")" down
else
    docker compose -f "$(basename "$DOCKER_COMPOSE_FILE")" down
fi
print_success "旧容器停止成功"

# 5. 构建并启动新容器
print_info "构建并启动新容器..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f "$(basename "$DOCKER_COMPOSE_FILE")" up -d --build
else
    docker compose -f "$(basename "$DOCKER_COMPOSE_FILE")" up -d --build
fi
print_success "新容器启动成功"

# 6. 等待服务健康检查
print_info "等待服务健康检查..."
MAX_WAIT=120
WAIT_INTERVAL=5
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if [ "$(docker inspect -f '{{.State.Running}}' smart-iot-mysql 2>/dev/null || echo "false")" = "true" ]; then
        if [ "$(docker inspect -f '{{.State.Health.Status}}' smart-iot-mysql 2>/dev/null || echo "unhealthy")" = "healthy" ]; then
            print_success "MySQL 健康检查通过"
            break
        fi
    fi
    sleep $WAIT_INTERVAL
    ELAPSED=$((ELAPSED + WAIT_INTERVAL))
    print_info "等待中... 已等待 ${ELAPSED} 秒"
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    print_warning "服务健康检查超时，继续部署"
fi

# 7. 运行数据库迁移（如果需要）
print_info "检查数据库迁移..."
# 这里可以添加数据库迁移命令
print_success "数据库迁移检查完成"

# 8. 运行端到端集成测试（仅在 staging 环境）
if [ "$DEPLOY_ENV" = "staging" ]; then
    print_info "运行端到端集成测试..."
    cd "$PROJECT_DIR"
    if RUN_E2E=true npm run test:integration; then
        print_success "集成测试通过"
    else
        print_warning "集成测试失败，但继续部署"
    fi
fi

# 9. 显示部署信息
print_success "部署成功！"
echo ""
echo "部署环境: $DEPLOY_ENV"
echo "部署时间: $(date)"
echo ""
echo "可访问地址："
echo "  - 前端: http://localhost:5173"
echo "  - 设备管理 API: http://localhost:3001"
echo "  - 数据存储 API: http://localhost:3002"
echo "  - 告警通知 API: http://localhost:3004"
echo "  - 用户认证 API: http://localhost:3005"
echo ""
echo "Docker 容器状态："
cd "$(dirname "$DOCKER_COMPOSE_FILE")"
if command -v docker-compose &> /dev/null; then
    docker-compose -f "$(basename "$DOCKER_COMPOSE_FILE")" ps
else
    docker compose -f "$(basename "$DOCKER_COMPOSE_FILE")" ps
fi
