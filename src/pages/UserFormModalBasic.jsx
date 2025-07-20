import React, { useState, useEffect } from "react";
import Modal from "../components/ui/Modal";
import axios from "axios";
import API_CONFIG, { buildUrl } from "../config/api";

const UserFormModalBasic = ({ isOpen, onClose, onSubmit, initialData = {} }) => {
  const [formData, setFormData] = useState({
    id: "",
    full_name: "",
    email: "",
    pin: "",
    role: "",
    department_id: "",
    group_id: "",
    is_active: true,
    user_type_id: ""
  });

  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const isEditMode = !!initialData?.id;

  useEffect(() => {
    if (isOpen) {
      setFormData({
        id: initialData?.id || "",
        full_name: initialData?.full_name || "",
        email: initialData?.email || "",
        pin: initialData?.pin || "",
        role: initialData?.role || "",
        department_id: initialData?.department_id || "",
        group_id: initialData?.group_id || "",
        is_active: initialData?.is_active ?? true,
        user_type_id: initialData?.user_type_id || ""
      });

      axios.get(buildUrl(API_CONFIG.endpoints.departments)).then((res) => setDepartments(res.data));
      axios.get(buildUrl(API_CONFIG.endpoints.groups)).then((res) => setGroups(res.data));
      axios.get(buildUrl(API_CONFIG.endpoints.roles)).then((res) => setRoles(res.data));
      axios.get(buildUrl(API_CONFIG.endpoints.userTypes)).then((res) => setUserTypes(res.data));
    }
  }, [isOpen, initialData]);

  const handleChange = (key, value) => {
    if (["role", "department_id", "group_id", "user_type_id"].includes(key)) {
      setFormData((prev) => ({ ...prev, [key]: parseInt(value, 10) }));
    } else if (key === "is_active") {
      setFormData((prev) => ({ ...prev, [key]: value === "true" }));
    } else {
      setFormData((prev) => ({ ...prev, [key]: value }));
    }
  };

  const formatUserIdInput = (value) => {
    const numbersOnly = value.replace(/\D/g, "").slice(0, 10); // max 10 digits
    const parts = [];
    if (numbersOnly.length > 0) parts.push(numbersOnly.slice(0, 2));
    if (numbersOnly.length > 2) parts.push(numbersOnly.slice(2, 4));
    if (numbersOnly.length > 4) parts.push(numbersOnly.slice(4, 6));
    if (numbersOnly.length > 6) parts.push(numbersOnly.slice(6, 10));
    return parts.join(".");
  };

  const handleSubmit = () => {
    const errors = [];

    if (!formData.id) errors.push("User ID is required");
    if (!formData.full_name) errors.push("Full name is required");
    if (!formData.email) errors.push("Email is required");
    if (!formData.pin) errors.push("PIN is required");
    if (!formData.role) errors.push("Role is required");
    if (!formData.department_id) errors.push("Department is required");
    if (!formData.group_id) errors.push("Group is required");
    if (!formData.user_type_id) errors.push("User type is required");

    const idPattern = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/;
    if (!idPattern.test(formData.id)) {
      alert("Το User ID πρέπει να είναι της μορφής: xx.xx.xx.xxxx");
      return;
    }

    if (errors.length > 0) {
      alert("Please fill in the following fields:\n" + errors.join("\n"));
      return;
    }

    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4 space-y-3">
        <h2 className="text-xl font-semibold">User Form</h2>

        <input
          className="w-full p-2 border rounded"
          placeholder="xx.xx.xx.xxxx"
          value={formData.id}
          disabled={isEditMode}
          onChange={(e) => {
            const formatted = formatUserIdInput(e.target.value);
            handleChange("id", formatted);
          }}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Full Name"
          value={formData.full_name}
          onChange={(e) => handleChange("full_name", e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="PIN"
          value={formData.pin}
          onChange={(e) => handleChange("pin", e.target.value)}
        />

        <select
          className="w-full p-2 border rounded"
          value={formData.role}
          onChange={(e) => handleChange("role", e.target.value)}
        >
          <option value="">Select Role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          className="w-full p-2 border rounded"
          value={formData.department_id}
          onChange={(e) => handleChange("department_id", e.target.value)}
        >
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          className="w-full p-2 border rounded"
          value={formData.group_id}
          onChange={(e) => handleChange("group_id", e.target.value)}
        >
          <option value="">Select Group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          className="w-full p-2 border rounded bg-gray-100"
          value={formData.user_type_id}
          onChange={(e) => handleChange("user_type_id", e.target.value)}
          disabled={isEditMode}
        >
          <option value="">Select User Type</option>
          {userTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>

        <select
          className="w-full p-2 border rounded"
          value={formData.is_active}
          onChange={(e) => handleChange("is_active", e.target.value)}
        >
          <option value={true}>Active</option>
          <option value={false}>Inactive</option>
        </select>

        <div className="flex justify-end pt-4 space-x-2">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">
            Cancel
          </button>
          <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UserFormModalBasic;
