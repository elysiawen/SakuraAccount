const { sequelize, Sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// 定义OAuth授权码模型
const AuthorizationCode = sequelize.define('AuthorizationCode', {
  // 授权码ID
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  // 授权码（发送给客户端的代码）
  code: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  // 客户端ID（关联到Client模型）
  clientId: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'oauth_clients',
      key: 'clientId'
    }
  },
  // 用户ID（关联到User模型）
  userId: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'userId'
    }
  },
  // 重定向URI
  redirectUri: {
    type: Sequelize.STRING,
    allowNull: false
  },
  // 授权范围
  scope: {
    type: Sequelize.TEXT,
    allowNull: true,
    get() {
      const scopeValue = this.getDataValue('scope');
      return scopeValue ? scopeValue.split(' ') : [];
    },
    set(scopeArray) {
      if (Array.isArray(scopeArray)) {
        this.setDataValue('scope', scopeArray.join(' '));
      } else {
        this.setDataValue('scope', scopeArray);
      }
    }
  },
  // 授权码过期时间
  expiresAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: () => {
      // 默认10分钟过期
      const date = new Date();
      date.setMinutes(date.getMinutes() + 10);
      return date;
    }
  },
  // 是否已使用
  used: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  // 创建时间
  createdAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  }
}, {
  // 表名
  tableName: 'oauth_authorization_codes',
  // 时间戳
  timestamps: true,
  updatedAt: false
});

// 关联模型
AuthorizationCode.associate = (models) => {
  AuthorizationCode.belongsTo(models.Client, {
    foreignKey: 'clientId',
    as: 'client'
  });
  
  AuthorizationCode.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

// 静态方法：根据授权码查找记录
AuthorizationCode.findByCode = function(code) {
  return this.findOne({ where: { code } });
};

// 静态方法：生成新的授权码
AuthorizationCode.generateCode = function() {
  return uuidv4().replace(/-/g, '');
};

// 静态方法：创建新的授权码
AuthorizationCode.createCode = async function(clientId, userId, redirectUri, scope) {
  const code = this.generateCode();
  
  return await this.create({
    code,
    clientId,
    userId,
    redirectUri,
    scope
  });
};

// 实例方法：检查授权码是否有效
AuthorizationCode.prototype.isValid = function() {
  return !this.used && new Date() < this.expiresAt;
};

// 实例方法：标记授权码为已使用
AuthorizationCode.prototype.markAsUsed = async function() {
  this.used = true;
  return await this.save();
};

module.exports = AuthorizationCode;