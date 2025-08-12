/********************************************************************************
* WEB322 – Assignment 06
* Name: satyam bahri
* Student ID: 172151227
* Date: 8 Aug 2025
********************************************************************************/

require('dotenv').config();
const express = require('express');
const clientSessions = require("client-sessions");
const authData = require("./modules/auth-service");
const projectData = require("./modules/projects");
const { sequelize, Sector, Project } = require('./models');

const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// ===== Middleware =====
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
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

// ===== Routes =====
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
      (projects.length > 0)
        ? res.render("projects", { projects, page: '/solutions/projects' })
        : res.status(404).render("404", { message: `No projects found for sector: ${req.query.sector}`, page: '/solutions/projects' });
    } else {
      let projects = await projectData.getAllProjects();
      res.render("projects", { projects, page: '/solutions/projects' });
    }
  } catch (err) {
    res.status(404).render("404", { message: err, page: '/solutions/projects' });
  }
});

app.get("/solutions/projects/:id", async (req, res) => {
  try {
    let project = await projectData.getProjectById(req.params.id);
    res.render("project", { project, page: '/solutions/projects' });
  } catch (err) {
    res.status(404).render("404", { message: err, page: '/solutions/projects' });
  }
});

app.get('/solutions/addProject', async (req, res) => {
  try {
    const sectors = await projectData.getAllSectors();
    res.render('addProject', { sectors, page: '/solutions/addProject' });
  } catch (err) {
    res.render('500', { message: `Error: ${err}`, page: '/solutions/addProject' });
  }
});

app.post('/solutions/addProject', async (req, res) => {
  try {
    const newProject = {
      title: req.body.title,
      feature_img_url: req.body.feature_img_url,
      sector_id: req.body.sector_id,
      intro_short: req.body.intro_short,
      summary_short: req.body.summary_short,
      impact: req.body.impact,
      original_source_url: req.body.original_source_url
    };
    await projectData.addProject(newProject);
    res.redirect('/solutions/projects');
  } catch (err) {
    res.render('500', { message: `Error: ${err}`, page: '/solutions/addProject' });
  }
});

app.get('/solutions/editProject/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const [projectInfo, sectorData] = await Promise.all([
      Project.findByPk(projectId, { include: [{ model: Sector, attributes: ['sector_name'] }] }),
      Sector.findAll()
    ]);
    if (!projectInfo) {
      return res.status(404).render('404', { message: `Project not found with ID: ${projectId}`, page: '/solutions/projects' });
    }
    res.render('editProject', { project: projectInfo, sectors: sectorData, page: '/solutions/editProject' });
  } catch (err) {
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
    Object.assign(project, { title, feature_img_url, sector_id, intro_short, summary_short, impact, original_source_url });
    await project.save();
    res.redirect('/solutions/projects');
  } catch (err) {
    res.status(500).render('500', { message: `Internal server error: ${err.message}`, page: '/solutions/editProject' });
  }
});

app.get('/solutions/deleteProject/:id', async (req, res) => {
  try {
    await projectData.deleteProject(req.params.id);
    res.redirect('/solutions/projects');
  } catch (err) {
    res.render('500', { message: `Error: ${err}`, page: '/solutions/projects' });
  }
});

// 404 Fallback
app.use((req, res) => {
  res.status(404).render("404", { message: "I'm sorry, we're unable to find what you're looking for", page: '' });
});

// DB Init
Promise.all([
  authData.initialize(),
  projectData.initialize()
])
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`✅ Server listening on: ${HTTP_PORT}`);
    });
  })
  .catch(err => {
    console.error(`❌ Unable to start server: ${err}`);
  });

module.exports = app;
