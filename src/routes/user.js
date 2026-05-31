const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const path = require('path');
const fs = require('fs');

// 用户认证中间件
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', '请先登录');
  res.redirect('/auth/login');
};

// 用户仪表盘/个人中心
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // 获取完整的用户信息
    const user = await User.findByUserId(req.session.user.userId);
    
    // 获取最近的登录记录
    const loginHistory = await LoginLog.getUserLoginHistory(user.userId, 5);
    
    res.render('user/dashboard', {
      title: '个人中心',
      user,
      loginHistory
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    req.flash('error_msg', '获取用户信息失败');
    res.redirect('/');
  }
});

// 个人资料页面
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findByUserId(req.session.user.userId);
    
    res.render('user/profile', {
      title: '个人资料',
      user,
      errors: []
    });
  } catch (error) {
    console.error('获取用户资料失败:', error);
    req.flash('error_msg', '获取用户资料失败');
    res.redirect('/user/dashboard');
  }
});

// 更新个人资料
router.post('/profile', [
  isAuthenticated,
  body('nickname')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('昵称长度必须在1-50个字符之间'),
  body('email')
    .trim()
    .isEmail().withMessage('请输入有效的电子邮件地址')
    .custom(async (value, { req }) => {
      const user = await User.findByEmail(value);
      if (user && user.userId !== req.session.user.userId) {
        throw new Error('该电子邮件已被其他账号使用');
      }
      return true;
    })
], async (req, res) => {
  // 验证结果
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('user/profile', {
      title: '个人资料',
      user: { ...req.session.user, ...req.body },
      errors: errors.array()
    });
  }

  try {
    // 获取用户
    const user = await User.findByUserId(req.session.user.userId);
    
    // 更新用户信息
    user.nickname = req.body.nickname;
    user.email = req.body.email;
    
    await user.save();
    
    // 更新会话中的用户信息
    req.session.user.nickname = user.nickname;
    req.session.user.email = user.email;
    
    req.flash('success_msg', '个人资料已更新');
    res.redirect('/user/profile');
  } catch (error) {
    console.error('更新个人资料失败:', error);
    req.flash('error_msg', '更新个人资料失败');
    res.redirect('/user/profile');
  }
});

// 修改密码页面
router.get('/change-password', isAuthenticated, (req, res) => {
  res.render('user/change-password', {
    title: '修改密码',
    errors: []
  });
});

// 处理修改密码请求
router.post('/change-password', [
  isAuthenticated,
  body('currentPassword').notEmpty().withMessage('请输入当前密码'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('新密码长度至少为6个字符')
    .matches(/\d/).withMessage('新密码必须包含至少一个数字'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('两次输入的新密码不一致');
    }
    return true;
  })
], async (req, res) => {
  // 验证结果
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('user/change-password', {
      title: '修改密码',
      errors: errors.array()
    });
  }

  try {
    // 获取用户
    const user = await User.findByUserId(req.session.user.userId);
    
    // 验证当前密码
    const isMatch = await user.validatePassword(req.body.currentPassword);
    if (!isMatch) {
      return res.render('user/change-password', {
        title: '修改密码',
        errors: [{ msg: '当前密码不正确' }]
      });
    }
    
    // 更新密码
    user.password = req.body.newPassword;
    await user.save();
    
    req.flash('success_msg', '密码已成功修改');
    res.redirect('/user/dashboard');
  } catch (error) {
    console.error('修改密码失败:', error);
    req.flash('error_msg', '修改密码失败');
    res.redirect('/user/change-password');
  }
});

// 上传头像页面
router.get('/avatar', isAuthenticated, (req, res) => {
  res.render('user/avatar', {
    title: '更换头像',
    errors: []
  });
});

// 处理头像上传
router.post('/avatar', isAuthenticated, async (req, res) => {
  try {
    // 使用app.locals中的upload中间件
    req.app.locals.upload.single('avatar')(req, res, async (err) => {
      if (err) {
        req.flash('error_msg', `上传失败: ${err.message}`);
        return res.redirect('/user/avatar');
      }
      
      if (!req.file) {
        req.flash('error_msg', '请选择要上传的图片');
        return res.redirect('/user/avatar');
      }
      
      // 获取用户
      const user = await User.findByUserId(req.session.user.userId);
      
      // 如果用户已有自定义头像，删除旧头像文件
      if (user.avatarUrl && !user.avatarUrl.includes('default-avatar') && fs.existsSync(path.join(__dirname, '../../', user.avatarUrl))) {
        fs.unlinkSync(path.join(__dirname, '../../', user.avatarUrl));
      }
      
      // 更新头像URL
      const avatarUrl = `/public/uploads/avatar/${req.file.filename}`;
      user.avatarUrl = avatarUrl;
      await user.save();
      
      // 更新会话中的头像URL
      req.session.user.avatarUrl = avatarUrl;
      
      req.flash('success_msg', '头像已成功更新');
      res.redirect('/user/profile');
    });
  } catch (error) {
    console.error('上传头像失败:', error);
    req.flash('error_msg', '上传头像失败');
    res.redirect('/user/avatar');
  }
});

// 查看登录历史
router.get('/login-history', isAuthenticated, async (req, res) => {
  try {
    // 获取用户的登录历史
    const loginHistory = await LoginLog.getUserLoginHistory(req.session.user.userId, 20);
    
    res.render('user/login-history', {
      title: '登录历史',
      loginHistory
    });
  } catch (error) {
    console.error('获取登录历史失败:', error);
    req.flash('error_msg', '获取登录历史失败');
    res.redirect('/user/dashboard');
  }
});

module.exports = router;