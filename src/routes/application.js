const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const User = require('../models/User');
const Client = require('../models/Client');
const AccessToken = require('../models/AccessToken');
const RefreshToken = require('../models/RefreshToken');
const AuthorizationCode = require('../models/AuthorizationCode');
const IdToken = require('../models/IdToken');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 配置应用图标上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
    const fullPath = path.join(process.cwd(), uploadDir, 'app-logos');
    // 确保目录存在
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    const clientId = req.params.clientId || uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `app-logo-${clientId}-${Date.now()}${ext}`);
  }
});

const logoUpload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('只允许上传JPG、PNG或GIF格式的图片'), false);
    }
    cb(null, true);
  }
});

// 用户认证中间件
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', '请先登录');
  res.redirect('/auth/login');
};

// 应用列表页面
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // 获取用户创建的所有应用
    const applications = await Client.findAll({
      where: { createdBy: req.session.user.userId },
      order: [['createdAt', 'DESC']]
    });
    
    // 获取用户信息
    const user = await User.findByUserId(req.session.user.userId);
    
    res.render('user/applications', {
      title: '我的应用',
      user,
      applications,
      errors: req.flash('errors'),
      success_msg: req.flash('success_msg')
    });
  } catch (error) {
    console.error('获取应用列表失败:', error);
    req.flash('error_msg', '获取应用列表失败');
    res.redirect('/user/dashboard');
  }
});

// 创建新应用
router.post('/create', isAuthenticated, [
  // 验证输入
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('应用名称不能为空且不超过100个字符'),
  body('websiteUrl').trim().isURL().withMessage('请输入有效的网站URL'),
  body('redirectUris').trim().notEmpty().withMessage('重定向URI不能为空')
], async (req, res) => {
  // 验证结果
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect('/user/applications');
  }
  
  try {
    // 处理重定向URI（按行分割）
    const redirectUris = req.body.redirectUris
      .split('\n')
      .map(uri => uri.trim())
      .filter(uri => uri.length > 0);
    
    // 验证重定向URI格式
    const invalidUris = redirectUris.filter(uri => {
      try {
        new URL(uri);
        return false;
      } catch (e) {
        return true;
      }
    });
    
    if (invalidUris.length > 0) {
      req.flash('errors', [{ msg: `以下重定向URI格式无效: ${invalidUris.join(', ')}` }]);
      return res.redirect('/user/applications');
    }
    
    // 处理授权类型
    let grantTypes = req.body.grantTypes;
    if (!grantTypes) {
      grantTypes = ['authorization_code']; // 默认授权码类型
    } else if (!Array.isArray(grantTypes)) {
      grantTypes = [grantTypes];
    }
    
    // 处理作用域
    let scopes = req.body.scopes;
    if (!scopes) {
      scopes = ['profile']; // 默认个人资料作用域
    } else if (!Array.isArray(scopes)) {
      scopes = [scopes];
    }
    
    // 确定客户端类型
    const isConfidential = req.body.isConfidential === 'true';
    
    // 创建新应用
    const client = await Client.create({
      name: req.body.name,
      description: req.body.description || '',
      websiteUrl: req.body.websiteUrl,
      redirectUris,
      allowedGrantTypes: grantTypes,
      allowedResponseTypes: ['code', 'token'],
      allowedScopes: scopes,
      isConfidential,
      createdBy: req.session.user.userId
    });
    
    req.flash('success_msg', '应用创建成功');
    res.redirect(`/user/applications/${client.clientId}`);
  } catch (error) {
    console.error('创建应用失败:', error);
    req.flash('errors', [{ msg: '创建应用失败，请稍后再试' }]);
    res.redirect('/user/applications');
  }
});

// 应用详情页面
router.get('/:clientId', isAuthenticated, async (req, res) => {
  try {
    // 获取应用信息
    const application = await Client.findOne({
      where: {
        clientId: req.params.clientId,
        createdBy: req.session.user.userId
      }
    });
    
    if (!application) {
      req.flash('error_msg', '找不到该应用或您没有权限访问');
      return res.redirect('/user/applications');
    }
    
    // 获取用户信息
    const user = await User.findByUserId(req.session.user.userId);
    
    // 获取基础URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    
    res.render('user/application-detail', {
      title: application.name,
      user,
      application,
      baseUrl,
      errors: req.flash('errors'),
      success_msg: req.flash('success_msg')
    });
  } catch (error) {
    console.error('获取应用详情失败:', error);
    req.flash('error_msg', '获取应用详情失败');
    res.redirect('/user/applications');
  }
});

// 更新应用
router.post('/:clientId/update', isAuthenticated, logoUpload.single('logo'), [
  // 验证输入
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('应用名称不能为空且不超过100个字符'),
  body('websiteUrl').trim().isURL().withMessage('请输入有效的网站URL'),
  body('redirectUris').trim().notEmpty().withMessage('重定向URI不能为空')
], async (req, res) => {
  // 验证结果
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('errors', errors.array());
    return res.redirect(`/user/applications/${req.params.clientId}`);
  }
  
  try {
    // 获取应用信息
    const application = await Client.findOne({
      where: {
        clientId: req.params.clientId,
        createdBy: req.session.user.userId
      }
    });
    
    if (!application) {
      req.flash('error_msg', '找不到该应用或您没有权限访问');
      return res.redirect('/user/applications');
    }
    
    // 处理重定向URI（按行分割）
    const redirectUris = req.body.redirectUris
      .split('\n')
      .map(uri => uri.trim())
      .filter(uri => uri.length > 0);
    
    // 验证重定向URI格式
    const invalidUris = redirectUris.filter(uri => {
      try {
        new URL(uri);
        return false;
      } catch (e) {
        return true;
      }
    });
    
    if (invalidUris.length > 0) {
      req.flash('errors', [{ msg: `以下重定向URI格式无效: ${invalidUris.join(', ')}` }]);
      return res.redirect(`/user/applications/${req.params.clientId}`);
    }
    
    // 处理授权类型
    let grantTypes = req.body.grantTypes;
    if (!grantTypes) {
      grantTypes = ['authorization_code']; // 默认授权码类型
    } else if (!Array.isArray(grantTypes)) {
      grantTypes = [grantTypes];
    }
    
    // 处理作用域
    let scopes = req.body.scopes;
    if (!scopes) {
      scopes = ['profile']; // 默认个人资料作用域
    } else if (!Array.isArray(scopes)) {
      scopes = [scopes];
    }
    
    // 处理应用图标上传
    let logoUrl = application.logoUrl;
    
    if (req.file) {
      // 如果存在旧图标且不是默认图标，则删除
      if (application.logoUrl && !application.logoUrl.includes('default-') && fs.existsSync(path.join(__dirname, '../../', application.logoUrl))) {
        fs.unlinkSync(path.join(__dirname, '../../', application.logoUrl));
      }
      // 文件已上传，更新logoUrl
      logoUrl = `/public/uploads/app-logos/${req.file.filename}`;
    }
    
    // 更新应用信息
    await application.update({
      name: req.body.name,
      description: req.body.description || '',
      websiteUrl: req.body.websiteUrl,
      redirectUris,
      allowedGrantTypes: grantTypes,
      allowedScopes: scopes,
      status: req.body.status || 'active',
      logoUrl: logoUrl
    });
    
    req.flash('success_msg', '应用更新成功');
    res.redirect(`/user/applications/${application.clientId}`);
  } catch (error) {
    console.error('更新应用失败:', error);
    req.flash('errors', [{ msg: '更新应用失败，请稍后再试' }]);
    res.redirect(`/user/applications/${req.params.clientId}`);
  }
});

// 重新生成客户端密钥
router.post('/:clientId/regenerate-secret', isAuthenticated, async (req, res) => {
  try {
    // 获取应用信息
    const application = await Client.findOne({
      where: {
        clientId: req.params.clientId,
        createdBy: req.session.user.userId
      }
    });
    
    if (!application) {
      req.flash('error_msg', '找不到该应用或您没有权限访问');
      return res.redirect('/user/applications');
    }
    
    // 只有机密客户端才能重新生成密钥
    if (!application.isConfidential) {
      req.flash('error_msg', '只有机密客户端才能重新生成密钥');
      return res.redirect(`/user/applications/${req.params.clientId}`);
    }
    
    // 生成新的客户端密钥
    const newSecret = Client.generateClientSecret();
    await application.update({ clientSecret: newSecret });
    
    req.flash('success_msg', '客户端密钥已重新生成');
    res.redirect(`/user/applications/${application.clientId}`);
  } catch (error) {
    console.error('重新生成客户端密钥失败:', error);
    req.flash('errors', [{ msg: '重新生成客户端密钥失败，请稍后再试' }]);
    res.redirect(`/user/applications/${req.params.clientId}`);
  }
});

// 删除应用
router.post('/:clientId/delete', isAuthenticated, async (req, res) => {
  try {
    // 开启事务
    await sequelize.transaction(async (t) => {
      // 获取应用信息
      const application = await Client.findOne({
        where: {
          clientId: req.params.clientId,
          createdBy: req.session.user.userId
        },
        transaction: t
      });
      
      if (!application) {
        throw new Error('找不到该应用或您没有权限访问');
      }
      
      // 获取所有相关的访问令牌
      const tokens = await AccessToken.findAll({
        where: { clientId: application.clientId },
        transaction: t
      });
      
      // 获取所有令牌ID
      const tokenIds = tokens.map(token => token.id);
      
      // 删除所有关联的ID令牌
      await IdToken.destroy({
        where: {
          accessTokenId: {
            [Op.in]: tokenIds
          }
        },
        transaction: t
      });
      
      // 删除所有关联的刷新令牌
      await RefreshToken.destroy({
        where: {
          accessTokenId: {
            [Op.in]: tokenIds
          }
        },
        transaction: t
      });
      
      // 删除访问令牌
      await AccessToken.destroy({
        where: { clientId: application.clientId },
        transaction: t
      });
      
      // 删除授权码
      await AuthorizationCode.destroy({
        where: { clientId: application.clientId },
        transaction: t
      });
      
      // 删除ID令牌（没有关联到访问令牌的）
      await IdToken.destroy({
        where: { 
          clientId: application.clientId,
          accessTokenId: null
        },
        transaction: t
      });
      
      // 删除应用
      await application.destroy({ transaction: t });
    });
    
    req.flash('success_msg', '应用已成功删除');
    res.redirect('/user/applications');

  } catch (error) {
    console.error('删除应用失败:', error);
    req.flash('errors', [{ msg: '删除应用失败，请稍后再试' }]);
    res.redirect(`/user/applications/${req.params.clientId}`);
  }
});

module.exports = router;