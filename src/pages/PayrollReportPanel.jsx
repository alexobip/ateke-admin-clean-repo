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
      return {
        user_name: employee.user_name,
        user_id: employee.user_id,
        user_type: employee.user_type || "Unknown",
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
    <Card className="max-w-6xl mx-auto my-8">
      <div className="flex flex-wrap justify-between items-start gap-4 px-6 pt-6">
        <div>
          <h2 className="text-xl font-semibold">Weekly Payroll Report</h2>
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

          const totalWeek = weekDays.reduce((sum, dayjs_date) => {
            const dateStr = dayjs_date.format('YYYY-MM-DD');
            const d = dayMap[dateStr];
            if (!d) return sum;
            const salary = getEffectiveSalary(user.salary_settings, d.date);
            const dayKey = getDayColumn(d.day);
            const daily_salary = salary[`salary_${dayKey}`] || 0;
            const overtime_rate = salary[`overtime_${dayKey}`] || 0;
            const isEligible = d.norm_hours > 0 && d.worked_hours >= d.norm_hours;
            const ot = isEligible ? d.overtime : 0;
            return sum + daily_salary + ot * overtime_rate;
          }, 0);

          return (
            <div key={user.user_id + user.week_start} className="mb-6 border border-gray-300 rounded shadow-sm p-4">
              <div className="flex justify-between text-md font-semibold mb-2">
                <div>{user.user_name} ({user.user_id}) — {new Date(user.week_start).toLocaleDateString('el-GR')}</div>
                <div className="text-green-700">Σύνολο Εβδομάδας: €{totalWeek.toFixed(2)}</div>
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
                    <TableHead>Πληρωμή Υπερωρίας (€)</TableHead>
                    <TableHead>Σύνολο Ημέρας (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekDays.map((dayjs_date, idx) => {
                    const dateStr = dayjs_date.format('YYYY-MM-DD');
                    const dayNameGreek = getGreekDayName(dayjs_date);
                    const d = dayMap[dateStr];
                    
                    if (!d) {
                      return (
                        <TableRow key={idx} className="h-10">
                          <TableCell>{dayNameGreek}</TableCell>
                          <TableCell>{dayjs_date.format('DD/MM/YYYY')}</TableCell>
                          <TableCell colSpan={7} className="text-center text-gray-400">—</TableCell>
                        </TableRow>
                      );
                    }
                    
                    const salary = getEffectiveSalary(user.salary_settings, d.date);
                    const dayKey = getDayColumn(d.day);
                    const daily_salary = salary[`salary_${dayKey}`] || 0;
                    const overtime_rate = salary[`overtime_${dayKey}`] || 0;
                    const countsTowardWorkWeek = true; // since we allow any day
                    const underworked = countsTowardWorkWeek && d.worked_hours < d.norm_hours;
                    const severelyUnderworked = underworked && (d.norm_hours - d.worked_hours) >= 1.0; // 1+ hours less
                    const isEligibleForOvertime = d.norm_hours > 0 && d.worked_hours >= d.norm_hours;
                    const actualOvertime = isEligibleForOvertime ? d.overtime : 0;
                    const overtime_pay = actualOvertime * overtime_rate;
                    const total_day = daily_salary + overtime_pay;
                    
                    // Color logic: Deep red for 1+ hours under, light red for any under
                    const rowClass = severelyUnderworked ? "bg-red-600 text-white" : (underworked ? "bg-red-50" : "");
                    
                    return (
                      <TableRow key={idx} className={`h-10 ${rowClass}`}>
                        <TableCell>{dayNameGreek}</TableCell>
                        <TableCell>{dayjs_date.format('DD/MM/YYYY')}</TableCell>
                        <TableCell>{d.norm_hours.toFixed(1)}</TableCell>
                        <TableCell>
                          {d.worked_hours.toFixed(1)}
                          {underworked && <Badge variant="destructive" className="ml-2">Λιγότερο</Badge>}
                        </TableCell>
                        <TableCell>{actualOvertime.toFixed(1)}</TableCell>
                        <TableCell>{daily_salary.toFixed(2)}</TableCell>
                        <TableCell>{overtime_rate.toFixed(2)}</TableCell>
                        <TableCell>{overtime_pay.toFixed(2)}</TableCell>
                        <TableCell>{total_day.toFixed(2)}</TableCell>
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