require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');

const usersRouter = require('./routes/users');
const clockinRoute = require('./routes/clockin');
const clockoutRoute = require('./routes/clockout');
const whoisworkingRoute = require('./routes/whoisworking');
const timeEntriesRoute = require('./routes/timeentries');
const projectsRoute = require('./routes/projects');
const usersWithClockinNowRoute = require('./routes/usersWithClockinNow');
const timeDurationRoute = require('./routes/timeDuration');
const checkLastTimeEntryRoute = require('./routes/checkLastTimeEntry');
const workTypesRoute = require('./routes/workTypes');
const hoursWorkedToday = require('./routes/hoursWorkedToday');
const switchProjectRoute = require('./routes/switch_project');
const getActiveProjectRoute = require('./routes/get_active_project');
const clockedDurationRoute = require('./routes/clockedduration');
const clockinLastProjectRoute = require('./routes/clockin-last-project');
const webUsersRoute = require('./routes/webUsers');
const departmentsGroupsRoute = require('./routes/departments_groups_api');
const rolesRoute = require("./routes/roles");
const webProjectsRoute = require('./routes/webProjects');
const webTimeEntriesRoutes = require('./routes/webTimeEntries');
const userSalarySettingsRoute = require('./routes/userSalarySettings');
const userApiRoute = require('./routes/userRoutes');
const userTypesRoutes = require("./routes/userTypes");
const webDepartmentsRoutes = require('./routes/webDepartments');
const webGroupsRoutes = require('./routes/webGroups');
const payrollReportRoute = require('./routes/payrollReport');
const bonusesRouter = require('./routes/bonuses');

// Authentication imports
const authRouter = require('./routes/auth');
const { authenticateUser, requireBonusAccess } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for FlutterFlow + React Frontend
app.use(cors({
  origin: ['http://localhost:4000', 'http://localhost:4001'], // Allow both ports
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-User-Role', 'X-Session-Token'], // Added X-Session-Token
  credentials: true
}));

app.use(express.json());

// Log each request
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path}`);
  next();
});

// ===================================================================
// PUBLIC ROUTES (No authentication required)
// ===================================================================

// Basic API routes (public access)
app.use('/projects', projectsRoute);
app.use('/users', usersRouter);
app.use('/clockin', clockinRoute);
app.use('/clockout', clockoutRoute);
app.use('/whoisworking', whoisworkingRoute);
app.use('/timeentries', timeEntriesRoute);
app.use('/users', usersWithClockinNowRoute);
app.use('/timeentries', timeDurationRoute);
app.use('/timeentries', checkLastTimeEntryRoute);
app.use('/work-types', workTypesRoute);
app.use('/hours-worked-today', hoursWorkedToday);
app.use('/switch_project', switchProjectRoute);
app.use('/active_project', getActiveProjectRoute);
app.use('/clockedduration', clockedDurationRoute);
app.use('/clockin-last-project', clockinLastProjectRoute);
app.use('/webusers', webUsersRoute);
app.use('/', departmentsGroupsRoute);
app.use("/", rolesRoute);
app.use('/webProjects', webProjectsRoute);
app.use('/api/users', userApiRoute);
app.use("/api/user-types", require("./routes/userTypes"));
app.use('/api/departments', webDepartmentsRoutes);
app.use('/api/groups', webGroupsRoutes);

// ===================================================================
// AUTHENTICATION ROUTES
// ===================================================================

// Authentication endpoints (login, logout, verify)
app.use('/auth', authRouter);

// ===================================================================
// TEMPORARILY PUBLIC ROUTES (Will add authentication later)
// ===================================================================

// Keep these working without authentication for now
app.use('/web-timeentries', webTimeEntriesRoutes);
app.use('/user-salary-settings', userSalarySettingsRoute);
app.use('/payroll-report', payrollReportRoute);

// ===================================================================
// PROTECTED ROUTES (Authentication required)
// ===================================================================

// Bonus management - requires authentication and proper permissions
app.use('/bonuses', authenticateUser, requireBonusAccess, bonusesRouter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    authentication: 'enabled'
  });
});

// Test authentication route
app.get('/protected-test', authenticateUser, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working!',
    user: {
      id: req.currentUser.id,
      role: req.currentUser.role,
      department: req.currentUser.department_name
    }
  });
});

// Fallback error handler
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔐 Authentication system enabled`);
  console.log(`📝 Public routes: /auth/*, /health, /projects, /users, etc.`);
  console.log(`🛡️  Protected routes: /web-timeentries, /bonuses, /payroll-report`);
}); 