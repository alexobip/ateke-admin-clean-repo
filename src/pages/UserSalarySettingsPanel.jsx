import React, { useState, useEffect } from "react";
import axios from "axios";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectItem } from '@/components/ui/select';

export default function UserSalarySettings() {
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    axios.get(`/api/users?search=${userSearch}`)
      .then(res => {
        console.log("Fetched users:", res.data);
        setUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        setUsers([]);
      });
  }, [userSearch]);

  const [salaryData, setSalaryData] = useState({
    effective_from: '',
    salary_mon: '',
    salary_tue: '',
    salary_wed: '',
    salary_thu: '',
    salary_fri: '',
    salary_sat: '',
    salary_sun: '',
    overtime_mon: '',
    overtime_tue: '',
    overtime_wed: '',
    overtime_thu: '',
    overtime_fri: '',
    overtime_sat: '',
    overtime_sun: '',
    norm_daily_hours: '8.0',
    away_work: '',
    is_driver: false,
    user_type_id: '',
    has_monthly_salary: false,
    monthly_salary: '',
    monthly_periods: '12',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return alert('Please select a user');
    const data = { ...salaryData, user_id: selectedUserId };
    try {
      await axios.post('/user-salary-settings', data);
      alert('Salary setting saved.');
    } catch (err) {
      console.error('Error saving:', err);
      alert('Failed to save.');
    }
  };

  return (
    <Card className="max-w-4xl mx-auto my-8">
      <CardHeader>
        <h2 className="text-xl font-semibold">User Salary Settings</h2>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search user..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            {Array.isArray(users) && users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name} ({user.id})
              </SelectItem>
            ))}
          </Select>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            value={salaryData.effective_from}
            onChange={(e) => setSalaryData({ ...salaryData, effective_from: e.target.value })}
            placeholder="Effective from"
          />
          <Input
            type="number"
            placeholder="Monday Salary (€)"
            value={salaryData.salary_mon}
            onChange={(e) => setSalaryData({ ...salaryData, salary_mon: e.target.value })}
          />
          {/* Add other inputs in similar pattern... */}
          <Input
            type="number"
            placeholder="Norm Daily Hours"
            value={salaryData.norm_daily_hours}
            onChange={(e) => setSalaryData({ ...salaryData, norm_daily_hours: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Monthly Salary (€)"
            value={salaryData.monthly_salary}
            onChange={(e) => setSalaryData({ ...salaryData, monthly_salary: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Monthly Periods (12 or 14)"
            value={salaryData.monthly_periods}
            onChange={(e) => setSalaryData({ ...salaryData, monthly_periods: e.target.value })}
          />
          <Button type="submit" className="col-span-2">Save Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
}
