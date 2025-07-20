import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import API_CONFIG, { buildUrl } from "../config/api";
import axios from "axios";
import dayjs from "dayjs";

function getEffectiveSalary(salarySettings, dateStr) {
  const date = new Date(dateStr);
  const applicable = salarySettings
    .filter(s => new Date(s.effective_from) <= date)
    .sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from))[0];
  
  return applicable || salarySettings[salarySettings.length - 1] || {};
}

function getDayColumn(dayName) {
  const map = {
    'Δευτέρα': 'mon',
    'Τρίτη': 'tue', 
    'Τετάρτη': 'wed',
    'Πέμπτη': 'thu',
    'Παρασκευή': 'fri',
    'Σάββατο': 'sat',
    'Κυριακή': 'sun'
  };
  return map[dayName];
}

// ✅ NEW: Get workday field name from day index
function getWorkdayField(dayIndex) {
  const workdayFields = [
    'works_sunday',    // 0
    'works_monday',    // 1
    'works_tuesday',   // 2
    'works_wednesday', // 3
    'works_thursday',  // 4
    'works_friday',    // 5
    'works_saturday'   // 6
  ];
  return workdayFields[dayIndex];
}

// ✅ NEW: Map user type titles to IDs (since backend doesn't send user_type_id)
function getUserTypeIdFromTitle(userTypeTitle) {
  const userTypeMapping = {
    'Υπάλληλος': 1,                // Type 1 = Monthly salary (σταθερός υπάλληλος)
    'Παροχής υπηρεσίας': 2,        // Type 2 = Monthly salary (ελεύθερος επαγγελματίας)
    'Εργατοτεχνίτης': 3           // Type 3 = Hourly/Daily (εργάτης με ημερομίσθιο)
  };
  
  console.log(`🗺️ Mapping "${userTypeTitle}" → Type ${userTypeMapping[userTypeTitle] || 3}`);
  return userTypeMapping[userTypeTitle] || 3; // Default to 3 if unknown
}

// ✅ NEW: Check if user should work on this day
function isRegularWorkday(salarySettings, date) {
  const salary = getEffectiveSalary(salarySettings, date);
  const dayOfWeek = dayjs(date).day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const workdayField = getWorkdayField(dayOfWeek);
  
  console.log(`📅 Checking workday for ${date}, day ${dayOfWeek}, field ${workdayField}:`, salary[workdayField]);
  
  return salary[workdayField] === true;
}

// ✅ NEW: Calculate payroll based on new workday logic
function calculateDayPayroll(dayData, salarySettings, userType, userTypeId) {
  if (!dayData) return { regular_pay: 0, extra_pay: 0, total_pay: 0, is_regular_day: false, is_extra_day: false };
  
  const salary = getEffectiveSalary(salarySettings, dayData.date);
  const dayKey = getDayColumn(dayData.day);
  const daily_salary = salary[`salary_${dayKey}`] || 0;
  const overtime_rate = salary[`overtime_${dayKey}`] || 0;
  const isEligibleForOvertime = dayData.norm_hours > 0 && dayData.worked_hours >= dayData.norm_hours;
  const actualOvertime = isEligibleForOvertime ? dayData.overtime : 0;
  
  const isRegularDay = isRegularWorkday(salarySettings, dayData.date);
  
  // ✅ DEBUG: Log all user type information
  console.log(`💰 Calculating pay for ${dayData.date}:`);
  console.log(`   User Type String: "${userType}"`);
  console.log(`   User Type ID: ${userTypeId}`);
  console.log(`   Regular Day: ${isRegularDay}`);
  console.log(`   Daily Salary: €${daily_salary}, Overtime Rate: €${overtime_rate}`);
  console.log(`   Salary has_monthly_salary: ${salary.has_monthly_salary}`);
  
  // Check if user has monthly salary (more reliable than user type ID)
  const hasMonthly = salary.has_monthly_salary === true;
  
  console.log(`   Payment Logic: ${hasMonthly ? 'Monthly Salary User' : 'Hourly/Daily User'}`);
  
  // Types 1 & 2 (Monthly Salary) - €0 for regular days, full pay for extra days
  if (hasMonthly || userTypeId === 1 || userTypeId === 2) {
    console.log(`   → Type ${userTypeId} = Monthly Salary User`);
    if (isRegularDay) {
      // Regular workday → €0 (covered by monthly salary)
      console.log(`   → Regular workday: €0 (covered by monthly salary)`);
      return {
        regular_pay: 0,
        extra_pay: 0,
        total_pay: 0,
        is_regular_day: true,
        is_extra_day: false
      };
    } else {
      // Extra workday → Full pay + overtime
      const extra_pay = daily_salary + (actualOvertime * overtime_rate);
      console.log(`   → Extra workday: €${extra_pay} (daily ${daily_salary} + overtime ${actualOvertime * overtime_rate})`);
      return {
        regular_pay: 0,
        extra_pay: extra_pay,
        total_pay: extra_pay,
        is_regular_day: false,
        is_extra_day: true
      };
    }
  }
  
  // Type 3 (Hourly/Daily) - Full pay for ALL workdays
  const total_pay = daily_salary + (actualOvertime * overtime_rate);
  console.log(`   → Type 3 = Hourly/Daily user: €${total_pay} (daily ${daily_salary} + overtime ${actualOvertime * overtime_rate})`);
  return {
    regular_pay: total_pay,
    extra_pay: 0,
    total_pay: total_pay,
    is_regular_day: true,
    is_extra_day: false
  };
}

const WEEKDAYS = ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"];

export default function PayrollReportPanel() {
  // State management
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [weekStart, setWeekStart] = useState(null);
  const [weekStartDay] = useState(4); // Thursday (same as TimeEntries)
  
  // Calculate years from available weeks
  const yearsWithData = Array.from(
    new Set(availableWeeks.map(ws => ws.year()))
  ).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(() =>
    yearsWithData.length > 0 ? yearsWithData[0] : dayjs().year()
  );

  // Fetch time entries to get available periods (same as TimeEntriesPanel)
  const fetchTimeEntries = async () => {
    try {
      const res = await fetch(buildUrl(API_CONFIG.endpoints.timeEntries));
      const data = await res.json();
      setTimeEntries(data);
    } catch (error) {
      console.error("Error fetching time entries for periods:", error);
    }
  };

  // Get week start date from any date (same logic as TimeEntriesPanel)
  const getWeekStartFromDate = (dateStr, startDay) => {
    const date = dayjs(dateStr);
    const day = date.day();
    const offset = (7 + day - startDay) % 7;
    return date.subtract(offset, "day").startOf("day");
  };

  // Fetch time entries on mount to populate available weeks
  useEffect(() => {
    fetchTimeEntries();
  }, []);

  // Update available weeks when time entries change
  useEffect(() => {
    if (timeEntries.length > 0) {
      const weekStarts = Array.from(
        new Set(
          timeEntries.map((e) =>
            getWeekStartFromDate(e.clock_in_time, weekStartDay).format("YYYY-MM-DD")
          )
        )
      )
        .map((d) => dayjs(d))
        .sort((a, b) => b.unix() - a.unix());

      setAvailableWeeks(weekStarts);
      if (!weekStart && weekStarts.length > 0) {
        setWeekStart(weekStarts[0]);
      }
    }
  }, [timeEntries, weekStartDay]);

  // Transform backend data to match frontend expectations
  function transformBackendData(backendData, startDate, endDate) {
    console.log('🔄 Transforming backend data:', { backendData, startDate, endDate });
    
    if (!backendData || !Array.isArray(backendData)) return [];
    
    return backendData.map(employee => {
      console.log('🔄 Processing employee:', employee.user_name);
      
      // Validate that backend sends complete data
      if (!employee.salary_settings || !Array.isArray(employee.salary_settings)) {
        console.error('❌ Backend missing salary_settings for employee:', employee.user_name);
        return null; // Skip this employee
      }
      
      if (!employee.days || !Array.isArray(employee.days)) {
        console.error('❌ Backend missing days data for employee:', employee.user_name);
        return null; // Skip this employee
      }

      console.log('✅ Using REAL backend data for:', employee.user_name);
      console.log('📅 Employee data:', {
        user_type: employee.user_type,
        user_type_id: employee.user_type_id,
        user_type_title: employee.user_type_title,
        workdays: {
          works_monday: employee.salary_settings[0]?.works_monday,
          works_tuesday: employee.salary_settings[0]?.works_tuesday,
          works_wednesday: employee.salary_settings[0]?.works_wednesday,
          works_thursday: employee.salary_settings[0]?.works_thursday,
          works_friday: employee.salary_settings[0]?.works_friday,
          works_saturday: employee.salary_settings[0]?.works_saturday,
          works_sunday: employee.salary_settings[0]?.works_sunday
        }
      });
      
      // ✅ Fix: Map user type title to ID since backend doesn't send user_type_id
      const mappedUserTypeId = getUserTypeIdFromTitle(employee.user_type);
      
      console.log(`🎯 Mapped "${employee.user_type}" → Type ${mappedUserTypeId}`);
      
      return {
        user_name: employee.user_name,
        user_id: employee.user_id,
        user_type: employee.user_type || employee.user_type_title || "Unknown",
        user_type_id: employee.user_type_id || mappedUserTypeId, // Use mapping if backend doesn't provide
        week_start: employee.week_start,
        salary_settings: employee.salary_settings, // REAL backend data only
        days: employee.days // REAL backend data only
      };
    }).filter(Boolean); // Remove null entries
  }

  // Function to fetch real payroll data
  const fetchPayrollData = async (weekStartDate) => {
    if (!weekStartDate) return;
    
    console.log('🔍 Fetching payroll data for week starting:', weekStartDate.format('YYYY-MM-DD'));
    setLoading(true);
    setError(null);
    
    try {
      // Calculate week range (7 days from start)
      const start_date = weekStartDate.format('YYYY-MM-DD');
      const end_date = weekStartDate.add(6, 'day').format('YYYY-MM-DD');
      
      console.log('🔍 Fetching payroll data from', start_date, 'to', end_date);
      
      const response = await axios.get(buildUrl(API_CONFIG.endpoints.payrollReport), {
        params: {
          start_date: start_date,
          end_date: end_date
        }
      });
      
      console.log('✅ Backend response:', response.data);
      console.log('📊 First employee sample:', response.data.employees?.[0]);
      console.log('💰 Backend salary_settings:', response.data.employees?.[0]?.salary_settings);
      
      // Transform backend data to match frontend expectations
      const transformedData = transformBackendData(response.data.employees || response.data, start_date, end_date);
      console.log('🔄 Transformed data sample:', transformedData[0]);
      setPayrollData(transformedData);
      
    } catch (err) {
      console.error("Error fetching payroll data:", err);
      setError("Failed to load payroll data. Please try again.");
      setPayrollData([]); // Clear data on error
    } finally {
      setLoading(false);
    }
  };

  // Use payroll data directly
  const currentData = payrollData;

  // Filter available weeks by selected year
  const weeksForYear = availableWeeks.filter(week => week.year() === selectedYear);

  // Get custom week days starting from selected week start (like TimeEntriesPanel)
  const getCustomWeekDays = () => {
    if (!weekStart) return [];
    return Array(7).fill(null).map((_, i) => weekStart.add(i, "day"));
  };

  // Get Greek day name from dayjs date
  const getGreekDayName = (dayjsDate) => {
    const dayNames = {
      0: 'Κυριακή',
      1: 'Δευτέρα', 
      2: 'Τρίτη',
      3: 'Τετάρτη',
      4: 'Πέμπτη',
      5: 'Παρασκευή',
      6: 'Σάββατο'
    };
    return dayNames[dayjsDate.day()];
  };

  // Auto-fetch data when weekStart changes
  useEffect(() => {
    if (weekStart) {
      fetchPayrollData(weekStart);
    }
  }, [weekStart]);

  return (
    <Card className="max-w-7xl mx-auto my-8">
      <div className="flex flex-wrap justify-between items-start gap-4 px-6 pt-6">
        <div>
          <h2 className="text-xl font-semibold">Weekly Payroll Report</h2>
          <p className="text-sm text-gray-600 mt-1">
            📅 <strong>New Logic:</strong> Monthly salary users (Types 1&2) get €0 for regular workdays, full pay for extra workdays
          </p>
          {error && (
            <div className="text-red-600 text-sm mt-1">{error}</div>
          )}
        </div>
        
        {/* Data Source Toggle */}

        <div className="w-64">
          <label className="text-sm mb-1 text-gray-500 block">Αρχική ημέρα εβδομάδας</label>
          <select disabled defaultValue={weekStartDay} className="w-full bg-gray-100 text-gray-600 border border-gray-300 rounded px-2 py-1 cursor-not-allowed">
            <option value="1">Δευτέρα</option>
            <option value="2">Τρίτη</option>
            <option value="3">Τετάρτη</option>
            <option value="4">Πέμπτη</option>
            <option value="5">Παρασκευή</option>
            <option value="6">Σάββατο</option>
            <option value="0">Κυριακή</option>
          </select>
        </div>
        
        <div className="w-48">
          <label className="text-sm mb-1 text-gray-500 block">Έτος</label>
          <select 
            className="w-full bg-white border border-gray-300 rounded px-2 py-1"
            value={selectedYear}
            onChange={(e) => {
              const newYear = parseInt(e.target.value);
              setSelectedYear(newYear);
              
              // Set first week of selected year
              const weeksForNewYear = availableWeeks.filter(week => week.year() === newYear);
              if (weeksForNewYear.length > 0) {
                setWeekStart(weeksForNewYear[0]);
              }
            }}
          >
            {yearsWithData.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        
        <div className="w-64">
          <label className="text-sm mb-1 text-gray-500 block">Εβδομάδα</label>
          <select 
            className="w-full bg-white border border-gray-300 rounded px-2 py-1"
            value={weekStart ? weekStart.format('YYYY-MM-DD') : ''}
            onChange={(e) => {
              const selectedWeekStart = availableWeeks.find(week => 
                week.format('YYYY-MM-DD') === e.target.value
              );
              if (selectedWeekStart) {
                setWeekStart(selectedWeekStart);
              }
            }}
          >
            {weeksForYear.map((week) => (
              <option key={week.format('YYYY-MM-DD')} value={week.format('YYYY-MM-DD')}>
                {week.format('DD/MM/YYYY')} - {week.add(6, 'day').format('DD/MM/YYYY')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-lg text-gray-600">Loading payroll data...</div>
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-lg text-gray-600">No payroll data available for the selected period.</div>
          </div>
        ) : (
          currentData.map((user) => {
          // Create day map using dates instead of day names
          const dayMap = Object.fromEntries(user.days.map(d => [d.date, d]));
          const weekDays = getCustomWeekDays();

          // ✅ Calculate scheduled workdays per week from salary settings
          // Use the most recent salary setting (first in array since they're sorted DESC)
          const referenceSalarySettings = user.salary_settings[0] || {};
          const scheduledWorkdays = (
            (referenceSalarySettings.works_monday ? 1 : 0) +
            (referenceSalarySettings.works_tuesday ? 1 : 0) +
            (referenceSalarySettings.works_wednesday ? 1 : 0) +
            (referenceSalarySettings.works_thursday ? 1 : 0) +
            (referenceSalarySettings.works_friday ? 1 : 0) +
            (referenceSalarySettings.works_saturday ? 1 : 0) +
            (referenceSalarySettings.works_sunday ? 1 : 0)
          );
          
          console.log(`📊 User ${user.user_name} scheduled workdays calculation:`, {
            works_monday: referenceSalarySettings.works_monday,
            works_tuesday: referenceSalarySettings.works_tuesday,
            works_wednesday: referenceSalarySettings.works_wednesday,
            works_thursday: referenceSalarySettings.works_thursday,
            works_friday: referenceSalarySettings.works_friday,
            works_saturday: referenceSalarySettings.works_saturday,
            works_sunday: referenceSalarySettings.works_sunday,
            total: scheduledWorkdays
          });

          // ✅ NEW: Calculate week totals with new logic
          const weekTotals = weekDays.reduce((totals, dayjs_date) => {
            const dateStr = dayjs_date.format('YYYY-MM-DD');
            const dayData = dayMap[dateStr];
            if (!dayData) return totals;
            
            // Check if this was a scheduled workday
            const dayOfWeek = dayjs_date.day();
            const workdayField = getWorkdayField(dayOfWeek);
            const wasScheduledToWork = referenceSalarySettings[workdayField] === true;
            
            const dayPayroll = calculateDayPayroll(dayData, user.salary_settings, user.user_type, user.user_type_id);
            
            // If it's an unscheduled workday, count the entire pay as "extra"
            if (!wasScheduledToWork) {
              return {
                regular_pay: totals.regular_pay,
                extra_pay: totals.extra_pay + dayPayroll.total_pay,
                total_pay: totals.total_pay + dayPayroll.total_pay
              };
            }
            
            // Otherwise use the original logic
            return {
              regular_pay: totals.regular_pay + dayPayroll.regular_pay,
              extra_pay: totals.extra_pay + dayPayroll.extra_pay,
              total_pay: totals.total_pay + dayPayroll.total_pay
            };
          }, { regular_pay: 0, extra_pay: 0, total_pay: 0 });

          return (
            <div key={user.user_id + user.week_start} className="mb-6 border border-gray-300 rounded shadow-sm p-4">
              <div className="flex justify-between text-md font-semibold mb-2">
                <div className="flex items-center gap-3">
                  <span>
                    {user.user_name} ({user.user_id}) — {user.user_type} ({scheduledWorkdays} days/week)
                  </span>
                  <div className="flex gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayLetter, index) => {
                      const workdayFields = [
                        'works_monday', 'works_tuesday', 'works_wednesday', 
                        'works_thursday', 'works_friday', 'works_saturday', 'works_sunday'
                      ];
                      const isWorkingDay = referenceSalarySettings[workdayFields[index]];
                      
                      return (
                        <span
                          key={index}
                          className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                            isWorkingDay 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-300 text-gray-600'
                          }`}
                          title={[
                            'Monday', 'Tuesday', 'Wednesday', 
                            'Thursday', 'Friday', 'Saturday', 'Sunday'
                          ][index]}
                        >
                          {dayLetter}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-gray-500">
                    — {new Date(user.week_start).toLocaleDateString('el-GR')}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-blue-600">Regular: €{weekTotals.regular_pay.toFixed(2)}</span>
                  <span className="text-orange-600">Extra: €{weekTotals.extra_pay.toFixed(2)}</span>
                  <span className="text-green-700">Total: €{weekTotals.total_pay.toFixed(2)}</span>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ημέρα</TableHead>
                    <TableHead>Ημερομηνία</TableHead>
                    <TableHead>Κανονικές Ώρες</TableHead>
                    <TableHead>Εργάστηκε</TableHead>
                    <TableHead>Υπερωρία</TableHead>
                    <TableHead>Ημερήσιος Μισθός (€)</TableHead>
                    <TableHead>Τιμή Υπερωρίας/ώρα (€)</TableHead>
                    <TableHead>Κανονική Πληρωμή (€)</TableHead>
                    <TableHead>Επιπλέον Πληρωμή (€)</TableHead>
                    <TableHead>Σύνολο Ημέρας (€)</TableHead>
                    <TableHead>Τύπος</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekDays.map((dayjs_date, idx) => {
                    const dateStr = dayjs_date.format('YYYY-MM-DD');
                    const dayNameGreek = getGreekDayName(dayjs_date);
                    const dayData = dayMap[dateStr];
                    
                                          if (!dayData) {
                        // ✅ Check if this was supposed to be a workday using the same reference salary setting
                        const dayOfWeek = dayjs_date.day(); // 0=Sunday, 1=Monday, etc.
                        const workdayField = getWorkdayField(dayOfWeek);
                        const wasSupposedToWork = referenceSalarySettings[workdayField] === true;
                        
                        console.log(`🔍 DAYOFF check for ${dateStr} (${dayNameGreek}): ${workdayField} = ${referenceSalarySettings[workdayField]} → ${wasSupposedToWork ? 'SUPPOSED TO WORK' : 'NOT SCHEDULED'}`);
                        
                        if (wasSupposedToWork) {
                          // Day off when supposed to work
                          return (
                            <TableRow key={idx} className="h-10 bg-red-100">
                              <TableCell>{dayNameGreek}</TableCell>
                              <TableCell>{dayjs_date.format('DD/MM/YYYY')}</TableCell>
                              <TableCell colSpan={8} className="text-center text-red-600 font-bold">DAYOFF</TableCell>
                              <TableCell>
                                <Badge variant="destructive" className="bg-red-600 text-white">DAYOFF</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        } else {
                          // Not a workday, normal empty row
                          return (
                            <TableRow key={idx} className="h-10">
                              <TableCell>{dayNameGreek}</TableCell>
                              <TableCell>{dayjs_date.format('DD/MM/YYYY')}</TableCell>
                              <TableCell colSpan={9} className="text-center text-gray-400">—</TableCell>
                            </TableRow>
                          );
                        }
                      }
                    
                    // ✅ Check if this day was scheduled or extra
                    const dayOfWeek = dayjs_date.day(); // 0=Sunday, 1=Monday, etc.
                    const workdayField = getWorkdayField(dayOfWeek);
                    const wasScheduledToWork = referenceSalarySettings[workdayField] === true;
                    const isExtraWorkday = !wasScheduledToWork; // Worked but not scheduled
                    
                    console.log(`🔍 Day classification for ${dateStr} (${dayNameGreek}): scheduled=${wasScheduledToWork}, extra=${isExtraWorkday}`);
                    
                    const dayPayroll = calculateDayPayroll(dayData, user.salary_settings, user.user_type, user.user_type_id);
                    const countsTowardWorkWeek = true; // since we allow any day
                    const underworked = countsTowardWorkWeek && dayData.worked_hours < dayData.norm_hours;
                    const severelyUnderworked = underworked && (dayData.norm_hours - dayData.worked_hours) >= 1.0; // 1+ hours less
                    
                    // Color logic: Deep red for 1+ hours under, light red for any under
                    const rowClass = severelyUnderworked ? "bg-red-600 text-white" : (underworked ? "bg-red-50" : "");
                    
                    // ✅ NEW: Background color for day type - Extra days get orange highlighting
                    const dayTypeClass = isExtraWorkday ? "bg-orange-100" : 
                                        wasScheduledToWork ? "bg-green-50" : "";
                    const finalRowClass = `${rowClass} ${dayTypeClass}`.trim();
                    
                                          // ✅ Get salary rates for this specific day
                      const salary = getEffectiveSalary(user.salary_settings, dayData.date);
                      const dayKey = getDayColumn(dayData.day);
                      const daily_salary = salary[`salary_${dayKey}`] || 0;
                      const overtime_rate = salary[`overtime_${dayKey}`] || 0;
                      
                      return (
                        <TableRow key={idx} className={`h-10 ${finalRowClass}`}>
                          <TableCell>{dayNameGreek}</TableCell>
                          <TableCell>{dayjs_date.format('DD/MM/YYYY')}</TableCell>
                          <TableCell>{dayData.norm_hours.toFixed(1)}</TableCell>
                          <TableCell>
                            {dayData.worked_hours.toFixed(1)}
                            {underworked && <Badge variant="destructive" className="ml-2">Λιγότερο</Badge>}
                          </TableCell>
                          <TableCell>{dayData.overtime.toFixed(1)}</TableCell>
                          <TableCell>€{daily_salary.toFixed(2)}</TableCell>
                          <TableCell>€{overtime_rate.toFixed(2)}</TableCell>
                          <TableCell>€{dayPayroll.regular_pay.toFixed(2)}</TableCell>
                          <TableCell>€{dayPayroll.extra_pay.toFixed(2)}</TableCell>
                          <TableCell>€{dayPayroll.total_pay.toFixed(2)}</TableCell>
                          <TableCell>
                            {isExtraWorkday && <Badge variant="secondary" className="bg-orange-100 text-orange-800">Extra</Badge>}
                            {wasScheduledToWork && dayPayroll.regular_pay === 0 && <Badge variant="secondary" className="bg-green-100 text-green-800">Regular</Badge>}
                            {wasScheduledToWork && dayPayroll.regular_pay > 0 && <Badge variant="secondary" className="bg-blue-100 text-blue-800">Hourly</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                  })}
                </TableBody>
              </Table>
            </div>
          );
        })
        )}
      </CardContent>
    </Card>
  );
}