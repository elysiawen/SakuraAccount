const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let cached = {
  secret: null,
  privateKey: null,
  publicKey: null,
  kid: null
};

function getAlgorithm() {
  const alg = process.env.JWT_ALG || 'HS256';
  return alg === 'RS256' ? 'RS256' : 'HS256';
}

function getSecret() {
  if (!cached.secret) {
    cached.secret = process.env.JWT_SECRET || 'sakura_network_jwt_secret_key';
  }
  return cached.secret;
}

function getKeyPair() {
  if (!cached.privateKey || !cached.publicKey) {
    const privateKeyPath = process.env.PRIVATE_KEY_PATH || path.join(__dirname, '../keys/private_key.pem');
    const publicKeyPath = process.env.PUBLIC_KEY_PATH || path.join(__dirname, '../keys/public_key.pem');
    cached.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    cached.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
  }
  return { privateKey: cached.privateKey, publicKey: cached.publicKey };
}

function getKid() {
  if (cached.kid) return cached.kid;
  const envKid = process.env.JWT_KID;
  if (envKid) {
    cached.kid = envKid;
    return cached.kid;
  }
  // 计算kid：对公钥PEM做sha256，截取前16位作为kid
  const { publicKey } = getKeyPair();
  cached.kid = crypto.createHash('sha256').update(publicKey).digest('hex').slice(0, 16);
  return cached.kid;
}

function sign(payload, options = {}) {
  const alg = getAlgorithm();
  if (alg === 'HS256') {
    const secret = getSecret();
    return jwt.sign(payload, secret, { algorithm: 'HS256', ...options });
  } else {
    const { privateKey } = getKeyPair();
    const header = { kid: getKid() };
    return jwt.sign(payload, privateKey, { algorithm: 'RS256', header, ...options });
  }
}

function verify(token, options = {}) {
  const alg = getAlgorithm();
  if (alg === 'HS256') {
    const secret = getSecret();
    return jwt.verify(token, secret, { algorithms: ['HS256'], ...options });
  } else {
    const { publicKey } = getKeyPair();
    return jwt.verify(token, publicKey, { algorithms: ['RS256'], ...options });
  }
}

module.exports = {
  sign,
  verify,
  getAlgorithm,
  getKid,
  getKeyPair
};