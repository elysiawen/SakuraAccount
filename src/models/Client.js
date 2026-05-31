const { sequelize, Sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// 定义OAuth客户端模型
const Client = sequelize.define('Client', {
  // 客户端ID
  clientId: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  // 客户端密钥
  clientSecret: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: () => crypto.randomBytes(32).toString('hex')
  },
  // 客户端名称
  name: {
    type: Sequelize.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  // 客户端描述
  description: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  // 客户端网站URL
  websiteUrl: {
    type: Sequelize.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  // 重定向URI列表（用于OAuth回调）
  redirectUris: {
    type: Sequelize.TEXT,
    allowNull: false,
    get() {
      const uris = this.getDataValue('redirectUris');
      return uris ? JSON.parse(uris) : [];
    },
    set(uris) {
      this.setDataValue('redirectUris', JSON.stringify(uris));
    },
    validate: {
      isValidUriArray(value) {
        if (!value || !Array.isArray(JSON.parse(value))) {
          throw new Error('重定向URI必须是一个数组');
        }
      }
    }
  },
  // 客户端Logo URL
  logoUrl: {
    type: Sequelize.STRING,
    allowNull: true
  },
  // 允许的授权类型
  allowedGrantTypes: {
    type: Sequelize.TEXT,
    allowNull: false,
    defaultValue: JSON.stringify(['authorization_code', 'refresh_token']),
    get() {
      const types = this.getDataValue('allowedGrantTypes');
      return types ? JSON.parse(types) : [];
    },
    set(types) {
      this.setDataValue('allowedGrantTypes', JSON.stringify(types));
    }
  },
  // 允许的响应类型
  allowedResponseTypes: {
    type: Sequelize.TEXT,
    allowNull: false,
    defaultValue: JSON.stringify(['code']),
    get() {
      const types = this.getDataValue('allowedResponseTypes');
      return types ? JSON.parse(types) : [];
    },
    set(types) {
      this.setDataValue('allowedResponseTypes', JSON.stringify(types));
    }
  },
  // 允许的作用域
  allowedScopes: {
    type: Sequelize.TEXT,
    allowNull: false,
    defaultValue: JSON.stringify(['profile', 'email']),
    get() {
      const scopes = this.getDataValue('allowedScopes');
      return scopes ? JSON.parse(scopes) : [];
    },
    set(scopes) {
      this.setDataValue('allowedScopes', JSON.stringify(scopes));
    }
  },
  // 是否为机密客户端（有能力安全存储密钥）
  isConfidential: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  // 客户端状态
  status: {
    type: Sequelize.ENUM('active', 'disabled'),
    defaultValue: 'active',
    allowNull: false
  },
  // 创建者用户ID
  createdBy: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'userId'
    }
  },
  // 创建时间
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
  tableName: 'oauth_clients',
  // 时间戳
  timestamps: true
});

// 关联用户模型
Client.associate = (models) => {
  Client.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
};

// 静态方法：根据客户端ID查找客户端
Client.findByClientId = function(clientId) {
  return this.findOne({ where: { clientId } });
};

// 静态方法：生成新的客户端密钥
Client.generateClientSecret = function() {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = Client;