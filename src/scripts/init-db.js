const { sequelize } = require('../config/database');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { v4: uuidv4 } = require('uuid');

// 初始化数据库
async function initDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 导入OAuth2和OpenID Connect相关模型
    const Client = require('../models/Client');
    const AuthorizationCode = require('../models/AuthorizationCode');
    const AccessToken = require('../models/AccessToken');
    const RefreshToken = require('../models/RefreshToken');
    const IdToken = require('../models/IdToken');
    
    // 同步所有模型到数据库
    // 使用更安全的方式同步模型，避免破坏现有数据
    await sequelize.sync({ alter: false });
    console.log('数据库表结构已同步');
    
    // 检查是否已存在管理员账户
    const adminExists = await User.findOne({
      where: { role: 'admin' }
    });
    
    // 如果没有管理员账户，创建一个默认的管理员账户
    if (!adminExists) {
      await User.create({
        userId: uuidv4(),
        username: 'admin',
        password: 'admin123', // 密码会通过模型的钩子自动加密
        nickname: '系统管理员',
        email: 'admin@example.com',
        role: 'admin'
      });
      console.log('已创建默认管理员账户');
    } else {
      console.log('管理员账户已存在，跳过创建');
    }
    
    // 建立模型之间的关联
    // 创建一个包含所有模型的对象
    const models = {
      User,
      LoginLog,
      Client,
      AuthorizationCode,
      AccessToken,
      RefreshToken,
      IdToken
    };
    
    // 正确传递models对象给associate方法
    if (LoginLog.associate) {
      LoginLog.associate(models);
    }
    
    if (User.associate) {
      User.associate(models);
    }
    
    // 为OAuth2和OpenID Connect模型建立关联
    if (Client.associate) {
      Client.associate(models);
    }
    
    if (AuthorizationCode.associate) {
      AuthorizationCode.associate(models);
    }
    
    if (AccessToken.associate) {
      AccessToken.associate(models);
    }
    
    if (RefreshToken.associate) {
      RefreshToken.associate(models);
    }
    
    if (IdToken.associate) {
      IdToken.associate(models);
    }
    
    console.log('数据库初始化完成！');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('数据库初始化脚本执行完毕');
      process.exit(0);
    })
    .catch(err => {
      console.error('初始化脚本执行失败:', err);
      process.exit(1);
    });
}

module.exports = { initDatabase };