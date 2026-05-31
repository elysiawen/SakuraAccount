const { sequelize, Sequelize } = require('../config/database');

// 定义登录日志模型
const LoginLog = sequelize.define('LoginLog', {
  // 日志ID
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // 用户ID，关联到User模型
  userId: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'userId'
    }
  },
  // 登录IP
  ipAddress: {
    type: Sequelize.STRING,
    allowNull: true
  },
  // 登录设备/浏览器信息
  userAgent: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  // 登录状态：成功/失败
  status: {
    type: Sequelize.ENUM('success', 'failed'),
    defaultValue: 'success',
    allowNull: false
  },
  // 失败原因
  failReason: {
    type: Sequelize.STRING,
    allowNull: true
  },
  // 登录时间
  loginAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
    allowNull: false
  }
}, {
  // 表名
  tableName: 'login_logs',
  // 不需要updatedAt字段
  timestamps: true,
  updatedAt: false
});

// 关联用户模型
LoginLog.associate = (models) => {
  LoginLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

// 静态方法：获取用户的登录历史
LoginLog.getUserLoginHistory = function(userId, limit = 10) {
  return this.findAll({
    where: { userId },
    order: [['loginAt', 'DESC']],
    limit
  });
};

// 静态方法：记录登录
LoginLog.recordLogin = function(userId, ipAddress, userAgent, status = 'success', failReason = null) {
  return this.create({
    userId,
    ipAddress,
    userAgent,
    status,
    failReason,
    loginAt: new Date()
  });
};

module.exports = LoginLog;