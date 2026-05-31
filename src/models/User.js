const { sequelize, Sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// 定义用户模型
const User = sequelize.define('User', {
  // 用户ID，使用UUID作为唯一标识符
  userId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  // 用户名，唯一
  username: {
    type: Sequelize.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50]
    }
  },
  // 密码（加密存储）
  password: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  // 昵称
  nickname: {
    type: Sequelize.STRING(50),
    allowNull: false,
    defaultValue: function() {
      return this.username; // 默认与用户名相同
    }
  },
  // 电子邮件，唯一
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  // 头像URL
  avatarUrl: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: '/public/images/default-avatar.png'
  },
  // 用户组/角色 (admin或user)
  role: {
    type: Sequelize.ENUM('admin', 'user'),
    defaultValue: 'user',
    allowNull: false
  },
  // 账号状态
  status: {
    type: Sequelize.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active',
    allowNull: false
  },
  // 最后登录时间
  lastLoginAt: {
    type: Sequelize.DATE,
    allowNull: true
  },
  // 注册时间
  createdAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  },
  // 更新时间
  updatedAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  // 表名
  tableName: 'users',
  // 时间戳
  timestamps: true,
  // 钩子
  hooks: {
    // 保存前加密密码
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// 实例方法：验证密码
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// 静态方法：查找用户
User.findByUsername = function(username) {
  return this.findOne({ where: { username } });
};

User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

User.findByUserId = function(userId) {
  return this.findOne({ where: { userId } });
};

// 关联登录日志模型
User.associate = (models) => {
  User.hasMany(models.LoginLog, {
    foreignKey: 'userId',
    as: 'loginLogs'
  });
};

module.exports = User;