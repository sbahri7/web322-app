require('dotenv').config();
require('pg');
const { sequelize, Sector, Project } = require('../models'); 
const Sequelize = require('sequelize'); 

function initialize() {
  return new Promise((resolve, reject) => {
    sequelize.sync()
      .then(async () => {
        try {
          console.log("Database synced successfully.");
          resolve();  
        } catch (err) {
          console.log("Error syncing database: ", err.message);
          reject(err);  
        }
      })
      .catch((err) => {
        console.log('Unable to connect to the database:', err);
        reject(err); 
      });
  });
}

function getAllProjects() {
  return new Promise((resolve, reject) => {
    Project.findAll({
      include: [
        {
          model: Sector,
          attributes: ['sector_name'],
        }
      ]
    })
      .then((projects) => {
        resolve(projects);
      })
      .catch((err) => {
        reject("Unable to find projects: " + err);
      });
  });
}

function getProjectById(projectId) {
  return new Promise((resolve, reject) => {
    Project.findAll({
      where: { id: projectId },
      include: [
        {
          model: Sector,
          attributes: ['sector_name'], 
        }
      ]
    })
      .then((projects) => {
        if (projects.length > 0) {
          resolve(projects[0]); 
        } else {
          reject("Unable to find requested project"); 
        }
      })
      .catch((err) => {
        reject("Unable to find requested project: " + err); 
      });
  });
}

function getProjectsBySector(sector) {
  return new Promise((resolve, reject) => {
    Project.findAll({
      include: [
        {
          model: Sector,
          attributes: ['sector_name'], 
        }
      ],
      where: {
        '$Sector.sector_name$': {
          [Sequelize.Op.iLike]: `%${sector}%` 
        }
      }
    })
      .then((projects) => {
        if (projects.length > 0) {
          resolve(projects);
        } else {
          reject("Unable to find requested projects"); 
        }
      })
      .catch((err) => {
        reject("Unable to find requested projects: " + err); 
      });
  });
}

function addProject(projectData) {
  return new Promise((resolve, reject) => {
    Project.create({
      name: projectData.name,
      description: projectData.description,
      sector_id: projectData.sector_id,
      intro_short: projectData.intro_short,
    })
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err.errors[0].message); 
      });
  });
}

function getAllSectors() {
  return new Promise((resolve, reject) => {
    Sector.findAll()
      .then((sectors) => {
        resolve(sectors);
      })
      .catch((err) => {
        reject("Unable to retrieve sectors: " + err);
      });
  });
}

function editProject(id, projectData) {
  return new Promise((resolve, reject) => {
    Project.update({
      name: projectData.name,
      description: projectData.description,
      sector_id: projectData.sector_id,
      intro_short: projectData.intro_short,
    }, {
      where: { id: id }
    })
      .then(([updatedRows]) => {
        if (updatedRows === 0) {
          reject("No project found with the specified id.");
        } else {
          resolve(); // Successfully updated
        }
      })
      .catch((err) => {
        reject(err.errors ? err.errors[0].message : "An error occurred while updating the project.");
      });
  });
}

function deleteProject(id) {
  return new Promise((resolve, reject) => {
    Project.destroy({
      where: { id: id } 
    })
    .then((deletedRows) => {
      if (deletedRows === 0) {
        reject("No project found with the specified id.");
      } else {
        resolve();  
      }
    })
    .catch((err) => {
      reject(err.errors ? err.errors[0].message : "An error occurred while deleting the project.");
    });
  });
}


module.exports = { initialize, getAllProjects, getProjectById, getProjectsBySector,  addProject, getAllSectors, editProject, deleteProject};

