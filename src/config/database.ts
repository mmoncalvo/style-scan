import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3");
const sqlite3Verbose = sqlite3.verbose();

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(process.cwd(), 'database.sqlite'),
  dialectModule: sqlite3Verbose,
  logging: false
});
// console.log(">>> [init] Configuring Sequelize for MySQL...");
// export const sequelize = new Sequelize('style-scan', 'root', 'root', {
//   host: 'localhost',
//   dialect: 'mysql',
//   logging: false
// });

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    defaultValue: () => crypto.randomUUID(),
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'cliente' // 'admin' or 'cliente'
  },
  fullName: DataTypes.STRING,
  email: DataTypes.STRING
});

export const Analysis = sequelize.define('Analysis', {
  id: {
    type: DataTypes.STRING,
    defaultValue: () => crypto.randomUUID(),
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: true // Optional for now to avoid breaking existing data
  },
  skinScore: DataTypes.INTEGER,
  skinAge: DataTypes.INTEGER,
  skinType: DataTypes.STRING,
  spots: DataTypes.INTEGER,
  wrinkles: DataTypes.INTEGER,
  texture: DataTypes.INTEGER,
  darkCircles: DataTypes.INTEGER,
  pores: DataTypes.INTEGER,
  redness: DataTypes.INTEGER,
  oiliness: DataTypes.INTEGER,
  moisture: DataTypes.INTEGER,
  eyebag: DataTypes.INTEGER,
  droopyEyelid: DataTypes.INTEGER,
  acne: DataTypes.INTEGER,
  imageUrl: DataTypes.STRING,
  rawResponse: DataTypes.TEXT('long'),
  masks: DataTypes.TEXT('long'),
  isMock: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

export const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  target: {
    type: DataTypes.STRING,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  images: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]'
  }
});

User.hasMany(Analysis, { foreignKey: 'userId' });
Analysis.belongsTo(User, { foreignKey: 'userId' });

// A robust way to manage DB readiness state
let dbReady = false;

export const setDbReady = (ready: boolean) => {
  dbReady = ready;
};

export const isDbReady = () => dbReady;
