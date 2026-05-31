const { sequelize, Sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const jwtUtil = require('../utils/jwt');
const crypto = require('crypto');

// 定义OpenID Connect ID令牌模型
const IdToken = sequelize.define('IdToken', {
  // 令牌ID
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  // JWT令牌
  token: {
    type: Sequelize.TEXT,
    allowNull: false
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
  // 关联的访问令牌ID
  accessTokenId: {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'oauth_access_tokens',
      key: 'id'
    }
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
  // 令牌过期时间
  expiresAt: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: () => {
      // 默认1小时过期
      const date = new Date();
      date.setHours(date.getHours() + 1);
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
  tableName: 'oauth_id_tokens',
  // 时间戳
  timestamps: true,
  updatedAt: false
});

// 关联模型
IdToken.associate = (models) => {
  IdToken.belongsTo(models.Client, {
    foreignKey: 'clientId',
    as: 'client'
  });
  
  IdToken.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  
  IdToken.belongsTo(models.AccessToken, {
    foreignKey: 'accessTokenId',
    as: 'accessToken'
  });
};

// 静态方法：生成新的ID令牌
IdToken.generateToken = async function(user, client, scope, accessTokenId = null) {
  // 创建JWT负载
  const payload = {
    iss: process.env.OPENID_ISSUER || 'http://127.0.0.1:3000',  // 颁发者
    sub: user.userId,                                                          // 主题（用户ID）
    aud: client.clientId,                                                      // 受众（客户端ID）
    exp: Math.floor(Date.now() / 1000) + (60 * 60),                           // 过期时间（1小时）
    iat: Math.floor(Date.now() / 1000),                                        // 颁发时间
    auth_time: Math.floor(Date.now() / 1000),                                  // 认证时间
    nonce: crypto.randomBytes(16).toString('hex'),                             // 随机数
    // 用户信息（根据请求的scope决定包含哪些信息）
    name: user.nickname,
    preferred_username: user.username,
  };
  
  // 根据scope添加额外的用户信息
  if (scope.includes('email')) {
    payload.email = user.email;
    payload.email_verified = true; // 假设邮箱已验证，实际应根据用户邮箱验证状态设置
  }
  
  // 使用统一JWT工具签名（支持HS256/RS256）
  const token = jwtUtil.sign(payload);
  
  // 创建ID令牌记录
  return await this.create({
    token,
    clientId: client.clientId,
    userId: user.userId,
    accessTokenId,
    scope,
    expiresAt: new Date(payload.exp * 1000)
  });
};

// 静态方法：验证ID令牌
IdToken.verifyToken = function(token, clientId) {
  try {
    return jwtUtil.verify(token, {
      issuer: process.env.OPENID_ISSUER || 'http://127.0.0.1:3000',
      audience: clientId
    });
  } catch (error) {
    console.error('ID令牌验证失败:', error.message);
    return null;
  }
};

// 实例方法：检查令牌是否有效
IdToken.prototype.isValid = function() {
  return !this.revoked && new Date() < this.expiresAt;
};

// 实例方法：撤销令牌
IdToken.prototype.revoke = async function() {
  this.revoked = true;
  return await this.save();
};

module.exports = IdToken;