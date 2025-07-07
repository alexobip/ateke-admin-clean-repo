import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:3000";

export default function UserFormModal({ open, onClose, onSubmit, userToEdit }) {
  const [formData, setFormData] = useState({
    id: "",
    full_name: "",
    email: "",
    pin: "",
    role: "",
    department_id: "",
    group_id: "",
    is_active: true,
  });

  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (userToEdit) {
      setFormData(userToEdit);
    } else {
      setFormData({
        id: "",
        full_name: "",
        email: "",
        pin: "",
        role: "",
        department_id: "",
        group_id: "",
        is_active: true,
      });
    }
  }, [userToEdit]);

  useEffect(() => {
    if (open) {
      axios
        .get(`${API_BASE_URL}/departments`)
        .then((res) => setDepartments(Array.isArray(res.data) ? res.data : []))
        .catch(() => setDepartments([]));

      axios
        .get(`${API_BASE_URL}/groups`)
        .then((res) => setGroups(Array.isArray(res.data) ? res.data : []))
        .catch(() => setGroups([]));

      axios
        .get(`${API_BASE_URL}/roles`)
        .then((res) => setRoles(Array.isArray(res.data) ? res.data : []))
        .catch(() => setRoles([]));
    }
  }, [open]);

  const handleChange = (key, value) => {
    if (["role", "department_id", "group_id"].includes(key)) {
      setFormData((prev) => ({ ...prev, [key]: parseInt(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmit = async () => {
    const errors = [];

    if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(formData.id)) {
      errors.push("User ID must be in the format xx.xx.xx.xxxx");
    }

    if (!formData.email.trim()) {
      errors.push("Email is required");
    }

    if (!formData.pin.trim()) {
      formData.pin = "1234";
    } else if (!/^\d{4}$/.test(formData.pin)) {
      errors.push("PIN must be exactly 4 digits");
    }

    if (!formData.department_id) {
      errors.push("Department is required");
    }

    if (!formData.group_id) {
      errors.push("Group is required");
    }

    if (!formData.role) {
      errors.push("Role is required");
    }

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    try {
      await onSubmit(formData);
      alert(userToEdit ? "✅ User successfully updated" : "✅ User successfully added");
      onClose();
    } catch (err) {
      alert("❌ Failed to save user. Check your input or try again.");
      console.error("Submit error:", err);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-md p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">{userToEdit ? "Edit User" : "Add User"}</h2>

        <input
          className={`w-full mb-2 p-2 border rounded ${userToEdit ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
          placeholder="User ID (xx.xx.xx.xxxx)"
          value={formData.id}
          onChange={(e) => handleChange("id", e.target.value)}
          disabled={!!userToEdit}
        />

        <input
          className="w-full mb-2 p-2 border rounded"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={(e) => handleChange("full_name", e.target.value)}
        />

        <input
          className="w-full mb-2 p-2 border rounded"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />

        <input
          className="w-full mb-2 p-2 border rounded"
          placeholder="PIN (defaults to 1234 if left blank)"
          value={formData.pin}
          onChange={(e) => handleChange("pin", e.target.value)}
        />

        <select
          className="w-full mb-2 p-2 border rounded"
          value={formData.role}
          onChange={(e) => handleChange("role", e.target.value)}
        >
          <option value="">Select Role</option>
          {Array.isArray(roles) &&
            roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
        </select>

        <select
          className="w-full mb-2 p-2 border rounded"
          value={formData.department_id}
          onChange={(e) => handleChange("department_id", e.target.value)}
        >
          <option value="">Select Department</option>
          {Array.isArray(departments) &&
            departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>

        <select
          className="w-full mb-2 p-2 border rounded"
          value={formData.group_id}
          onChange={(e) => handleChange("group_id", e.target.value)}
        >
          <option value="">Select Group</option>
          {Array.isArray(groups) &&
            groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
        </select>

        <div className="flex justify-end mt-4 space-x-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
