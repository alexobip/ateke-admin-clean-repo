// Centralized API Configuration
const API_CONFIG = {
  // Base URLs for different environments
  local: "http://localhost:3000",
  azure: "https://timesheets-api-clean-dyfga7dfe2h8fkh6.westeurope-01.azurewebsites.net",
  
  // Get current base URL based on environment
  getBaseUrl: () => {
    // Priority: 1. Environment variable, 2. Local development
    return import.meta.env.VITE_API_BASE_URL || API_CONFIG.local;
  },
  
  // Get Azure URL (for specific endpoints that need Azure)
  getAzureUrl: () => {
    return API_CONFIG.azure;
  },
  
  // Common endpoints
  endpoints: {
    // User management
    users: "/webusers",
    userTypes: "/webusers/usertypes",
    departments: "/departments", 
    groups: "/groups",
    roles: "/roles",
    
    // Time management
    timeEntries: "/web-timeentries",
    whoisworking: "/whoisworking",
    
    // Project management  
    projects: "/webProjects",
    
    // Salary management
    salarySettings: "/user-salary-settings",
    userTypesApi: "/api/user-types",
    departmentsApi: "/api/departments",
    groupsApi: "/api/groups",
    
    // Payroll management
    payrollReport: "/payroll-report"
  }
};

// Helper function to build full URL
export const buildUrl = (endpoint, useAzure = false) => {
  const baseUrl = useAzure ? API_CONFIG.getAzureUrl() : API_CONFIG.getBaseUrl();
  return `${baseUrl}${endpoint}`;
};

// Export configuration
export default API_CONFIG; 