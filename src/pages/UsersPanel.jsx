import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import UserFormModal from "./UserFormModalBasic"; // using safe modal

const API_BASE_URL = "http://localhost:3000";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("none");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [showFormModal, setShowFormModal] = useState(false);
  const [filters, setFilters] = useState({
    id: "",
    full_name: "",
    email: "",
    pin: "",
    role: "",
    department_name: "",
    group_name: "",
    created_at: "",
  });

  const fetchUsers = () => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/webusers`)
      .then((res) => {
        setUsers(res.data);
        setFilteredUsers(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch users", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = [...users].filter((user) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const field = user[key];
        return field && field.toString().toLowerCase().includes(value.toLowerCase());
      })
    );

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredUsers(result);
  }, [filters, users, sortConfig]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : prev.direction === "desc" ? null : "asc",
        };
      } else {
        return { key, direction: "asc" };
      }
    });
  };

  const renderGroupHeader = (label) => (
    <TableRow>
      <TableCell colSpan={8} className="bg-gray-100 font-bold">
        {label}
      </TableCell>
    </TableRow>
  );

  const groupedUsers =
    groupBy === "none"
      ? [{ group: null, data: filteredUsers }]
      : Object.entries(
          filteredUsers.reduce((acc, user) => {
            const key = user[groupBy] || "No Group";
            if (!acc[key]) acc[key] = [];
            acc[key].push(user);
            return acc;
          }, {})
        ).map(([group, data]) => ({ group, data }));

  const handleAddUser = async (newUser) => {
    await axios.post(`${API_BASE_URL}/webusers`, newUser);
    fetchUsers();
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Users</h2>
        <div className="space-x-2">
          <Button onClick={() => setShowFormModal(true)}>+ Add User</Button>
          <Button variant={groupBy === "none" ? "default" : "outline"} onClick={() => setGroupBy("none")}>Show All</Button>
          <Button variant={groupBy === "department_name" ? "default" : "outline"} onClick={() => setGroupBy("department_name")}>Group by Department</Button>
          <Button variant={groupBy === "role" ? "default" : "outline"} onClick={() => setGroupBy("role")}>Group by Role</Button>
          <Button variant={groupBy === "group_name" ? "default" : "outline"} onClick={() => setGroupBy("group_name")}>Group by Group</Button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {[
                { key: "id", label: "ID" },
                { key: "full_name", label: "Full Name" },
                { key: "email", label: "Email" },
                { key: "pin", label: "PIN" },
                { key: "role", label: "Role" },
                { key: "department_name", label: "Department" },
                { key: "group_name", label: "Group Name" },
                { key: "created_at", label: "Created At" },
              ].map((col) => (
                <TableHead
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="cursor-pointer select-none"
                >
                  {col.label}
                  {sortConfig.key === col.key &&
                    (sortConfig.direction === "asc" ? " ▲" : sortConfig.direction === "desc" ? " ▼" : "")}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              {Object.keys(filters).map((key) => (
                <TableCell key={key}>
                  <Input
                    placeholder="Filter"
                    value={filters[key]}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedUsers.map(({ group, data }) => (
              <>
                {group && renderGroupHeader(group)}
                {data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.pin}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{user.department_name}</TableCell>
                    <TableCell>{user.group_name ?? "–"}</TableCell>
                    <TableCell>
                      {user.created_at
                        ? dayjs(user.created_at).format("DD/MM/YYYY HH:mm:ss")
                        : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      )}
      <UserFormModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleAddUser}
      />
    </Card>
  );
}
