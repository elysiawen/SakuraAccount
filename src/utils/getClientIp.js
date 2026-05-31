/**
 * 获取客户端真实IP地址
 * 优先从代理服务器转发的header中获取
 * @param {Object} req - Express请求对象
 * @returns {string} 客户端IP地址
 */
function getClientIp(req) {
  // 从X-Forwarded-For获取IP地址
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // 获取第一个IP（最原始的客户端IP）
    return forwardedFor.split(',')[0].trim();
  }

  // 从X-Real-IP获取
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp.trim();
  }

  // 如果都没有，则使用直连IP
  return req.ip;
}

module.exports = getClientIp;