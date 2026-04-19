const crypto = require('crypto');

// 加密算法配置
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 位
const TAG_LENGTH = 16; // 128 位
const KEY_LENGTH = 32; // 256 位

/**
 * 生成加密密钥
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * 生成密钥（基于密码）
 */
function generateKeyFromPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16);
  }
  const key = crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
  return {
    key,
    salt
  };
}

/**
 * 加密数据
 */
function encrypt(data, key) {
  try {
    // 生成随机 IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // 创建加密器
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 加密数据
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 获取认证标签
    const tag = cipher.getAuthTag();

    // 返回 IV、加密数据和标签
    return {
      iv: iv.toString('hex'),
      data: encrypted,
      tag: tag.toString('hex')
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * 解密数据
 */
function decrypt(encryptedData, key) {
  try {
    // 解析加密数据
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const encrypted = Buffer.from(encryptedData.data, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');

    // 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // 设置认证标签
    decipher.setAuthTag(tag);

    // 解密数据
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // 解析 JSON 数据
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * 哈希数据（用于密码存储等）
 */
function hash(data, salt = null) {
  try {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    return {
      hash,
      salt
    };
  } catch (error) {
    console.error('Hashing failed:', error);
    throw new Error('Failed to hash data');
  }
}

/**
 * 验证哈希数据
 */
function verifyHash(data, hash, salt) {
  try {
    const hashed = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    return hashed === hash;
  } catch (error) {
    console.error('Hash verification failed:', error);
    return false;
  }
}

/**
 * 生成随机字符串
 */
function randomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 生成 UUID
 */
function generateUUID() {
  return crypto.randomUUID();
}

module.exports = {
  generateKey,
  generateKeyFromPassword,
  encrypt,
  decrypt,
  hash,
  verifyHash,
  randomString,
  generateUUID
};
