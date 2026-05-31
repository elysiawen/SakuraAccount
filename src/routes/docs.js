const express = require('express');
const router = express.Router();

// API文档页面
router.get('/api', (req, res) => {
  // 获取基础URL
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

  res.render('docs/api', {
    title: 'API文档',
    baseUrl
  });
});

module.exports = router;