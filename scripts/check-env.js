/**
 * 环境变量检查脚本
 * 
 * 在应用启动前验证所有必要的环境变量是否已设置
 */

// 加载环境变量
require('dotenv').config();

// 必需的环境变量列表
const requiredEnvVars = [
  'JWT_SECRET',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'USER_USERNAME',
  'USER_PASSWORD',
  'API_TOKEN'
];

// 检查环境变量
function checkEnvVars() {
  console.log('🔍 检查环境变量...');
  console.log('💡 从 .env 文件加载环境变量');
  const missing = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('❌ 缺少必要的环境变量:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('\n请确保创建 .env 文件并设置所有必要的环境变量');
    console.error('可以从 env.example 复制一个模板: cp env.example .env');
    
    // 在生产环境中退出，开发环境仅警告
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 生产环境中缺少环境变量，应用将退出');
      process.exit(1);
    } else {
      console.warn('⚠️ 开发环境中缺少环境变量，认证系统可能无法正常工作');
    }
  } else {
    console.log('✅ 所有必要的环境变量已设置');
    // 打印环境变量的存在性（不打印实际值以保护隐私）
    requiredEnvVars.forEach(envVar => {
      console.log(`   - ${envVar}: ${process.env[envVar] ? '已设置 ✓' : '未设置 ✗'}`);
    });
  }
}

// 执行检查
checkEnvVars();

module.exports = checkEnvVars; 