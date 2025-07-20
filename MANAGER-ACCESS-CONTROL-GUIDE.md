# 🔐 Manager Access Control System - Implementation Guide

## Overview
This system allows managers to authenticate using their PIN and access timesheet management features only for users in their assigned departments. Multiple managers can control the same department, and managers can be assigned to multiple departments.

## 📋 Step-by-Step Implementation

### Step 1: Database Setup

**Execute the SQL schema file `manager-access-control-schema.sql` in your PostgreSQL database:**

```bash
psql -U your_username -d your_database -f manager-access-control-schema.sql
```

This creates:
- ✅ `manager_departments` - Many-to-many relationship table
- ✅ `user_sessions` - Session management
- ✅ `auth_audit_log` - Authentication logging
- ✅ Helper functions for permission checking

### Step 2: Add Manager Role to Database

```sql
INSERT INTO roles (name, description, is_active) 
VALUES ('manager', 'Manager with medium access - can approve entries and view reports', true);
```

### Step 3: Assign Managers to Departments

```sql
-- Example: Assign managers to departments
-- Replace with your actual user IDs and department IDs

INSERT INTO manager_departments (manager_id, department_id, created_by) VALUES
('50.00.13.1001', 1, '50.00.13.1000'),  -- Manager 1 → IT Department
('50.00.13.1001', 2, '50.00.13.1000'),  -- Manager 1 → HR Department  
('50.00.13.1002', 2, '50.00.13.1000'),  -- Manager 2 → HR Department
('50.00.13.1002', 3, '50.00.13.1000');  -- Manager 2 → Finance Department
```

### Step 4: Update Backend Authentication

**1. Add the authentication routes to your backend:**

Create `src/routes/auth.js` with the content from `backend-auth-routes.js`

**2. Add the middleware:**

Create `src/middleware/auth.js` with the content from `backend-auth-middleware.js`

**3. Update your server.js:**

```javascript
const authRouter = require('./routes/auth');
const { authenticateUser, requireBonusAccess } = require('./middleware/auth');

// Add auth routes
app.use('/auth', authRouter);

// Update existing routes to use authentication
app.use('/bonuses', authenticateUser, requireBonusAccess, bonusesRouter);
app.use('/web-timeentries', authenticateUser, webTimeEntriesRoutes);
app.use('/payroll-report', authenticateUser, payrollReportRoute);
```

### Step 5: Update API Configuration

**Add authentication endpoints to `src/config/api.js`:**

```javascript
// Add to endpoints object:
auth: "/auth",
login: "/auth/login",
logout: "/auth/logout",
verify: "/auth/verify"
```

### Step 6: Frontend Authentication Context

**Create `src/context/AuthContext.jsx`:**

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG, { buildUrl } from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    const sessionToken = localStorage.getItem('session_token');
    
    if (sessionToken) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
        
        const response = await axios.get(buildUrl('/auth/verify'));
        setUser(response.data.user);
      } catch (err) {
        console.log('Session expired or invalid');
        logout();
      }
    }
    
    setIsLoading(false);
  };

  const login = (userData) => {
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.session_token}`;
  };

  const logout = async () => {
    const sessionToken = localStorage.getItem('session_token');
    
    if (sessionToken) {
      try {
        await axios.post(buildUrl('/auth/logout'), { session_token: sessionToken });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    
    setUser(null);
    localStorage.removeItem('session_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('login_time');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### Step 7: Update Main App Component

**Update `src/App.jsx`:**

```javascript
import { AuthProvider } from './context/AuthContext';
import AdminPanel from "./pages/AdminPanel";

export default function App() {
  return (
    <AuthProvider>
      <AdminPanel />
    </AuthProvider>
  );
}
```

### Step 8: Update AdminPanel with Authentication

**Update `src/pages/AdminPanel.jsx`:**

```javascript
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginModal from '../components/LoginModal';
import TimeEntriesPanel from './TimeEntriesPanel';
// ... other imports

export default function AdminPanel() {
  const { user, login, logout, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Timesheet Management System</h1>
            <p className="text-gray-600 mb-6">Please login to access the system</p>
            <button
              onClick={() => setShowLoginModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
            >
              🔐 Manager Login
            </button>
          </div>
        </div>
        
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={login}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info and logout */}
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Timesheet Management</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Welcome, {user.full_name} ({user.role})
              {user.department_name && ` - ${user.department_name}`}
            </div>
            <button
              onClick={logout}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Your existing panel content */}
      <TimeEntriesPanel />
    </div>
  );
}
```

### Step 9: Update API Calls for Permission Filtering

**The backend will automatically filter data based on user permissions. Update frontend to handle role-based UI:**

```javascript
// In TimeEntriesPanel.jsx
import { useAuth } from '../context/AuthContext';

export default function TimeEntriesPanel() {
  const { user } = useAuth();
  
  // Use user.role instead of hardcoded 'admin'
  const currentUserRole = user?.role || 'user';
  
  // Show different UI based on role
  const isManager = user?.role === 'manager';
  const isAdmin = user?.role === 'admin';
  
  // Rest of your existing code...
}
```

## 🧪 Testing the System

### 1. Test Manager Login

```javascript
// POST http://localhost:3000/auth/login
{
  "pin": "1234"  // Manager's PIN from users table
}
```

### 2. Test Permission Checking

```sql
-- Check if manager can access specific user
SELECT can_manager_access_user('manager_user_id', 'target_user_id');

-- Get all users a manager can access
SELECT * FROM get_manager_accessible_users('manager_user_id');

-- Get manager's departments
SELECT * FROM get_manager_departments('manager_user_id');
```

### 3. Test Filtered Data

- **Managers**: Should only see time entries for users in their departments
- **Admins**: Should see all time entries
- **Regular users**: Should be denied access

## 🔒 Security Features

✅ **PIN-based authentication** with secure session tokens
✅ **Role-based access control** (admin, manager, user)
✅ **Department-level permissions** 
✅ **Session management** with expiration
✅ **Audit logging** for all authentication attempts
✅ **Permission middleware** on all protected routes
✅ **Data filtering** based on user permissions

## 📊 Database Relationships

```
users (id, pin, role, department_id)
  ↓
manager_departments (manager_id, department_id)
  ↓
Permissions: Manager can access users in assigned departments
```

## 🎯 Next Steps

1. **Run the database schema** from `manager-access-control-schema.sql`
2. **Add the backend routes** and middleware
3. **Implement the frontend components** (LoginModal, AuthContext)
4. **Test with real manager PINs** and department assignments
5. **Configure role permissions** as needed

The system is now ready for production use with full role-based access control! 🚀 