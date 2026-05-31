
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');

// 加载环境变量
dotenv.config();

// 数据库连接
const { testConnection } = require('./config/database');
const { initDatabase } = require('./scripts/init-db');

// 创建Express应用
const app = express();


// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 中间件设置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置网站图标
app.use('/favicon.ico', express.static(path.join(__dirname, '../public/images/favicon.ico'), {
  maxAge: '7d',
  etag: true,
  lastModified: true
}));

// 配置静态文件服务
app.use('/public', express.static('./public', {
  maxAge: '7d', // 设置缓存时间为7天
  etag: true, // 启用ETag
  lastModified: true // 启用Last-Modified
}));

// 确保上传目录存在
const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
const absoluteUploadPath = path.join(process.cwd(), uploadDir);
fs.mkdirSync(absoluteUploadPath, { recursive: true });

// 配置上传目录的静态文件服务
app.use('/public/uploads', express.static(absoluteUploadPath, {
  maxAge: '7d', // 设置缓存时间为7天
  etag: true, // 启用ETag
  lastModified: true // 启用Last-Modified
}));

// 会话设置
app.use(session({
  secret: process.env.SESSION_SECRET || 'sakura_network_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// 使用flash消息
app.use(flash());

// 全局变量中间件
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// 文件上传配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
    let subDir = '';
    
    // 根据文件类型确定子目录
    if (file.fieldname === 'avatar') {
      subDir = 'avatar';
    } else if (file.fieldname === 'logo') {
      subDir = 'app-logos';
    }
    
    // 构建完整的上传路径
    const fullPath = path.join(process.cwd(), uploadDir, subDir);
    
    // 确保目录存在
    fs.mkdirSync(fullPath, { recursive: true });
    
    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 默认5MB
  }
});

// 导出upload中间件供路由使用
app.locals.upload = upload;

// 路由设置
app.use('/auth', require('./routes/auth'));
app.use('/user', require('./routes/user'));
app.use('/docs', require('./routes/docs'));
app.use('/admin', require('./routes/admin'));
app.use('/oauth', require('./routes/oauth'));
app.use('/oauth', require('./routes/jwks'));
app.use('/user/applications', require('./routes/application'));

// 首页路由
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Sakura Network账号中心'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - 页面未找到',
    message: '您请求的页面不存在'
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: '500 - 服务器错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

// 初始化函数
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('无法连接到数据库，服务器启动失败');
      process.exit(1);
    }
    
    // 初始化数据库
    await initDatabase();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

module.exports = app;
