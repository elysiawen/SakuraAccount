const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Client = require('../models/Client');
const AuthorizationCode = require('../models/AuthorizationCode');
const AccessToken = require('../models/AccessToken');
const RefreshToken = require('../models/RefreshToken');
const IdToken = require('../models/IdToken');
const LoginLog = require('../models/LoginLog');
const { v4: uuidv4 } = require('uuid');
const jwtUtil = require('../utils/jwt');

// 用户认证中间件
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  // 保存原始请求URL，以便登录后重定向回来
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
};

// 客户端验证中间件
const validateClient = async (req, res, next) => {
  // 从所有可能的来源获取client_id
  const client_id = req.query.client_id || req.body.client_id || (req.params && req.params.client_id);
  
  if (!client_id) {
    return res.status(400).json({ error: 'invalid_request', error_description: '缺少client_id参数' });
  }
  
  try {
    const client = await Client.findByClientId(client_id);
    
    if (!client) {
      return res.status(400).json({ error: 'invalid_client', error_description: '无效的客户端' });
    }
    
    if (client.status !== 'active') {
      return res.status(400).json({ error: 'invalid_client', error_description: '客户端已被禁用' });
    }
    
    req.client = client;
    next();
  } catch (error) {
    console.error('客户端验证失败:', error);
    return res.status(500).json({ error: 'server_error', error_description: '服务器内部错误' });
  }
};

// 验证重定向URI
const validateRedirectUri = (req, res, next) => {
  // 从所有可能的来源获取redirect_uri
  const redirect_uri = req.query.redirect_uri || req.body.redirect_uri;
  const client = req.client;
  
  if (!redirect_uri) {
    return res.status(400).json({ error: 'invalid_request', error_description: '缺少redirect_uri参数' });
  }
  
  // 检查重定向URI是否在客户端允许的列表中
  if (!client.redirectUris.includes(redirect_uri)) {
    return res.status(400).json({ error: 'invalid_request', error_description: '重定向URI不被允许' });
  }
  
  next();
};

// 验证响应类型
const validateResponseType = (req, res, next) => {
  // 从所有可能的来源获取response_type
  const response_type = req.query.response_type || req.body.response_type;
  const client = req.client;
  
  if (!response_type) {
    return res.status(400).json({ error: 'invalid_request', error_description: '缺少response_type参数' });
  }
  
  // 检查响应类型是否被客户端允许
  if (!client.allowedResponseTypes.includes(response_type)) {
    return res.status(400).json({ error: 'unsupported_response_type', error_description: '不支持的响应类型' });
  }
  
  next();
};

// 验证授权类型
const validateGrantType = (req, res, next) => {
  const { grant_type } = req.body;
  const client = req.client;
  
  if (!grant_type) {
    return res.status(400).json({ error: 'invalid_request', error_description: '缺少grant_type参数' });
  }
  
  // 检查授权类型是否被客户端允许
  if (!client.allowedGrantTypes.includes(grant_type)) {
    return res.status(400).json({ error: 'unsupported_grant_type', error_description: '不支持的授权类型' });
  }
  
  next();
};

// 验证客户端密钥（用于机密客户端）
const validateClientSecret = (req, res, next) => {
  const { client_secret } = req.body;
  const client = req.client;
  
  // 如果是机密客户端，必须验证客户端密钥
  if (client.isConfidential) {
    if (!client_secret) {
      return res.status(401).json({ error: 'invalid_client', error_description: '缺少client_secret参数' });
    }
    
    if (client_secret !== client.clientSecret) {
      return res.status(401).json({ error: 'invalid_client', error_description: '客户端密钥无效' });
    }
  }
  
  next();
};

// 验证作用域
const validateScope = (req, res, next) => {
  // 从所有可能的来源获取scope
  const scope = req.query.scope || req.body.scope;
  const client = req.client;
  
  // 如果没有提供作用域，使用客户端默认作用域
  if (!scope) {
    req.scope = client.allowedScopes.join(' ');
    return next();
  }
  
  // 解析作用域
  const requestedScopes = scope.split(' ');
  
  // 验证所有请求的作用域是否被允许
  const invalidScopes = requestedScopes.filter(s => !client.allowedScopes.includes(s));
  
  if (invalidScopes.length > 0) {
    return res.status(400).json({ error: 'invalid_scope', error_description: `不支持的作用域: ${invalidScopes.join(', ')}` });
  }
  
  req.scope = scope;
  next();
};

// 授权端点 - 显示授权页面
router.get('/authorize', [
  validateClient,
  validateRedirectUri,
  validateResponseType,
  validateScope
], async (req, res) => {
  const { client_id, redirect_uri, response_type, state } = req.query;
  const scope = req.scope;
  
  // 如果用户未登录，重定向到登录页面
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  
  try {
    // 获取客户端信息
    const client = req.client;
    
    // 渲染授权页面
    res.render('oauth/authorize', {
      title: '授权请求',
      client,
      scope,
      redirect_uri,
      response_type,
      state
    });
  } catch (error) {
    console.error('授权页面渲染失败:', error);
    res.redirect(`${redirect_uri}?error=server_error&error_description=${encodeURIComponent('服务器内部错误')}&state=${state || ''}`);
  }
});

// 处理授权决定
router.post('/authorize/decision', isAuthenticated, [
  validateClient,
  validateRedirectUri,
  validateResponseType,
  validateScope
], async (req, res) => {
  const { client_id, redirect_uri, response_type, state } = req.body;
  const scope = req.scope;
  const approved = req.body.approved === 'true';
  
  // 如果用户拒绝授权
  if (!approved) {
    return res.redirect(`${redirect_uri}?error=access_denied&error_description=${encodeURIComponent('用户拒绝授权')}&state=${state || ''}`);
  }
  
  try {
    const client = req.client;
    const user = await User.findByUserId(req.session.user.userId);
    
    // 根据响应类型处理
    if (response_type === 'code') {
      // 授权码流程
      const authorizationCode = await AuthorizationCode.createCode(
        client.clientId,
        user.userId,
        redirect_uri,
        scope
      );
      
      // 重定向回客户端，带上授权码
      return res.redirect(`${redirect_uri}?code=${authorizationCode.code}&state=${state || ''}`);
    } else if (response_type === 'token') {
      // 隐式授权流程
      const accessToken = await AccessToken.createToken(
        client.clientId,
        user.userId,
        scope
      );
      
      // 重定向回客户端，带上访问令牌
      return res.redirect(`${redirect_uri}#access_token=${accessToken.token}&token_type=Bearer&expires_in=${Math.floor((accessToken.expiresAt - new Date()) / 1000)}&state=${state || ''}`);
    } else if (response_type === 'id_token' || response_type === 'id_token token') {
      // OpenID Connect隐式流程
      let accessToken = null;
      let accessTokenParam = '';
      
      if (response_type === 'id_token token') {
        accessToken = await AccessToken.createToken(
          client.clientId,
          user.userId,
          scope
        );
        
        accessTokenParam = `&access_token=${accessToken.token}&token_type=Bearer&expires_in=${Math.floor((accessToken.expiresAt - new Date()) / 1000)}`;
      }
      
      const idToken = await IdToken.generateToken(
        user,
        client,
        scope.split(' '),
        accessToken ? accessToken.id : null
      );
      
      // 重定向回客户端，带上ID令牌
      return res.redirect(`${redirect_uri}#id_token=${idToken.token}${accessTokenParam}&state=${state || ''}`);
    }
    
    // 不支持的响应类型
    return res.redirect(`${redirect_uri}?error=unsupported_response_type&error_description=${encodeURIComponent('不支持的响应类型')}&state=${state || ''}`);
  } catch (error) {
    console.error('授权处理失败:', error);
    return res.redirect(`${redirect_uri}?error=server_error&error_description=${encodeURIComponent('服务器内部错误')}&state=${state || ''}`);
  }
});

// 令牌端点 - 颁发访问令牌
router.post('/token', [
  validateClient,
  validateClientSecret,
  validateGrantType,
  (req, res, next) => {
    // 对于密码授权类型，如果没有提供scope，使用客户端默认作用域
    if (req.body.grant_type === 'password' && !req.body.scope) {
      req.body.scope = req.client.allowedScopes.join(' ');
    }
    validateScope(req, res, next);
  }
], async (req, res) => {
  const { grant_type, code, redirect_uri, refresh_token } = req.body;
  const client = req.client;
  
  try {
    // 授权码授权类型
    if (grant_type === 'authorization_code') {
      // 验证授权码和重定向URI
      if (!code) {
        return res.status(400).json({ error: 'invalid_request', error_description: '缺少code参数' });
      }
      
      if (!redirect_uri) {
        return res.status(400).json({ error: 'invalid_request', error_description: '缺少redirect_uri参数' });
      }
      
      // 查找授权码
      const authorizationCode = await AuthorizationCode.findByCode(code);
      
      if (!authorizationCode) {
        return res.status(400).json({ error: 'invalid_grant', error_description: '无效的授权码' });
      }
      
      // 验证授权码是否过期或已使用
      if (!authorizationCode.isValid()) {
        return res.status(400).json({ error: 'invalid_grant', error_description: '授权码已过期或已使用' });
      }
      
      // 验证客户端ID和重定向URI
      if (authorizationCode.clientId !== client.clientId) {
        return res.status(400).json({ error: 'invalid_grant', error_description: '授权码不属于该客户端' });
      }
      
      if (authorizationCode.redirectUri !== redirect_uri) {
        return res.status(400).json({ error: 'invalid_grant', error_description: '重定向URI与授权时不匹配' });
      }
      
      // 标记授权码为已使用
      await authorizationCode.markAsUsed();
      
      // 创建访问令牌
      const accessToken = await AccessToken.createToken(
        client.clientId,
        authorizationCode.userId,
        authorizationCode.scope
      );
      
      // 创建刷新令牌
      const refreshToken = await RefreshToken.createToken(
        accessToken.id,
        client.clientId,
        authorizationCode.userId
      );
      
      // 如果请求的作用域包含openid，则生成ID令牌
      let idToken = null;
      if (authorizationCode.scope.includes('openid')) {
        const user = await User.findByUserId(authorizationCode.userId);
        idToken = await IdToken.generateToken(
          user,
          client,
          authorizationCode.scope,
          accessToken.id
        );
      }
      
      // 返回令牌响应
      const response = {
        access_token: accessToken.token,
        token_type: 'Bearer',
        expires_in: Math.floor((accessToken.expiresAt - new Date()) / 1000),
        refresh_token: refreshToken.token,
        scope: authorizationCode.scope
      };
      
      // 如果有ID令牌，添加到响应中
      if (idToken) {
        response.id_token = idToken.token;
      }
      
      return res.json(response);
    }
    // 刷新令牌授权类型
    else if (grant_type === 'refresh_token') {
      // 验证刷新令牌
      if (!refresh_token) {
        return res.status(400).json({ error: 'invalid_request', error_description: '缺少refresh_token参数' });
      }
      
      // 查找刷新令牌
      const refreshTokenObj = await RefreshToken.findByToken(refresh_token);
      
      if (!refreshTokenObj) {
        return res.status(400).json({ error: 'invalid_grant', error_description: '无效的刷新令牌' });
      }
      
      // 验证刷新令牌是否有效
      if (!refreshTokenObj.isValid()) {
        return res.status(400).json({ error: 'invalid_grant', error_description: '刷新令牌已过期或已撤销' });
      }
      
      // 验证客户端ID
      if (refreshTokenObj.clientId !== client.clientId) {
        return res.status(400).json({ error: 'invalid_grant', error_description: '刷新令牌不属于该客户端' });
      }
      
      // 获取原访问令牌
      const oldAccessToken = await AccessToken.findOne({ where: { id: refreshTokenObj.accessTokenId } });
      
      // 撤销原访问令牌
      if (oldAccessToken) {
        await oldAccessToken.revoke();
      }
      
      // 撤销原刷新令牌
      await refreshTokenObj.revoke();
      
      // 创建新的访问令牌
      const accessToken = await AccessToken.createToken(
        client.clientId,
        refreshTokenObj.userId,
        oldAccessToken ? oldAccessToken.scope : ''
      );
      
      // 创建新的刷新令牌
      const newRefreshToken = await RefreshToken.createToken(
        accessToken.id,
        client.clientId,
        refreshTokenObj.userId
      );
      
      // 返回令牌响应
      return res.json({
        access_token: accessToken.token,
        token_type: 'Bearer',
        expires_in: Math.floor((accessToken.expiresAt - new Date()) / 1000),
        refresh_token: newRefreshToken.token,
        scope: oldAccessToken ? oldAccessToken.scope : ''
      });
    }
    // 客户端凭证授权类型
    else if (grant_type === 'client_credentials') {
      // 只有机密客户端才能使用客户端凭证授权类型
      if (!client.isConfidential) {
        return res.status(400).json({ error: 'unauthorized_client', error_description: '非机密客户端不能使用客户端凭证授权类型' });
      }
      
      // 创建访问令牌（不关联用户）
      const accessToken = await AccessToken.createToken(
        client.clientId,
        client.createdBy, // 使用客户端创建者作为用户ID
        req.scope || ''
      );
      
      // 返回令牌响应
      return res.json({
        access_token: accessToken.token,
        token_type: 'Bearer',
        expires_in: Math.floor((accessToken.expiresAt - new Date()) / 1000),
        scope: req.scope || ''
      });
    }
    // 密码授权类型
    else if (grant_type === 'password') {
      const { username, password } = req.body;
      
      // 验证用户名和密码
      if (!username || !password) {
        return res.status(400).json({ error: 'invalid_request', error_description: '缺少username或password参数' });
      }
      
      // 查找用户
      const user = await User.findByUsername(username);
      
      if (!user) {
        return res.status(400).json({ error: 'invalid_grant', error_description: '用户名或密码错误' });
      }
      
      // 验证密码
      const isValidPassword = await user.validatePassword(password);
      
      if (!isValidPassword) {
        return res.status(400).json({ error: 'invalid_grant', error_description: '用户名或密码错误' });
      }
      
      // 验证用户状态
      if (user.status !== 'active') {
        return res.status(400).json({ error: 'invalid_grant', error_description: '用户账号未激活或已被禁用' });
      }
      
      // 创建访问令牌
      const accessToken = await AccessToken.createToken(
        client.clientId,
        user.userId,
        req.scope || ''
      );
      
      // 创建刷新令牌
      const refreshToken = await RefreshToken.createToken(
        accessToken.id,
        client.clientId,
        user.userId
      );
      
      // 如果请求的作用域包含openid，则生成ID令牌
      let idToken = null;
      if (req.scope && req.scope.includes('openid')) {
        idToken = await IdToken.generateToken(
          user,
          client,
          req.scope.split(' '),
          accessToken.id
        );
      }
      
      // 返回令牌响应
      const response = {
        access_token: accessToken.token,
        token_type: 'Bearer',
        expires_in: Math.floor((accessToken.expiresAt - new Date()) / 1000),
        refresh_token: refreshToken.token,
        scope: req.scope || ''
      };
      
      // 如果有ID令牌，添加到响应中
      if (idToken) {
        response.id_token = idToken.token;
      }
      
      return res.json(response);
    }
    
    // 不支持的授权类型
    return res.status(400).json({ error: 'unsupported_grant_type', error_description: '不支持的授权类型' });
  } catch (error) {
    console.error('令牌颁发失败:', error);
    return res.status(500).json({ error: 'server_error', error_description: '服务器内部错误' });
  }
});

// 令牌信息端点 - 获取令牌信息
router.get('/token/info', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token', error_description: '缺少访问令牌' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // 查找访问令牌
    const accessToken = await AccessToken.findByToken(token);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'invalid_token', error_description: '无效的访问令牌' });
    }
    
    // 验证访问令牌是否有效
    if (!accessToken.isValid()) {
      return res.status(401).json({ error: 'invalid_token', error_description: '访问令牌已过期或已撤销' });
    }
    
    // 获取用户和客户端信息
    const user = await User.findByUserId(accessToken.userId);
    const client = await Client.findByClientId(accessToken.clientId);
    
    // 返回令牌信息
    return res.json({
      active: true,
      scope: accessToken.scope,
      client_id: client.clientId,
      username: user.username,
      exp: Math.floor(accessToken.expiresAt.getTime() / 1000),
      sub: user.userId,
      iss: process.env.OPENID_ISSUER || 'http://127.0.0.1:3000',
      token_type: 'Bearer'
    });
  } catch (error) {
    console.error('获取令牌信息失败:', error);
    return res.status(500).json({ error: 'server_error', error_description: '服务器内部错误' });
  }
});

// 用户信息端点 - 获取用户信息（OpenID Connect）
router.get('/userinfo', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token', error_description: '缺少访问令牌' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // 查找访问令牌
    const accessToken = await AccessToken.findByToken(token);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'invalid_token', error_description: '无效的访问令牌' });
    }
    
    // 验证访问令牌是否有效
    if (!accessToken.isValid()) {
      return res.status(401).json({ error: 'invalid_token', error_description: '访问令牌已过期或已撤销' });
    }
    
    // 验证作用域是否包含profile或email
    const scopes = accessToken.scope.split(' ');
    if (!scopes.includes('profile') && !scopes.includes('email') && !scopes.includes('openid')) {
      return res.status(403).json({ error: 'insufficient_scope', error_description: '访问令牌没有足够的权限' });
    }
    
    // 获取用户信息
    const user = await User.findByUserId(accessToken.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'invalid_token', error_description: '找不到用户信息' });
    }
    
    // 构建用户信息响应
    const userInfo = {
      sub: user.userId
    };
    
    // 根据作用域添加用户信息
    if (scopes.includes('profile')) {
      userInfo.name = user.nickname;
      userInfo.preferred_username = user.username;
      userInfo.picture = user.avatarUrl;
      userInfo.updated_at = Math.floor(user.updatedAt.getTime() / 1000);
    }
    
    if (scopes.includes('email')) {
      userInfo.email = user.email;
      userInfo.email_verified = true; // 假设邮箱已验证，实际应根据用户邮箱验证状态设置
    }
    
    return res.json(userInfo);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return res.status(500).json({ error: 'server_error', error_description: '服务器内部错误' });
  }
});

// 令牌撤销端点 - 撤销访问令牌或刷新令牌
router.post('/token/revoke', [
  validateClient,
  validateClientSecret
], async (req, res) => {
  const { token, token_type_hint } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'invalid_request', error_description: '缺少token参数' });
  }
  
  try {
    // 根据token_type_hint查找令牌
    let accessToken = null;
    let refreshToken = null;
    
    if (token_type_hint === 'refresh_token') {
      refreshToken = await RefreshToken.findByToken(token);
    } else if (token_type_hint === 'access_token') {
      accessToken = await AccessToken.findByToken(token);
    } else {
      // 如果没有提示或提示无效，尝试两种类型
      accessToken = await AccessToken.findByToken(token);
      if (!accessToken) {
        refreshToken = await RefreshToken.findByToken(token);
      }
    }
    
    // 撤销找到的令牌
    if (accessToken) {
      // 验证客户端ID
      if (accessToken.clientId !== req.client.clientId) {
        // 按照OAuth2规范，即使令牌不属于该客户端，也返回成功
        return res.status(200).send();
      }
      
      await accessToken.revoke();
      
      // 同时撤销关联的刷新令牌
      const relatedRefreshTokens = await RefreshToken.findAll({
        where: { accessTokenId: accessToken.id }
      });
      
      for (const rt of relatedRefreshTokens) {
        await rt.revoke();
      }
    } else if (refreshToken) {
      // 验证客户端ID
      if (refreshToken.clientId !== req.client.clientId) {
        // 按照OAuth2规范，即使令牌不属于该客户端，也返回成功
        return res.status(200).send();
      }
      
      await refreshToken.revoke();
      
      // 同时撤销关联的访问令牌
      const accessToken = await AccessToken.findOne({
        where: { id: refreshToken.accessTokenId }
      });
      
      if (accessToken) {
        await accessToken.revoke();
      }
    }
    
    // 无论是否找到令牌，都返回成功
    return res.status(200).send();
  } catch (error) {
    console.error('令牌撤销失败:', error);
    return res.status(500).json({ error: 'server_error', error_description: '服务器内部错误' });
  }
});

// OpenID Connect发现文档端点
router.get('/.well-known/openid-configuration', (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const issuer = process.env.OPENID_ISSUER || baseUrl;
  
  // 返回OpenID Connect发现文档
  res.json({
    issuer,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
    jwks_uri: `${baseUrl}/oauth/.well-known/jwks.json`,
    token_endpoint_auth_methods_supported: [
      'client_secret_basic',
      'client_secret_post'
    ],
    response_types_supported: [
      'code',
      'token',
      'id_token',
      'id_token token'
    ],
    grant_types_supported: [
      'authorization_code',
      'refresh_token',
      'client_credentials',
      'password'
    ],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: [jwtUtil.getAlgorithm()],
    scopes_supported: ['openid', 'profile', 'email'],
    token_endpoint_auth_signing_alg_values_supported: [jwtUtil.getAlgorithm()],
    claims_supported: [
      'sub',
      'iss',
      'name',
      'preferred_username',
      'email',
      'email_verified',
      'picture',
      'updated_at'
    ]
  });
});

module.exports = router;