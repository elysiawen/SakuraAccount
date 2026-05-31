const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const LoginLog = require('../models/LoginLog');
const { Op } = require('sequelize');

// 管理员认证中间件
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', '需要管理员权限');
  res.redirect('/auth/login');
};

// 管理员仪表盘
router.get('/dashboard', isAdmin, async (req, res) => {
  try {
    // 获取系统统计信息
    const userCount = await User.count();
    const adminCount = await User.count({ where: { role: 'admin' } });
    const activeUserCount = await User.count({ where: { status: 'active' } });
    const inactiveUserCount = await User.count({ where: { status: 'inactive' } });
    const bannedUserCount = await User.count({ where: { status: 'banned' } });
    
    // 获取最近注册的用户
    const recentUsers = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // 获取最近的登录记录
    const recentLogins = await LoginLog.findAll({
      order: [['loginAt', 'DESC']],
      limit: 10,
      include: [{
        model: User,
        as: 'user',
        attributes: ['username', 'nickname', 'role']
      }]
    });
    
    res.render('admin/dashboard', {
      title: '管理员控制台',
      stats: {
        userCount,
        adminCount,
        activeUserCount,
        inactiveUserCount,
        bannedUserCount
      },
      recentUsers,
      recentLogins
    });
  } catch (error) {
    console.error('获取管理员仪表盘数据失败:', error);
    req.flash('error_msg', '获取数据失败');
    res.redirect('/');
  }
});

// 用户管理页面
router.get('/users', isAdmin, async (req, res) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // 搜索参数
    const search = req.query.search || '';
    const status = req.query.status || '';
    const role = req.query.role || '';
    
    // 构建查询条件
    const where = {};
    if (search) {
      where[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { nickname: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) {
      where.status = status;
    }
    if (role) {
      where.role = role;
    }
    
    // 查询用户列表
    const { count, rows: users } = await User.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    // 计算总页数
    const totalPages = Math.ceil(count / limit);
    
    res.render('admin/users', {
      title: '用户管理',
      users,
      currentPage: page,
      totalPages,
      totalUsers: count,
      search,
      status,
      role,
      limit
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    req.flash('error_msg', '获取用户列表失败');
    res.redirect('/admin/dashboard');
  }
});

// 查看用户详情
router.get('/users/:userId', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 获取用户信息
    const user = await User.findByUserId(userId);
    if (!user) {
      req.flash('error_msg', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    // 获取用户的登录历史
    const loginHistory = await LoginLog.getUserLoginHistory(userId, 20);
    
    res.render('admin/user-detail', {
      title: `用户详情 - ${user.username}`,
      targetUser: user,
      user: req.session.user,
      loginHistory
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    req.flash('error_msg', '获取用户详情失败');
    res.redirect('/admin/users');
  }
});

// 编辑用户页面
router.get('/users/:userId/edit', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 获取用户信息
    const user = await User.findByUserId(userId);
    if (!user) {
      req.flash('error_msg', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    res.render('admin/edit-user', {
      title: `编辑用户 - ${user.username}`,
      targetUser: user,
      user: req.session.user,
      errors: []
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    req.flash('error_msg', '获取用户信息失败');
    res.redirect('/admin/users');
  }
});

// 处理编辑用户请求
router.post('/users/:userId/edit', [
  isAdmin,
  body('nickname')
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('昵称长度必须在1-50个字符之间'),
  body('email')
    .trim()
    .isEmail().withMessage('请输入有效的电子邮件地址')
    .custom(async (value, { req }) => {
      const user = await User.findByEmail(value);
      if (user && user.userId !== req.params.userId) {
        throw new Error('该电子邮件已被其他账号使用');
      }
      return true;
    }),
  body('role').isIn(['admin', 'user']).withMessage('无效的用户角色'),
  body('status').isIn(['active', 'inactive', 'banned']).withMessage('无效的账号状态')
], async (req, res) => {
  const { userId } = req.params;
  
  // 验证结果
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin/edit-user', {
      title: '编辑用户',
      user: { ...req.body, userId },
      errors: errors.array()
    });
  }
  
  try {
    // 获取用户
    const user = await User.findByUserId(userId);
    if (!user) {
      req.flash('error_msg', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    // 更新用户信息
    user.nickname = req.body.nickname;
    user.email = req.body.email;
    user.role = req.body.role;
    user.status = req.body.status;
    
    // 如果提供了新密码，则更新密码
    if (req.body.password && req.body.password.trim() !== '') {
      user.password = req.body.password;
    }
    
    await user.save();
    
    req.flash('success_msg', '用户信息已更新');
    res.redirect(`/admin/users/${userId}`);
  } catch (error) {
    console.error('更新用户信息失败:', error);
    req.flash('error_msg', '更新用户信息失败');
    res.redirect(`/admin/users/${userId}/edit`);
  }
});

// 删除用户
router.post('/users/:userId/delete', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 不允许删除自己的账号
    if (userId === req.session.user.userId) {
      req.flash('error_msg', '不能删除当前登录的账号');
      return res.redirect('/admin/users');
    }
    
    // 获取用户
    const user = await User.findByUserId(userId);
    if (!user) {
      req.flash('error_msg', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    // 删除用户
    await user.destroy();
    
    req.flash('success_msg', `用户 ${user.username} 已被删除`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('删除用户失败:', error);
    req.flash('error_msg', '删除用户失败');
    res.redirect('/admin/users');
  }
});

// 禁用用户
router.get('/users/:userId/ban', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 不允许禁用自己的账号
    if (userId === req.session.user.userId) {
      req.flash('error_msg', '不能禁用当前登录的账号');
      return res.redirect('/admin/users');
    }
    
    // 获取用户
    const user = await User.findByUserId(userId);
    if (!user) {
      req.flash('error_msg', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    // 更新用户状态为禁用
    user.status = 'banned';
    await user.save();
    
    req.flash('success_msg', `用户 ${user.username} 已被禁用`);
    res.redirect(`/admin/users/${userId}`);
  } catch (error) {
    console.error('禁用用户失败:', error);
    req.flash('error_msg', '禁用用户失败');
    res.redirect(`/admin/users/${userId}`);
  }
});

// 激活用户
router.get('/users/:userId/activate', isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 获取用户
    const user = await User.findByUserId(userId);
    if (!user) {
      req.flash('error_msg', '用户不存在');
      return res.redirect('/admin/users');
    }
    
    // 更新用户状态为激活
    user.status = 'active';
    await user.save();
    
    req.flash('success_msg', `用户 ${user.username} 已被激活`);
    res.redirect(`/admin/users/${userId}`);
  } catch (error) {
    console.error('激活用户失败:', error);
    req.flash('error_msg', '激活用户失败');
    res.redirect(`/admin/users/${userId}`);
  }
});

// 系统日志页面
router.get('/logs', isAdmin, async (req, res) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // 搜索参数
    const username = req.query.username || '';
    const status = req.query.status || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    
    // 构建查询条件
    const where = {};
    if (status) {
      where.status = status;
    }
    
    // 日期范围
    if (startDate && endDate) {
      where.loginAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.loginAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      where.loginAt = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // 用户名搜索需要关联User表
    let include = [];
    if (username) {
      include = [{
        model: User,
        as: 'user',
        where: {
          username: { [Op.like]: `%${username}%` }
        },
        attributes: ['username', 'nickname', 'role']
      }];
    } else {
      include = [{
        model: User,
        as: 'user',
        attributes: ['username', 'nickname', 'role']
      }];
    }
    
    // 查询登录日志
    const { count, rows: logs } = await LoginLog.findAndCountAll({
      where,
      include,
      order: [['loginAt', 'DESC']],
      limit,
      offset
    });
    
    // 计算总页数
    const totalPages = Math.ceil(count / limit);
    
    res.render('admin/logs', {
      title: '系统日志',
      logs,
      currentPage: page,
      totalPages,
      totalLogs: count,
      username,
      status,
      startDate,
      endDate,
      limit
    });
  } catch (error) {
    console.error('获取系统日志失败:', error);
    req.flash('error_msg', '获取系统日志失败');
    res.redirect('/admin/dashboard');
  }
});

// 系统设置页面
router.get('/settings', isAdmin, (req, res) => {
  res.render('admin/settings', {
    title: '系统设置',
    settings: {
      siteName: process.env.SITE_NAME || 'Sakura Network账号中心',
      siteDescription: process.env.SITE_DESCRIPTION || '用户账号管理系统',
      allowRegistration: process.env.ALLOW_REGISTRATION !== 'false',
      maxUploadSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880
    },
    errors: []
  });
});

// 处理系统设置更新
router.post('/settings', [
  isAdmin,
  body('siteName').trim().notEmpty().withMessage('网站名称不能为空'),
  body('siteDescription').trim().notEmpty().withMessage('网站描述不能为空'),
  body('maxUploadSize').isInt({ min: 1 }).withMessage('最大上传大小必须是正整数')
], (req, res) => {
  // 验证结果
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin/settings', {
      title: '系统设置',
      settings: req.body,
      errors: errors.array()
    });
  }
  
  // 这里应该更新环境变量或配置文件
  // 由于直接修改.env文件可能不是最佳实践，这里只是模拟更新
  req.flash('success_msg', '系统设置已更新（注意：在实际应用中，这些设置应该被保存到配置文件或数据库中）');
  res.redirect('/admin/settings');
});

module.exports = router;