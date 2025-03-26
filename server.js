const projectData = require("./modules/projects");
const { sequelize, Sector, Project } = require('./models'); 
const express = require('express');
const router = express.Router();
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(router);  
app.use(express.urlencoded({ extended: true })); 

app.get('/', (req, res) => {
  res.render("home");
});

app.get('/about', (req, res) => {
  res.render("about");
});

app.get("/solutions/projects", async (req, res) => {
  try {
    if (req.query.sector) {
      let projects = await projectData.getProjectsBySector(req.query.sector);
      (projects.length > 0) ? res.render("projects", { projects: projects }) : res.status(404).render("404", { message: `No projects found for sector: ${req.query.sector}` });
    } else {
      let projects = await projectData.getAllProjects();
      res.render("projects", { projects: projects });
    }
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.get("/solutions/projects/:id", async (req, res) => {
  try {
    let project = await projectData.getProjectById(req.params.id);
    res.render("project", { project: project });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

//GET addProject
app.get('/solutions/addProject', async (req, res) => {
  try {
    const sectorData = await projectData.getAllSectors();

    res.render('addProject', { sectors: sectorData });
  } catch (err) {
    res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

//POST addProject
app.post('/solutions/addProject', async (req, res) => {
  try {
    // Extract project data from the form submission
    const projectData = {
      title: req.body.title,
      feature_img_url: req.body.feature_img_url,
      sector_id: req.body.sector_id,
      intro_short: req.body.intro_short,
      summary_short: req.body.summary_short,
      impact: req.body.impact,
      original_source_url: req.body.original_source_url
    };

    await projectData.addProject(projectData);
    res.redirect('/solutions/projects');
  } catch (err) {
    res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

app.get('/solutions/editProject/:id', async (req, res) => {
  try {
    const projectId = req.params.id;

    const [projectData, sectorData] = await Promise.all([
      Project.findByPk(projectId, {
        include: [{
          model: Sector,
          attributes: ['sector_name'] 
        }]
      }),
      Sector.findAll() 
    ]);

    if (!projectData) {
      return res.status(404).render('404', { message: `Project not found with ID: ${projectId}` });
    }

    res.render('editProject', { project: projectData, sectors: sectorData });
  } catch (err) {
    console.error('Error fetching project or sectors:', err);
    res.status(500).render('500', { message: `Internal server error: ${err.message}` });
  }
});


app.post('/solutions/editProject', async (req, res) => {
  try {
    const { id, title, feature_img_url, sector_id, intro_short, summary_short, impact, original_source_url } = req.body;
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).render('404', { message: `Project not found with ID: ${id}` });
    }

    project.title = title;
    project.feature_img_url = feature_img_url;
    project.sector_id = sector_id;
    project.intro_short = intro_short;
    project.summary_short = summary_short;
    project.impact = impact;
    project.original_source_url = original_source_url;

    await project.save();

    res.redirect('/solutions/projects');
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).render('500', { message: `Internal server error: ${err.message}` });
  }
});

router.get('/solutions/deleteProject/:id', async (req, res) => {
  try {
    const projectId = req.params.id;

    // Call the deleteProject function to delete the project
    await projectData.deleteProject(projectId);

    // Redirect to the projects list page after successful deletion
    res.redirect('/solutions/projects');
  } catch (err) {
    // Render 500 error page if deletion fails
    res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});

app.use((req, res, next) => {
  res.status(404).render("404", { message: "I'm sorry, we're unable to find what you're looking for" });
});

projectData.initialize().then(() => {
  app.listen(HTTP_PORT, () => { console.log(`server listening on: ${HTTP_PORT}`) });
});

module.exports = { sequelize, Sector, Project };
