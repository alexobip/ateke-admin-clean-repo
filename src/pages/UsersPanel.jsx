import React, { useEffect, useState } from "react";
import axios from "axios";
import { Pencil } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import UserFormModal from "./UserFormModalBasic";
import dayjs from "dayjs";

const API_BASE_URL = "http://localhost:3000";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filters, setFilters] = useState({
    id: "",
    full_name: "",
    email: "",
    pin: "",
    role_name: "",
    department_name: "",
    group_name: "",
    created_at: "",
  });
  const [groupBy, setGroupBy] = useState("none");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showFormModal, setShowFormModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/webusers`);
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (error) {
      console.error("Error fetching users", error);
    }
  };

  useEffect(() => {
    const result = users.filter((user) =>
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return user[key]?.toString().toLowerCase().includes(value.toLowerCase());
      })
    );
    setFilteredUsers(result);
  }, [filters, users]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddUser = async (userData) => {
    await axios.post(`${API_BASE_URL}/webusers`, userData);
    fetchUsers();
  };

  const handleEditUser = (user) => {
    setEditUser(user);
    setShowFormModal(true);
  };

  const toggleGroup = (group) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const groupedUsers =
    groupBy === "none"
      ? [{ group: null, data: filteredUsers }]
      : Object.entries(
          filteredUsers.reduce((acc, user) => {
            const key = user[groupBy] || "Χωρίς Ομάδα";
            if (!acc[key]) acc[key] = [];
            acc[key].push(user);
            return acc;
          }, {})
        ).map(([group, data]) => ({ group, data }));

  const renderGroupHeader = (label) => (
    <TableRow className="bg-muted font-semibold text-sm">
      <TableCell colSpan={9}>
        <div className="flex justify-between items-center">
          {label}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleGroup(label)}
          >
            {collapsedGroups[label] ? "+" : "−"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <Card>
      <div className="flex justify-between items-center px-6 pt-6">
        <h2 className="text-xl font-bold">Users</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setGroupBy("none")}>
            Show All
          </Button>
          <Button
            variant={groupBy === "department_name" ? "secondary" : "outline"}
            onClick={() => setGroupBy("department_name")}
          >
            Group by Department
          </Button>
          <Button
            variant={groupBy === "role_name" ? "secondary" : "outline"}
            onClick={() => setGroupBy("role_name")}
          >
            Group by Role
          </Button>
          <Button
            variant={groupBy === "group_name" ? "secondary" : "outline"}
            onClick={() => setGroupBy("group_name")}
          >
            Group by Group
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditUser(null);
              setShowFormModal(true);
            }}
          >
            + Add User
          </Button>
        </div>
      </div>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Edit</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
            <TableRow>
              <TableCell />
              <TableCell>
                <Input
                  placeholder="Filter"
                  value={filters.id}
                  onChange={(e) => handleFilterChange("id", e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Filter"
                  value={filters.full_name}
                  onChange={(e) => handleFilterChange("full_name", e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Filter"
                  value={filters.email}
                  onChange={(e) => handleFilterChange("email", e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Filter"
                  value={filters.pin}
                  onChange={(e) => handleFilterChange("pin", e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Filter"
                  value={filters.role_name}
                  onChange={(e) => handleFilterChange("role_name", e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Filter"
                  value={filters.department_name}
                  onChange={(e) => handleFilterChange("department_name", e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Filter"
                  value={filters.group_name}
                  onChange={(e) => handleFilterChange("group_name", e.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  placeholder="Filter"
                  value={filters.created_at}
                  onChange={(e) => handleFilterChange("created_at", e.target.value)}
                />
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {groupedUsers.map(({ group, data }) => (
              <React.Fragment key={group || "none"}>
                {group && renderGroupHeader(group)}
                {!collapsedGroups[group] &&
                  data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.pin}</TableCell>
                      <TableCell>{user.role_name}</TableCell>
                      <TableCell>{user.department_name}</TableCell>
                      <TableCell>{user.group_name ?? "–"}</TableCell>
                      <TableCell>
                        {user.created_at
                          ? dayjs(user.created_at).format("DD/MM/YYYY HH:mm:ss")
                          : ""}
                      </TableCell>
                    </TableRow>
                  ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <UserFormModal
        open={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditUser(null);
        }}
        onSubmit={handleAddUser}
        user={editUser}
      />
    </Card>
  );
}
