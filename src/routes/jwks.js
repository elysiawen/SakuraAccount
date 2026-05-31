const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { exportJWK } = require('jose');
const jwtUtil = require('../utils/jwt');

router.get('/.well-known/jwks.json', async (req, res) => {
  try {
    const alg = jwtUtil.getAlgorithm();
    if (alg !== 'RS256') {
      return res.json({ keys: [] });
    }
    const { publicKey } = jwtUtil.getKeyPair();
    const keyObj = crypto.createPublicKey(publicKey);
    const jwk = await exportJWK(keyObj);
    jwk.kid = jwtUtil.getKid();
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    return res.json({ keys: [jwk] });
  } catch (error) {
    console.error('JWKS生成失败:', error);
    return res.status(500).json({ error: 'server_error', error_description: '服务器内部错误' });
  }
});

module.exports = router;