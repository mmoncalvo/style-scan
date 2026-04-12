import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sqlite3 = require("sqlite3");
const sqlite3Verbose = sqlite3.verbose();

console.log(">>> [init] Configuring Sequelize...");
export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(process.cwd(), 'database.sqlite'),
  dialectModule: sqlite3Verbose,
  logging: false
});

export const Analysis = sequelize.define('Analysis', {
  id: {
    type: DataTypes.STRING,
    defaultValue: () => crypto.randomUUID(),
    primaryKey: true
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
  rawResponse: DataTypes.TEXT,
  masks: DataTypes.TEXT,
  isMock: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// A robust way to manage DB readiness state
let dbReady = false;

export const setDbReady = (ready: boolean) => {
  dbReady = ready;
};

export const isDbReady = () => dbReady;
