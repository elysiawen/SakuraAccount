const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const getClientIp = require('../utils/getClientIp');

// 注册页面
router.get('/register', (req, res) => {
  // 如果用户已登录，重定向到用户仪表板
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
  }
  res.render('auth/register', {
    title: '注册账号',
    errors: []
  });
});

// 处理注册请求
router.post('/register', [
  // 验证输入
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('用户名只能包含字母、数字和下划线')
    .custom(async value => {
      const user = await User.findByUsername(value);
      if (user) {
        throw new Error('该用户名已被使用');
      }
      return true;
    }),
  body('email')
    .trim()
    .isEmail().withMessage('请输入有效的电子邮件地址')
    .custom(async value => {
      const user = await User.findByEmail(value);
      if (user) {
        throw new Error('该电子邮件已被注册');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 }).withMessage('密码长度至少为6个字符')
    .matches(/\d/).withMessage('密码必须包含至少一个数字'),
  body('password2').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('两次输入的密码不一致');
    }
    return true;
  }),
  body('nickname')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('昵称长度必须在1-50个字符之间')
], async (req, res) => {
  // 验证结果
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: '注册账号',
      errors: errors.array(),
      user: req.body
    });
  }

  try {
    // 创建新用户
    const { username, email, password, nickname } = req.body;
    const user = await User.create({
      username,
      email,
      password,
      nickname: nickname || username
    });

    req.flash('success_msg', '注册成功，请登录');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('注册失败:', error);
    req.flash('error_msg', '注册失败，请稍后再试');
    res.render('auth/register', {
      title: '注册账号',
      errors: [{ msg: '注册过程中发生错误' }],
      user: req.body
    });
  }
});

// 登录页面
router.get('/login', (req, res) => {
  // 如果用户已登录，重定向到用户仪表板
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
  }
  res.render('auth/login', {
    title: '用户登录',
    errors: []
  });
});

// 处理登录请求
router.post('/login', [
  // 验证输入
  body('username').trim().notEmpty().withMessage('请输入用户名'),
  body('password').notEmpty().withMessage('请输入密码'),
  body('rememberMe').toBoolean()
], async (req, res) => {
  // 验证结果
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      title: '用户登录',
      errors: errors.array(),
      user: { username: req.body.username }
    });
  }

  try {
    // 查找用户
    const { username, password } = req.body;
    const user = await User.findByUsername(username);

    // 用户不存在或密码错误
    if (!user || !(await user.validatePassword(password))) {
      // 记录失败登录
      if (user) {
        await LoginLog.recordLogin(
          user.userId,
          getClientIp(req),
          req.headers['user-agent'],
          'failed',
          '密码错误'
        );
      }

      return res.render('auth/login', {
        title: '用户登录',
        errors: [{ msg: '用户名或密码错误' }]
      });
    }

    // 检查账号状态
    if (user.status !== 'active') {
      await LoginLog.recordLogin(
        user.userId,
        getClientIp(req),
        req.headers['user-agent'],
        'failed',
        `账号状态: ${user.status}`
      );

      return res.render('auth/login', {
        title: '用户登录',
        errors: [{ msg: '账号已被禁用或未激活' }]
      });
    }

    // 登录成功，更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 记录成功登录
    await LoginLog.recordLogin(
      user.userId,
      getClientIp(req),
      req.headers['user-agent'],
      'success'
    );

    // 保存用户信息到会话
    req.session.user = {
      userId: user.userId,
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role
    };

    // 如果选择了30天免登录，设置cookie
    if (req.body.rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    }

    // 获取returnTo地址或根据用户角色重定向到不同页面
    const returnTo = req.session.returnTo || (user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (error) {
    console.error('登录失败:', error);
    res.render('auth/login', {
      title: '用户登录',
      errors: [{ msg: '登录过程中发生错误' }]
    });
  }
});

// 登出
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('登出失败:', err);
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;