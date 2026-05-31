const { sequelize, Sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// 定义OAuth刷新令牌模型
const RefreshToken = sequelize.define('RefreshToken', {
  // 令牌ID
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  // 刷新令牌
  token: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  // 关联的访问令牌ID
  accessTokenId: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'oauth_access_tokens',
      key: 'id'
    }
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
  // 令牌过期时间
  expiresAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: () => {
      // 默认30天过期
      const date = new Date();
      date.setDate(date.getDate() + 30);
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
  tableName: 'oauth_refresh_tokens',
  // 时间戳
  timestamps: true,
  updatedAt: false
});

// 关联模型
RefreshToken.associate = (models) => {
  RefreshToken.belongsTo(models.AccessToken, {
    foreignKey: 'accessTokenId',
    as: 'accessToken'
  });
  
  RefreshToken.belongsTo(models.Client, {
    foreignKey: 'clientId',
    as: 'client'
  });
  
  RefreshToken.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

// 静态方法：根据令牌查找记录
RefreshToken.findByToken = function(token) {
  return this.findOne({ where: { token } });
};

// 静态方法：生成新的刷新令牌
RefreshToken.generateToken = function() {
  return crypto.randomBytes(40).toString('hex');
};

// 静态方法：创建新的刷新令牌
RefreshToken.createToken = async function(accessTokenId, clientId, userId) {
  const token = this.generateToken();
  
  return await this.create({
    token,
    accessTokenId,
    clientId,
    userId
  });
};

// 实例方法：检查令牌是否有效
RefreshToken.prototype.isValid = function() {
  return !this.revoked && new Date() < this.expiresAt;
};

// 实例方法：撤销令牌
RefreshToken.prototype.revoke = async function() {
  this.revoked = true;
  return await this.save();
};

module.exports = RefreshToken;