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
    const [departments, setDepartments] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [useCustomDays, setUseCustomDays] = useState(false);
    const [useMonthlySalary, setUseMonthlySalary] = useState(false);
    const [baseSalary, setBaseSalary] = useState("");
    const [baseOvertime, setBaseOvertime] = useState("");
    const [salaryRecords, setSalaryRecords] = useState([]);
    const [userSalaryHistory, setUserSalaryHistory] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    
    const selectedUser = users.find(u => u.id === selectedUserId);
    const userTypeId = selectedUser?.user_type_id;


    const [salaryData, setSalaryData] = useState({
      effective_from: "",
      salary_mon: "", salary_tue: "", salary_wed: "", salary_thu: "",
      salary_fri: "", salary_sat: "", salary_sun: "",
      overtime_mon: "", overtime_tue: "", overtime_wed: "", overtime_thu: "",
      overtime_fri: "", overtime_sat: "", overtime_sun: "",
      norm_daily_hours: "8.0",
      away_work: "",
      is_driver: false,
      has_monthly_salary: false,
      monthly_salary: 0,
      monthly_periods: "12",
      days_per_week: "5", // Default to 5 days per week
    });

    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    useEffect(() => {
 const type = Number(userTypeId);


  if (type === 1) {
    setUseMonthlySalary(true);
    setSalaryData(prev => ({
      ...prev,
      has_monthly_salary: true,
      monthly_salary: prev.monthly_salary || "", // preserve if already typed
      monthly_periods: "14",
      norm_daily_hours: "8",
    }));
  } else if (type === 2) {
    setUseMonthlySalary(true);
    setSalaryData(prev => ({
      ...prev,
      has_monthly_salary: true,
      monthly_salary: prev.monthly_salary || "",
      monthly_periods: "12",
      norm_daily_hours: "8",
    }));
  } else if (type === 3) {
    setUseMonthlySalary(false);
    setSalaryData(prev => ({
      ...prev,
      has_monthly_salary: false,
      monthly_salary: "",
      monthly_periods: "14",
      norm_daily_hours: "8.5",
    }));
  }
}, [userTypeId]);


    useEffect(() => {
      axios.get("/api/user-types").then(res => setUserTypes(res.data || []));
      axios.get("/api/departments").then(res => setDepartments(res.data || []));
      axios.get("/api/groups").then(res => setGroups(res.data || []));
    
    }, []);

    useEffect(() => {
  axios.get("http://localhost:3000/webusers").then(res => setUsers(res.data || []));
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
  const type = Number(userTypeId);

  const isEditable = ![1, 2, 3].includes(type);

  setSalaryData(prev => ({
    ...prev,
    has_monthly_salary: useMonthlySalary,
    monthly_salary: useMonthlySalary ? prev.monthly_salary : "",
    monthly_periods: useMonthlySalary
      ? (prev.monthly_periods || "12")
      : (isEditable ? "" : prev.monthly_periods),
  }));
}, [useMonthlySalary, userTypeId]);



useEffect(() => {
  if (selectedUserId) {
    axios.get(`/user-salary-settings?user_id=${selectedUserId}`)
      .then(res => {
        const history = res.data || [];
        setUserSalaryHistory(history);

        if (history.length > 0) {
          const last = history[0]; // most recent
          const preload = { ...last };

          // Make sure daily salary/overtime fields are safely populated
          days.forEach((d) => {
            preload[`salary_${d}`] = last[`salary_${d}`] || "";
            preload[`overtime_${d}`] = last[`overtime_${d}`] || "";
          });

          setSalaryData({
  ...preload,
  effective_from: "", // ✅ leave the date blank
  has_monthly_salary: !!last.monthly_salary,
  monthly_salary: last.monthly_salary || "",
  monthly_periods: last.monthly_periods || "12",
});



          setUseMonthlySalary(!!last.monthly_salary);
          setUseCustomDays(!!(last.salary_tue && last.salary_wed));
          setBaseSalary("");      // Leave empty by default
          setBaseOvertime("");    // Leave empty by default
        }
      })
      .catch(err => {
        console.error("Failed to fetch user salary history:", err);
        setUserSalaryHistory([]);
      });
  } else {
    setUserSalaryHistory([]);
  }
}, [selectedUserId]);

    
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!selectedUserId) return alert("Please select a user");
      if (!salaryData.effective_from) {
  alert("Please select an effective start date.");
  return;
}

      const type = Number(userTypeId);

// 1. Check if monthly salary is required
if ((type === 1 || type === 2) && !salaryData.monthly_salary) {
  alert("Monthly salary is required for this user type.");
  return;
}

// 2. Check if away_work is required for type 3
if (type === 3 && !salaryData.away_work) {
  alert("Away Work is required for user type 3.");
  return;
}

// 3. Check if all salary_X fields are filled
for (const d of days) {
  if (!salaryData[`salary_${d}`]) {
    alert(`Base salary for ${d.toUpperCase()} is required.`);
    return;
  }
}

      const filledData = { ...salaryData };
days.forEach(day => {
  if (!filledData[`overtime_${day}`]) {
    filledData[`overtime_${day}`] = "0";
  }
});

const data = { ...filledData, user_id: selectedUserId, effective_from: salaryData.effective_from, };

      // Check for duplicate date for this user
      const normalizeDate = (dateStr) => {
  return new Date(dateStr).toISOString().split("T")[0];
};

const selectedDate = normalizeDate(salaryData.effective_from);

const duplicate = userSalaryHistory.some((rec) => {
  const recDate = normalizeDate(rec.effective_from);
  return recDate === selectedDate;
});

if (duplicate) {
  alert("Υπάρχει ήδη καταχωρημένη ρύθμιση μισθού για αυτήν την ημερομηνία. Παρακαλώ επέλεξε διαφορετική.");
  return;
}

      try {
        await axios.post("/user-salary-settings", data);
        alert("Salary setting saved.");

        // Re-fetch salary history for the selected user
        const res = await axios.get(`/user-salary-settings?user_id=${selectedUserId}`);
        setUserSalaryHistory(res.data || []);

        // Clear form fields
        setSelectedUserId("");
        setUserSearch("");
        setBaseSalary("");
        setBaseOvertime("");
        setUseCustomDays(false);
        setUseMonthlySalary(false);
        setSalaryData({
          effective_from: "",
          salary_mon: "", salary_tue: "", salary_wed: "", salary_thu: "",
          salary_fri: "", salary_sat: "", salary_sun: "",
          overtime_mon: "", overtime_tue: "", overtime_wed: "", overtime_thu: "",
          overtime_fri: "", overtime_sat: "", overtime_sun: "",
          norm_daily_hours: "8.0",
          away_work: "",
          is_driver: false,
          has_monthly_salary: false,
          monthly_salary: 0,
          monthly_periods: "12",
          days_per_week: "5",
        });

      } catch (err) {
        console.error("Error saving:", err);
        alert("Failed to save.");
      }
    };

    const getUserName = (id) => {
      const u = users.find((u) => u.id === id);
      return u ? `${u.full_name} (${u.id})` : id;
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

            <div className="mb-4">
  <label className="text-xs font-medium">User</label>
  <div className="relative">
  <Input
    placeholder="Search user..."
    value={userSearch}
    onChange={(e) => setUserSearch(e.target.value)}
    className="mb-2"
  />
  <div className="flex items-center gap-4">
    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
      <SelectTrigger className="max-w-[300px]">
        <SelectValue placeholder="Select user" />
      </SelectTrigger>
      <SelectContent>
        {users
          .filter((user) =>
            user.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
            user.id.toLowerCase().includes(userSearch.toLowerCase())
          )
          .map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.full_name} ({user.id})
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
    {selectedUser && (
      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
        <span className="text-sm text-blue-700 font-medium">
          User Type: {selectedUser.user_type_title || 'N/A'}
        </span>
      </div>
    )}
  </div>
</div>

</div>


            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium">Effective From</label>
                <Input type="date" value={salaryData.effective_from}
                  onChange={(e) => setSalaryData({ ...salaryData, effective_from: e.target.value })} />
              </div>
            </div>

            <h4 className="text-md font-semibold mt-6">Daily Salary & Overtime</h4>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label className="text-sm">Base Daily Salary (€)</label>
                <Input
  type="number"
  value={baseSalary}
  onChange={(e) => setBaseSalary(e.target.value)}
  className="max-w-[200px]"
/>
              </div>
              <div>
                <label className="text-sm">Base Overtime (€)</label>
                <Input
  type="number"
  value={baseOvertime}
  onChange={(e) => setBaseOvertime(e.target.value)}
  className="max-w-[200px]"
/>
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <Checkbox checked={useCustomDays} onCheckedChange={setUseCustomDays} />
              <span>Use different salary/overtime per day</span>
            </div>

            {useCustomDays && (
              <table className="w-full text-sm border rounded mt-2">
                <thead className="bg-gray-100">
                  <tr><th>Day</th><th>Salary (€)</th><th>Overtime (€)</th></tr>
                </thead>
                <tbody>
                  {days.map(day => (
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
                <label className="text-xs font-medium">Away Work (€)</label>
                <Input
  value={salaryData.away_work}
  onChange={(e) => setSalaryData({ ...salaryData, away_work: e.target.value })}
  className="max-w-[200px]"
/>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox checked={salaryData.is_driver} onCheckedChange={(val) => setSalaryData({ ...salaryData, is_driver: val })} />
                <span>Is Driver</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-6 mb-2">
              <Checkbox
  checked={useMonthlySalary}
  disabled={["1", "2", "3"].includes(String(userTypeId))}
  className="opacity-60 cursor-not-allowed"
/>
<span className="text-gray-500">Has Monthly Salary</span>

            </div>

            {useMonthlySalary && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Monthly Salary (€)</label>
                  <Input type="number" value={salaryData.monthly_salary}
                    onChange={(e) => setSalaryData({ ...salaryData, monthly_salary: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium">Monthly Periods (12/14)</label>
                  <Select
  disabled={
    String(userTypeId) === "1" ||
    String(userTypeId) === "2" ||
    (!useMonthlySalary && String(userTypeId) !== "3")
  }
  value={salaryData.monthly_periods}
  onValueChange={(val) => setSalaryData({ ...salaryData, monthly_periods: val })}
>
  <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="12">12</SelectItem>
    <SelectItem value="14">14</SelectItem>
  </SelectContent>
</Select>

                </div>
              </div>
            )}

            <div className="mt-4 flex gap-6 items-end">
  <div>
    <label className="text-xs font-medium">Norm Daily Hours</label>
    <Input
      type="number"
      className="max-w-[150px]"
      value={salaryData.norm_daily_hours}
      onChange={(e) =>
        setSalaryData({ ...salaryData, norm_daily_hours: e.target.value })
      }
    />
  </div>

  <div>
    <label className="text-xs font-medium">Days per Week</label>
    <Input
      type="number"
      className="max-w-[150px]"
      value={salaryData.days_per_week}
      onChange={(e) =>
        setSalaryData({ ...salaryData, days_per_week: e.target.value })
      }
    />
  </div>
</div>


            <Button type="submit" className="mt-6">Save Settings</Button>
          </form>
{userSalaryHistory.length > 0 && (
  <div className="mt-10 overflow-x-auto w-full border border-gray-200 rounded-lg">
  <h3 className="text-lg font-semibold mb-4 px-2 pt-2">Existing Salary Records for User</h3>
  <div className="min-w-[1200px]">
    <table className="w-full text-sm border-collapse">
      <thead className="bg-gray-100 text-xs">
  <tr>
    <th className="p-2 border">ID</th>
    <th className="p-2 border">User ID</th>
    <th className="p-2 border">Effective From

      {selectedUser && (
  <div className="mt-1 text-sm text-gray-600">
    Τύπος χρήστη: <strong>{getUserTypeTitle(selectedUser.user_type_id)}</strong>
  </div>
)}
    </th>
    {days.map(d => (
      <th key={`s_${d}`} className="p-2 border capitalize">Salary {d}</th>
    ))}
    {days.map(d => (
      <th key={`o_${d}`} className="p-2 border capitalize">Overtime {d}</th>
    ))}
    <th className="p-2 border">Norm Hours</th>
    <th className="p-2 border">Monthly Salary</th>
    <th className="p-2 border">Monthly Periods</th>
    <th className="p-2 border">Away Work</th>
    <th className="p-2 border">Driver</th>
    <th className="p-2 border">User Type</th>
    <th className="p-2 border">Has Monthly</th>
    <th className="p-2 border">Created At</th>
    <th className="p-2 border">Days/Week</th>
  </tr>
</thead>
      <tbody>
  {userSalaryHistory.map((record, index) => (
    <tr key={index}>
      <td className="p-2 border">{record.id}</td>
      <td className="p-2 border">{record.user_id}</td>
      <td className="p-2 border">
  {record.effective_from
    ? new Date(record.effective_from).toLocaleDateString("el-GR")
    : ""}
</td>
      {days.map(d => (
        <td key={`sval_${d}_${index}`} className="p-2 border">{record[`salary_${d}`]}</td>
      ))}
      {days.map(d => (
        <td key={`oval_${d}_${index}`} className="p-2 border">{record[`overtime_${d}`]}</td>
      ))}
      <td className="p-2 border">{record.norm_daily_hours}</td>
      <td className="p-2 border">{record.monthly_salary}</td>
      <td className="p-2 border">{record.monthly_periods}</td>
      <td className="p-2 border">{record.away_work}</td>
      <td className="p-2 border">{record.is_driver ? "Yes" : "No"}</td>
      <td className="p-2 border">{selectedUser ? getUserTypeTitle(selectedUser.user_type_id) : "N/A"}</td>
      <td className="p-2 border">{record.has_monthly_salary ? "Yes" : "No"}</td>
      <td className="p-2 border">{record.created_at ? new Date(record.created_at).toLocaleString("el-GR") : ""}</td>
      <td className="p-2 border">{record.days_per_week}</td>
    </tr>
  ))}
</tbody>

    </table>
  </div>
</div>


)}


        </CardContent>
      </Card>
    );
  }