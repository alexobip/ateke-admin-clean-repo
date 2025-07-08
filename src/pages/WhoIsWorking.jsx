import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function WhoIsWorking() {
  const [entries, setEntries] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [groupByDept, setGroupByDept] = useState(false);

  const [nameFilter, setNameFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("");

  const [sortBy, setSortBy] = useState("full_name");
  const [sortOrder, setSortOrder] = useState("asc");

  const fetchData = () => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/whoisworking`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((res) => {
        if (res.success) {
          setEntries(res.currentlyWorking || []);
        } else {
          alert("Failed to load data: " + (res.message || "unknown error"));
        }
      })
      .catch((err) => alert("Fetch error: " + err.message));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let data = [...entries];

    if (nameFilter.trim())
      data = data.filter((e) => e.full_name.toLowerCase().includes(nameFilter.toLowerCase()));
    if (departmentFilter.trim())
      data = data.filter((e) => e.department_name?.toLowerCase().includes(departmentFilter.toLowerCase()));
    if (projectFilter.trim())
      data = data.filter((e) => e.project_title?.toLowerCase().includes(projectFilter.toLowerCase()));
    if (workTypeFilter.trim())
      data = data.filter((e) => e.work_type_name?.toLowerCase().includes(workTypeFilter.toLowerCase()));

    data.sort((a, b) => {
      let valA = a[sortBy] ?? "";
      let valB = b[sortBy] ?? "";
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFiltered(data);
  }, [entries, nameFilter, departmentFilter, projectFilter, workTypeFilter, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const grouped = filtered.reduce((acc, entry) => {
    const dept = entry.department_name || "Unknown";
    acc[dept] = acc[dept] || [];
    acc[dept].push(entry);
    return acc;
  }, {});

  const GreenDot = () => (
    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Who's Working</h1>
        <div className="flex gap-2">
          <Button onClick={() => fetchData()}>🔄 Refresh</Button>
          <Button variant="outline" onClick={() => setGroupByDept(!groupByDept)}>
            {groupByDept ? "Ungroup" : "Group by Department"}
          </Button>
        </div>
      </div>
      <Card>
        <CardContent>
          {!groupByDept ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell onClick={() => handleSort("full_name")} className="cursor-pointer font-semibold">Name {sortBy === "full_name" && (sortOrder === "asc" ? "▲" : "▼")}</TableCell>
                    <TableCell onClick={() => handleSort("department_name")} className="cursor-pointer font-semibold">Department {sortBy === "department_name" && (sortOrder === "asc" ? "▲" : "▼")}</TableCell>
                    <TableCell onClick={() => handleSort("project_title")} className="cursor-pointer font-semibold">Project {sortBy === "project_title" && (sortOrder === "asc" ? "▲" : "▼")}</TableCell>
                    <TableCell onClick={() => handleSort("work_type_name")} className="cursor-pointer font-semibold">Work Type {sortBy === "work_type_name" && (sortOrder === "asc" ? "▲" : "▼")}</TableCell>
                    <TableCell onClick={() => handleSort("clock_in_time")} className="cursor-pointer font-semibold">Clock In {sortBy === "clock_in_time" && (sortOrder === "asc" ? "▲" : "▼")}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Input placeholder="Name" value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} /></TableCell>
                    <TableCell><Input placeholder="Department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} /></TableCell>
                    <TableCell><Input placeholder="Project" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} /></TableCell>
                    <TableCell><Input placeholder="Work Type" value={workTypeFilter} onChange={(e) => setWorkTypeFilter(e.target.value)} /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={entry.user_id}>
                      <TableCell>{entry.clock_in_time && <GreenDot />}{entry.full_name}</TableCell>
                      <TableCell>{entry.department_name}</TableCell>
                      <TableCell>{entry.project_title}</TableCell>
                      <TableCell>{entry.work_type_name}</TableCell>
                      <TableCell>{entry.clock_in_time ? format(new Date(entry.clock_in_time), "yyyy-MM-dd HH:mm") : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            Object.entries(grouped).map(([dept, users]) => {
              const filteredUsers = users.filter((entry) =>
                (!nameFilter || entry.full_name.toLowerCase().includes(nameFilter.toLowerCase())) &&
                (!departmentFilter || entry.department_name?.toLowerCase().includes(departmentFilter.toLowerCase())) &&
                (!projectFilter || entry.project_title?.toLowerCase().includes(projectFilter.toLowerCase())) &&
                (!workTypeFilter || entry.work_type_name?.toLowerCase().includes(workTypeFilter.toLowerCase()))
              );
              return (
                <div key={dept} className="mb-6">
                  <h2 className="text-lg font-bold mb-2">{dept}</h2>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Project</TableCell>
                        <TableCell>Work Type</TableCell>
                        <TableCell>Clock In</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((entry) => (
                        <TableRow key={entry.user_id}>
                          <TableCell>{entry.clock_in_time && <GreenDot />}{entry.full_name}</TableCell>
                          <TableCell>{entry.project_title}</TableCell>
                          <TableCell>{entry.work_type_name}</TableCell>
                          <TableCell>{entry.clock_in_time ? format(new Date(entry.clock_in_time), "yyyy-MM-dd HH:mm") : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
