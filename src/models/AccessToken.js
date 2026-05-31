const { sequelize, Sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// 定义OAuth访问令牌模型
const AccessToken = sequelize.define('AccessToken', {
  // 令牌ID
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  // 访问令牌
  token: {
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
  // 授权范围
  scope: {
    type: Sequelize.TEXT,
    allowNull: true,
    get() {
      const scopeValue = this.getDataValue('scope');
      return scopeValue || '';
    },
    set(scopeArray) {
      if (Array.isArray(scopeArray)) {
        this.setDataValue('scope', scopeArray.join(' '));
      } else {
        this.setDataValue('scope', scopeArray);
      }
    }
  },
  // 令牌过期时间
  expiresAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: () => {
      // 默认2小时过期
      const date = new Date();
      date.setHours(date.getHours() + 2);
      return date;
    }
  },
  // 令牌是否已撤销
  revoked: {
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
  tableName: 'oauth_access_tokens',
  // 时间戳
  timestamps: true,
  updatedAt: false
});

// 关联模型
AccessToken.associate = (models) => {
  AccessToken.belongsTo(models.Client, {
    foreignKey: 'clientId',
    as: 'client'
  });
  
  AccessToken.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

// 静态方法：根据令牌查找记录
AccessToken.findByToken = function(token) {
  return this.findOne({ where: { token } });
};

// 静态方法：生成新的访问令牌
AccessToken.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// 静态方法：创建新的访问令牌
AccessToken.createToken = async function(clientId, userId, scope) {
  const token = this.generateToken();
  
  return await this.create({
    token,
    clientId,
    userId,
    scope
  });
};

// 静态方法：获取用户的有效令牌
AccessToken.getActiveTokensForUser = function(userId) {
  return this.findAll({
    where: {
      userId,
      revoked: false,
      expiresAt: { [Sequelize.Op.gt]: new Date() }
    }
  });
};

// 实例方法：检查令牌是否有效
AccessToken.prototype.isValid = function() {
  return !this.revoked && new Date() < this.expiresAt;
};

// 实例方法：撤销令牌
AccessToken.prototype.revoke = async function() {
  this.revoked = true;
  return await this.save();
};

module.exports = AccessToken;