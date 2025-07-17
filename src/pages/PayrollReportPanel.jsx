import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const MOCK_PAYROLL = [
  // Existing user

  {
    user_name: "Χρήστος Παπαδόπουλος",
    user_id: "50.00.01.0001",
        days_per_week: 5,
    week_start: "2025-07-11",
    salary_settings: [
      {
        effective_from: "2025-07-10",
        salary_mon: 30,
        salary_tue: 30,
        salary_wed: 30,
        salary_thu: 30,
        salary_fri: 30,
        salary_sat: 30,
        salary_sun: 30,
        overtime_mon: 9,
        overtime_tue: 9,
        overtime_wed: 9,
        overtime_thu: 9,
        overtime_fri: 9,
        overtime_sat: 9,
        overtime_sun: 9
      },
      {
        effective_from: "2025-07-14",
        salary_mon: 35,
        salary_tue: 35,
        salary_wed: 35,
        salary_thu: 35,
        salary_fri: 35,
        salary_sat: 35,
        salary_sun: 35,
        overtime_mon: 12,
        overtime_tue: 12,
        overtime_wed: 12,
        overtime_thu: 12,
        overtime_fri: 12,
        overtime_sat: 12,
        overtime_sun: 12
      }
    ],
    days: [
      {
        date: "2025-07-11",
        day: "Παρασκευή",
        norm_hours: 8,
        worked_hours: 8,
        overtime: 0
      },
      {
        date: "2025-07-12",
        day: "Σάββατο",
        norm_hours: 0,
        worked_hours: 5,
        overtime: 5
      },
      {
        date: "2025-07-13",
        day: "Κυριακή",
        norm_hours: 0,
        worked_hours: 0,
        overtime: 0
      },
      {
        date: "2025-07-14",
        day: "Δευτέρα",
        norm_hours: 8,
        worked_hours: 7,
        overtime: 0
      },
      {
        date: "2025-07-15",
        day: "Τρίτη",
        norm_hours: 8,
        worked_hours: 9,
        overtime: 1
      }
    ]
  }
,
  // User 2
  {
    user_name: "Μαρία Κωνσταντίνου",
    user_id: "50.00.01.0002",
    user_type: "Εργατοτεχνίτης",
    week_start: "2025-07-11",
    salary_settings: [
      {
        effective_from: "2025-07-01",
        salary_mon: 32,
        salary_tue: 32,
        salary_wed: 32,
        salary_thu: 32,
        salary_fri: 32,
        salary_sat: 32,
        salary_sun: 32,
        overtime_mon: 10,
        overtime_tue: 10,
        overtime_wed: 10,
        overtime_thu: 10,
        overtime_fri: 10,
        overtime_sat: 10,
        overtime_sun: 10
      }
    ],
    days: [
      { date: "2025-07-11", day: "Παρασκευή", norm_hours: 8, worked_hours: 9, overtime: 1 },
      { date: "2025-07-12", day: "Σάββατο", norm_hours: 0, worked_hours: 4, overtime: 4 }
    ]
  },
  // User 3
  {
    user_name: "Νίκος Αντωνίου",
    user_id: "50.00.01.0003",
    user_type: "Εργατοτεχνίτης",
    week_start: "2025-07-11",
    salary_settings: [
      {
        effective_from: "2025-06-01",
        salary_mon: 28,
        salary_tue: 28,
        salary_wed: 28,
        salary_thu: 28,
        salary_fri: 28,
        salary_sat: 28,
        salary_sun: 28,
        overtime_mon: 8,
        overtime_tue: 8,
        overtime_wed: 8,
        overtime_thu: 8,
        overtime_fri: 8,
        overtime_sat: 8,
        overtime_sun: 8
      }
    ],
    days: [
      { date: "2025-07-14", day: "Δευτέρα", norm_hours: 8, worked_hours: 8, overtime: 0 },
      { date: "2025-07-15", day: "Τρίτη", norm_hours: 8, worked_hours: 10, overtime: 2 }
    ]
  },
  // User 4
  {
    user_name: "Ελένη Σταμάτη",
    user_id: "50.00.01.0004",
    user_type: "Εργατοτεχνίτης",
    week_start: "2025-07-11",
    salary_settings: [
      {
        effective_from: "2025-07-05",
        salary_mon: 31,
        salary_tue: 31,
        salary_wed: 31,
        salary_thu: 31,
        salary_fri: 31,
        salary_sat: 31,
        salary_sun: 31,
        overtime_mon: 11,
        overtime_tue: 11,
        overtime_wed: 11,
        overtime_thu: 11,
        overtime_fri: 11,
        overtime_sat: 11,
        overtime_sun: 11
      }
    ],
    days: [
      { date: "2025-07-11", day: "Παρασκευή", norm_hours: 8, worked_hours: 6, overtime: 0 },
      { date: "2025-07-12", day: "Σάββατο", norm_hours: 0, worked_hours: 3, overtime: 3 }
    ]
  }
];

function getEffectiveSalary(salarySettings, dateStr) {
  const date = new Date(dateStr);
  const applicable = salarySettings
    .filter(s => new Date(s.effective_from) <= date)
    .sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from))[0];
  return applicable;
}

function getDayKey(dayName) {
  const map = {
    "Δευτέρα": "mon",
    "Τρίτη": "tue",
    "Τετάρτη": "wed",
    "Πέμπτη": "thu",
    "Παρασκευή": "fri",
    "Σάββατο": "sat",
    "Κυριακή": "sun"
  };
  return map[dayName];
}

const WEEKDAYS = [
  "Δευτέρα",
  "Τρίτη",
  "Τετάρτη",
  "Πέμπτη",
  "Παρασκευή",
  "Σάββατο",
  "Κυριακή"
];




export default function PayrollReportPanel() {
  const weekStartDay = "Πέμπτη";

  // Collect unique years from time entries
  const allDates = MOCK_PAYROLL.flatMap(user => user.days.map(d => new Date(d.date)));
  const uniqueYears = [...new Set(allDates.map(d => d.getFullYear()))];
  const sortedYears = uniqueYears.sort((a, b) => b - a);

  // Group entries into weeks based on selected start day
  const startDayIndex = WEEKDAYS.indexOf(weekStartDay);
  const getWeekRange = (date) => {
    const d = new Date(date);
    const dayIndex = (d.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
    const offset = (dayIndex - startDayIndex + 7) % 7;
    const start = new Date(d);
    start.setDate(d.getDate() - offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString('el-GR')} - ${end.toLocaleDateString('el-GR')}`;
  };

  const weekRangesSet = new Set();
  allDates.forEach(d => weekRangesSet.add(getWeekRange(d)));
  const weekRanges = Array.from(weekRangesSet).sort((a, b) => {
    const aDate = new Date(a.split(" - ")[0].split("/").reverse().join("-"));
    const bDate = new Date(b.split(" - ")[0].split("/").reverse().join("-"));
    return bDate - aDate;
  });
  return (
    <Card className="max-w-6xl mx-auto my-8">
      <div className="flex flex-wrap justify-between items-start gap-4 px-6 pt-6">
  <div>
    <h2 className="text-xl font-semibold">Weekly Payroll Report</h2>
  </div>
  <div className="w-64">
    <label className="text-sm mb-1 text-gray-500 block">Αρχική ημέρα εβδομάδας</label>
<select disabled defaultValue={weekStartDay} className="w-full bg-gray-100 text-gray-600 border border-gray-300 rounded px-2 py-1 cursor-not-allowed">
  <option>Δευτέρα</option>
  <option>Τρίτη</option>
  <option>Τετάρτη</option>
  <option>Πέμπτη</option>
  <option>Παρασκευή</option>
  <option>Σάββατο</option>
  <option>Κυριακή</option>
</select>
  </div>
  <div className="w-48">
    <label className="text-sm mb-1 text-gray-500 block">Έτος</label>
    <select className="w-full bg-white border border-gray-300 rounded px-2 py-1">
      {sortedYears.map((y) => (
        <option key={y}>{y}</option>
      ))}
    </select>
  </div>
  <div className="w-64">
    <label className="text-sm mb-1 text-gray-500 block">Εβδομάδα</label>
    <select className="w-full bg-white border border-gray-300 rounded px-2 py-1">
      {weekRanges.map((r, i) => (
        <option key={i}>{r}</option>
      ))}
    </select>
  </div>
</div>

<CardHeader>
        <h2 className="text-xl font-semibold">Weekly Payroll Report</h2>
      </CardHeader>
      <CardContent>
        {MOCK_PAYROLL.map((user) => {
          const dayMap = Object.fromEntries(user.days.map(d => [d.day, d]));

          const totalWeek = WEEKDAYS.reduce((sum, day) => {
            const d = dayMap[day];
            if (!d) return sum;
            const salary = getEffectiveSalary(user.salary_settings, d.date);
            const dayKey = getDayKey(day);
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
                  {WEEKDAYS.map((day, idx) => {
                    const d = dayMap[day];
                    if (!d) {
                      return (
                        <TableRow key={idx} className="h-10">
                          <TableCell>{day}</TableCell>
                          <TableCell colSpan={8} className="text-center text-gray-400">—</TableCell>
                        </TableRow>
                      );
                    }
                    const salary = getEffectiveSalary(user.salary_settings, d.date);
                    const dayKey = getDayKey(d.day);
                    const daily_salary = salary[`salary_${dayKey}`] || 0;
                    const overtime_rate = salary[`overtime_${dayKey}`] || 0;
                    const countsTowardWorkWeek = true; // since we allow any day
                    const underworked = countsTowardWorkWeek && d.worked_hours < d.norm_hours;
                    const isEligibleForOvertime = d.norm_hours > 0 && d.worked_hours >= d.norm_hours;
                    const actualOvertime = isEligibleForOvertime ? d.overtime : 0;
                    const overtime_pay = actualOvertime * overtime_rate;
                    const total_day = daily_salary + overtime_pay;
                    
                    return (
                      <TableRow key={idx} className={`h-10 ${underworked ? "bg-red-50" : ""}`}>
                        <TableCell>{d.day}</TableCell>
                        <TableCell>{new Date(d.date).toLocaleDateString('el-GR')}</TableCell>
                        <TableCell>{d.norm_hours}</TableCell>
                        <TableCell>
                          {d.worked_hours}
                          {underworked && <Badge variant="destructive" className="ml-2">Λιγότερο</Badge>}
                        </TableCell>
                        <TableCell>{actualOvertime}</TableCell>
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
        })}
      </CardContent>
    </Card>
  );
}
