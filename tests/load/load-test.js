const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '100');
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '60'); // 秒
const RESULTS_DIR = path.resolve(__dirname, 'results');

// 确保结果目录存在
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

console.log('🎯 开始智慧工地物联网平台负载测试');
console.log(`🏗️  并发用户数: ${CONCURRENT_USERS}`);
console.log(`⏱️  测试时长: ${TEST_DURATION}秒`);
console.log(`🌐 目标 URL: ${BASE_URL}`);

// 生成测试报告文件名
const TEST_TIME = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
const REPORT_FILE = path.join(RESULTS_DIR, `load-test-${TEST_TIME}.json`);
const LOG_FILE = path.join(RESULTS_DIR, `load-test-${TEST_TIME}.log`);

// 日志函数
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
};

// 性能测试数据
let results = {
  timestamp: TEST_TIME,
  baseUrl: BASE_URL,
  concurrentUsers: CONCURRENT_USERS,
  testDuration: TEST_DURATION,
  requests: 0,
  errors: 0,
  responseTimes: [],
  statusCodes: {},
  endpoints: {}
};

// 发送请求函数
const sendRequest = async (method, url, data = null) => {
  const startTime = Date.now();

  try {
    const config = {
      method,
      url,
      data,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // 如果需要认证，可以添加认证头部
    if (url.includes('/auth')) {
      config.headers['Authorization'] = `Bearer ${process.env.TEST_TOKEN}`;
    }

    const response = await axios(config);

    const endTime = Date.now();
    const duration = endTime - startTime;

    log(`✅ ${method} ${url} - ${response.status} (${duration}ms)`);

    // 记录结果
    results.requests++;
    results.responseTimes.push(duration);

    results.statusCodes[response.status] =
      (results.statusCodes[response.status] || 0) + 1;

    results.endpoints[url] = {
      count: (results.endpoints[url]?.count || 0) + 1,
      avgResponseTime: (
        (results.endpoints[url]?.avgResponseTime || 0) + duration
      ) / 2,
      minResponseTime: Math.min(
        results.endpoints[url]?.minResponseTime || duration,
        duration
      ),
      maxResponseTime: Math.max(
        results.endpoints[url]?.maxResponseTime || duration,
        duration
      )
    };

    return response;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const status = error.response?.status || 'ERROR';

    log(`❌ ${method} ${url} - ${status} (${duration}ms)`);

    // 记录错误
    results.requests++;
    results.errors++;
    results.responseTimes.push(duration);

    results.statusCodes[status] = (results.statusCodes[status] || 0) + 1;

    return error;
  }
};

// 用户场景函数
const userScenario = async () => {
  try {
    // 1. 登录
    const loginResponse = await sendRequest('POST', `${BASE_URL}/api/v1/auth/login`, {
      username: 'e2e_test_user',
      password: 'password123'
    });

    if (loginResponse?.data?.data?.token) {
      process.env.TEST_TOKEN = loginResponse.data.data.token;
    }

    // 2. 获取设备列表
    await sendRequest('GET', `${BASE_URL}/api/v1/devices`);

    // 3. 创建设备
    await sendRequest('POST', `${BASE_URL}/api/v1/devices`, {
      deviceId: `test_device_${Math.floor(Math.random() * 10000)}`,
      name: '测试设备',
      type: 'sensor',
      protocol: 'mqtt',
      status: 'online'
    });

    // 4. 获取传感器数据
    await sendRequest('GET', `${BASE_URL}/api/v1/data/sensor`, {
      params: {
        deviceId: 'DEV-001',
        limit: 10
      }
    });

    // 5. 获取告警列表
    await sendRequest('GET', `${BASE_URL}/api/v1/alerts/history`);
  } catch (error) {
    log(`❌ 用户场景执行失败: ${error.message}`);
    results.errors++;
  }
};

// 运行负载测试
const runLoadTest = async () => {
  log('📊 开始负载测试...');

  // 启动所有用户
  const promises = [];
  const userInterval = TEST_DURATION * 1000 / CONCURRENT_USERS;

  for (let i = 0; i < CONCURRENT_USERS; i++) {
    promises.push(new Promise((resolve) => {
      setTimeout(async () => {
        // 每个用户连续发送请求直到测试结束
        const userStartTime = Date.now();
        while (Date.now() - userStartTime < TEST_DURATION * 1000) {
          await userScenario();
          // 随机间隔 1-3 秒
          const interval = 1000 + Math.random() * 2000;
          await new Promise(resolve => setTimeout(resolve, interval));
        }
        resolve();
      }, i * userInterval);
    }));
  }

  await Promise.all(promises);

  log('📊 负载测试完成!');

  // 计算统计数据
  results.avgResponseTime = results.responseTimes.reduce(
    (sum, time) => sum + time,
    0
  ) / results.requests;

  results.minResponseTime = Math.min(...results.responseTimes);
  results.maxResponseTime = Math.max(...results.responseTimes);

  // 计算 95% 和 99% 分位数
  results.responseTimes.sort((a, b) => a - b);
  results.p95ResponseTime = results.responseTimes[Math.floor(results.responseTimes.length * 0.95)];
  results.p99ResponseTime = results.responseTimes[Math.floor(results.responseTimes.length * 0.99)];

  // 保存结果
  fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));
  log(`📄 测试报告已保存到: ${REPORT_FILE}`);
};

// 主函数
const main = async () => {
  try {
    // 检查服务是否可用
    await sendRequest('GET', `${BASE_URL}/api/v1/auth/health`);

    // 初始化测试用户（如果不存在）
    await sendRequest('POST', `${BASE_URL}/api/v1/auth/register`, {
      username: 'e2e_test_user',
      email: 'e2e_test@example.com',
      password: 'password123',
      fullName: 'E2E Test User',
      phone: '1234567890'
    });

    // 运行测试
    await runLoadTest();

    log(`📊 请求总数: ${results.requests}`);
    log(`📊 错误数: ${results.errors}`);
    log(`📊 错误率: ${((results.errors / results.requests) * 100).toFixed(2)}%`);
    log(`📊 平均响应时间: ${results.avgResponseTime.toFixed(2)}ms`);
    log(`📊 最小响应时间: ${results.minResponseTime}ms`);
    log(`📊 最大响应时间: ${results.maxResponseTime}ms`);
    log(`📊 95% 响应时间: ${results.p95ResponseTime}ms`);
    log(`📊 99% 响应时间: ${results.p99ResponseTime}ms`);
  } catch (error) {
    log(`💥 测试过程中出现错误: ${error.message}`);
    process.exit(1);
  }
};

// 启动测试
main();
