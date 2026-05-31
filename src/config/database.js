const { Sequelize } = require('sequelize');
require('dotenv').config();

// 获取环境变量中的数据库配置
const dbType = process.env.DB_TYPE || 'sqlite';
const dbName = process.env.DB_NAME || 'sakura_account';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '3306';
const sqliteFile = process.env.SQLITE_FILE || './data/database.sqlite';

// 根据数据库类型创建不同的Sequelize实例
let sequelize;

switch (dbType.toLowerCase()) {
  case 'mysql':
    sequelize = new Sequelize(dbName, dbUser, dbPassword, {
      host: dbHost,
      port: dbPort,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    });
    break;
  
  case 'mariadb':
    sequelize = new Sequelize(dbName, dbUser, dbPassword, {
      host: dbHost,
      port: dbPort,
      dialect: 'mariadb',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    });
    break;
  
  case 'sqlite':
  default:
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: sqliteFile,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    });
    break;
}

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`成功连接到 ${dbType} 数据库`);
    return true;
  } catch (error) {
    console.error('无法连接到数据库:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
  Sequelize
};