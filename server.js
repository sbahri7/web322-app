/********************************************************************************
* WEB322 – Assignment 06
* 
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
* 
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
* 
* Name: Kaiynaat Arora Student ID: 145386231 Date: 10 April 2025
*
********************************************************************************/
const authData = require("./modules/auth-service");
require('dotenv').config();
const projectData = require("./modules/projects");
const clientSessions = require("client-sessions");
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
app.use(express.json());

app.use(clientSessions({
  cookieName: 'session',
  secret: 'your-secret-key-here',
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

function ensureLogin(req, res, next) {
  if (!req.session.userName) {
    return res.redirect('/login');
  }
  next();
}

app.get('/', (req, res) => {
  res.render("home", { page: '/' });
});

app.get('/login', (req, res) => {
  res.render('login', { errorMessage: '', userName: '', page: '/login' });
});

app.get('/register', (req, res) => {
  res.render('register', { errorMessage: '', successMessage: '', userName: '', page: '/register' });
});

app.post('/register', async (req, res) => {
  const userData = {
    userName: req.body.userName,
    email: req.body.email,
    password: req.body.password,
    password2: req.body.password2,
  };

  try {
    await authData.initialize();
    await authData.registerUser(userData);

    res.render('register', {
      errorMessage: '',
      successMessage: 'User created',
      userName: '',
      page: '/register'
    });
  } catch (err) {
    res.render('register', {
      errorMessage: err,
      successMessage: '',
      userName: req.body.userName,
      page: '/register'
    });
  }
});

app.post('/login', async (req, res) => {
  req.body.userAgent = req.get('User-Agent');

  try {
    await authData.initialize();
    const user = await authData.checkUser(req.body);

    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory,
    };
    res.redirect('/solutions/projects');
  } catch (err) {
    res.render('login', { errorMessage: err, userName: req.body.userName, page: '/login' });
  }
});

app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory', { page: '/userHistory' });
});

app.get("/solutions/projects", async (req, res) => {
  try {
    if (req.query.sector) {
      let projects = await projectData.getProjectsBySector(req.query.sector);
      (projects.length > 0) ? res.render("projects", { projects: projects, page: '/solutions/projects' }) : res.status(404).render("404", { message: `No projects found for sector: ${req.query.sector}` });
    } else {
      let projects = await projectData.getAllProjects();
      res.render("projects", { projects: projects, page: '/solutions/projects' });
    }
  } catch (err) {
    res.status(404).render("404", { message: err, page: '/solutions/projects' });
  }
});

app.get("/solutions/projects/:id", async (req, res) => {
  try {
    let project = await projectData.getProjectById(req.params.id);
    res.render("project", { project: project, page: '/solutions/projects' });
  } catch (err) {
    res.status(404).render("404", { message: err, page: '/solutions/projects' });
  }
});

app.get('/solutions/addProject', async (req, res) => {
  try {
    const sectorData = await projectData.getAllSectors();
    res.render('addProject', { sectors: sectorData, page: '/solutions/addProject' });
  } catch (err) {
    res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}`, page: '/solutions/addProject' });
  }
});

app.post('/solutions/addProject', async (req, res) => {
  try {
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
    res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}`, page: '/solutions/addProject' });
  }
});

app.get('/solutions/editProject/:id', async (req, res) => {
  try {
    const projectId = req.params.id;

    const [projectData, sectorData] = await Promise.all([
      Project.findByPk(projectId, { include: [{ model: Sector, attributes: ['sector_name'] }] }),
      Sector.findAll()
    ]);

    if (!projectData) {
      return res.status(404).render('404', { message: `Project not found with ID: ${projectId}`, page: '/solutions/projects' });
    }

    res.render('editProject', { project: projectData, sectors: sectorData, page: '/solutions/editProject' });
  } catch (err) {
    console.error('Error fetching project or sectors:', err);
    res.status(500).render('500', { message: `Internal server error: ${err.message}`, page: '/solutions/editProject' });
  }
});

app.post('/solutions/editProject', async (req, res) => {
  try {
    const { id, title, feature_img_url, sector_id, intro_short, summary_short, impact, original_source_url } = req.body;
    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).render('404', { message: `Project not found with ID: ${id}`, page: '/solutions/projects' });
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
    res.status(500).render('500', { message: `Internal server error: ${err.message}`, page: '/solutions/editProject' });
  }
});

router.get('/solutions/deleteProject/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    await projectData.deleteProject(projectId);
    res.redirect('/solutions/projects');
  } catch (err) {
    res.render('500', { message: `I'm sorry, but we have encountered the following error: ${err}`, page: '/solutions/projects' });
  }
});

app.use((req, res, next) => {
  res.status(404).render("404", { message: "I'm sorry, we're unable to find what you're looking for", page: '' });
});

// Only initialize SQL project data here (not Mongo)
projectData.initialize()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`server listening on: ${HTTP_PORT}`);
    });
  })
  .catch((err) => {
    console.log(`unable to start server: ${err}`);
  });

module.exports = app;
