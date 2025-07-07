import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";

export default function UserFormModal({ open, onOpenChange, onSubmit, initialData = null }) {
  const isEdit = Boolean(initialData);
  const [formData, setFormData] = useState({
    id: "",
    full_name: "",
    email: "",
    pin: "",
    role: "user",
    department_id: "",
    group_id: "",
    is_active: true,
  });

  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    if (initialData) setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    axios.get("/departments").then((res) => setDepartments(res.data));
    axios.get("/groups").then((res) => setGroups(res.data));
  }, []);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!isEdit && !/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(formData.id)) {
      alert("ID must be in the format xx.xx.xx.xxxx");
      return;
    }
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (err) {
      console.error("Error submitting user:", err);
      alert("Failed to save user");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            label="User ID"
            value={formData.id}
            disabled={isEdit}
            onChange={(e) => handleChange("id", e.target.value)}
            placeholder="50.00.13.1001"
          />
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => handleChange("full_name", e.target.value)}
          />
          <Input
            label="Email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
          <Input
            label="PIN"
            value={formData.pin}
            onChange={(e) => handleChange("pin", e.target.value)}
          />
          <Input
            label="Role"
            value={formData.role}
            onChange={(e) => handleChange("role", e.target.value)}
          />

          <select
            value={formData.department_id}
            onChange={(e) => handleChange("department_id", e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={formData.group_id}
            onChange={(e) => handleChange("group_id", e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>{isEdit ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
