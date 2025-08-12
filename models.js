const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
});

const Sector = sequelize.define('Sector', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  sector_name: { type: Sequelize.STRING, allowNull: false }
}, { timestamps: false });

const Project = sequelize.define('Project', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: Sequelize.STRING, allowNull: false },
  feature_img_url: { type: Sequelize.STRING },
  summary_short: { type: Sequelize.TEXT },
  intro_short: { type: Sequelize.TEXT },
  impact: { type: Sequelize.TEXT },
  original_source_url: { type: Sequelize.STRING }
}, { timestamps: false });

Project.belongsTo(Sector, { foreignKey: 'sector_id' });

module.exports = { sequelize, Sector, Project };
