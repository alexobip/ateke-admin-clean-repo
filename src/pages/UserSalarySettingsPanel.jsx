import React, { useState, useEffect } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function UserSalarySettingsPanel() {
  const [users, setUsers] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [salaryRecords, setSalaryRecords] = useState([]);
  const [useCustomDays, setUseCustomDays] = useState(false);
  const [useMonthlySalary, setUseMonthlySalary] = useState(false);
  const [baseSalary, setBaseSalary] = useState("");
  const [baseOvertime, setBaseOvertime] = useState("");

  const [salaryData, setSalaryData] = useState({
    effective_from: "",
    salary_mon: "", salary_tue: "", salary_wed: "", salary_thu: "",
    salary_fri: "", salary_sat: "", salary_sun: "",
    overtime_mon: "", overtime_tue: "", overtime_wed: "", overtime_thu: "",
    overtime_fri: "", overtime_sat: "", overtime_sun: "",
    norm_daily_hours: "8.0",
    away_work: "",
    is_driver: false,
    user_type_id: "",
    has_monthly_salary: false,
    monthly_salary: "",
    monthly_periods: "12",
  });

  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  useEffect(() => {
    axios.get("/api/users").then((res) => setUsers(res.data || []));
    axios.get("/api/user-types").then((res) => setUserTypes(res.data || []));
    axios.get("/user-salary-settings").then((res) => setSalaryRecords(res.data || []));
  }, []);

  useEffect(() => {
    if (!useCustomDays) {
      const updates = {};
      days.forEach((d) => {
        updates[`salary_${d}`] = baseSalary;
        updates[`overtime_${d}`] = baseOvertime;
      });
      setSalaryData((prev) => ({ ...prev, ...updates }));
    }
  }, [baseSalary, baseOvertime, useCustomDays]);

  useEffect(() => {
    setSalaryData(prev => ({
      ...prev,
      has_monthly_salary: useMonthlySalary,
      monthly_salary: useMonthlySalary ? prev.monthly_salary : "",
      monthly_periods: useMonthlySalary ? prev.monthly_periods : "12",
    }));
  }, [useMonthlySalary]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return alert("Please select a user");
    const data = { ...salaryData, user_id: selectedUserId };
    try {
      await axios.post("/user-salary-settings", data);
      alert("Salary setting saved.");
      window.location.reload();
    } catch (err) {
      console.error("Error saving:", err);
      alert("Failed to save.");
    }
  };

  const getUserName = (id) => {
    const u = users.find((u) => u.id === id);
    return u ? `${u.name} (${u.id})` : id;
  };

  const getUserTypeTitle = (id) => {
    const t = userTypes.find((t) => String(t.id) === String(id));
    return t ? t.title : id;
  };

  return (
    <Card className="max-w-6xl mx-auto my-8">
      <CardHeader><h2 className="text-xl font-semibold">User Salary Settings</h2></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 mb-10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Effective From</label>
              <Input type="date" value={salaryData.effective_from}
                onChange={(e) => setSalaryData({ ...salaryData, effective_from: e.target.value })}
              />
            </div>
          </div>

          <h4 className="text-md font-semibold mt-4">Daily Salary & Overtime (Base)</h4>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <label className="text-sm">Daily Salary (€)</label>
              <Input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Overtime (€)</label>
              <Input type="number" value={baseOvertime} onChange={(e) => setBaseOvertime(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox checked={useCustomDays} onCheckedChange={setUseCustomDays} />
            <span>Use different salary/overtime per day</span>
          </div>

          {useCustomDays && (
            <table className="w-full text-sm border rounded mt-4">
              <thead className="bg-gray-100">
                <tr><th>Day</th><th>Salary (€)</th><th>Overtime (€)</th></tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day}>
                    <td className="p-2 border font-medium capitalize">{day}</td>
                    <td className="p-2 border">
                      <Input type="number" value={salaryData[`salary_${day}`]} onChange={(e) => setSalaryData({ ...salaryData, [`salary_${day}`]: e.target.value })} />
                    </td>
                    <td className="p-2 border">
                      <Input type="number" value={salaryData[`overtime_${day}`]} onChange={(e) => setSalaryData({ ...salaryData, [`overtime_${day}`]: e.target.value })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h4 className="text-md font-semibold mt-6">General Settings</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium">User Type</label>
              <Select value={salaryData.user_type_id} onValueChange={(val) => setSalaryData({ ...salaryData, user_type_id: val })}>
                <SelectTrigger><SelectValue placeholder="Select user type" /></SelectTrigger>
                <SelectContent>
                  {userTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>{type.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium">Away Work (€)</label>
              <Input value={salaryData.away_work} onChange={(e) => setSalaryData({ ...salaryData, away_work: e.target.value })} />
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox checked={salaryData.is_driver} onCheckedChange={(val) => setSalaryData({ ...salaryData, is_driver: val })} />
              <span>Is Driver</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 mt-6 mb-2">
            <Checkbox checked={useMonthlySalary} onCheckedChange={setUseMonthlySalary} />
            <span>Has Monthly Salary</span>
          </div>

          {useMonthlySalary && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Monthly Salary (€)</label>
                <Input type="number" value={salaryData.monthly_salary}
                  onChange={(e) => setSalaryData({ ...salaryData, monthly_salary: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium">Monthly Periods (e.g., 12 or 14)</label>
                <Input type="number" value={salaryData.monthly_periods}
                  onChange={(e) => setSalaryData({ ...salaryData, monthly_periods: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="text-xs font-medium">Norm Daily Hours</label>
            <Input type="number" value={salaryData.norm_daily_hours}
              onChange={(e) => setSalaryData({ ...salaryData, norm_daily_hours: e.target.value })}
            />
          </div>

          <Button type="submit" className="mt-6">Save Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
}