// TimeEntriesPanel.jsx — full updated version with Edit modal & overlap validation
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
// Accordion components removed - using custom expand/collapse implementation
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import API_CONFIG, { buildUrl } from "../config/api";


dayjs.extend(isoWeek);
dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimeEntriesPanel() {
  const [entries, setEntries] = useState([]);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [weekStart, setWeekStart] = useState(null);
  const [weekStartDay, setWeekStartDay] = useState(4); // Thursday
  const [nameFilter, setNameFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [groupBy, setGroupBy] = useState("none");
  const [editEntry, setEditEntry] = useState(null);
  const [modalData, setModalData] = useState({});
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState("");
  const [expandedUsers, setExpandedUsers] = useState([]);
  const [expandedDays, setExpandedDays] = useState({}); // Track individual day expansions: {userId-dayIndex: true/false}
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [approvalFilter, setApprovalFilter] = useState("all"); // 'all' | 'fullyApproved' | 'notFullyApproved'
  const [showSummary, setShowSummary] = useState(false);


  const [addModal, setAddModal] = useState({ open: false, user: null, date: null });
  const [addData, setAddData] = useState({
    clock_in_time: "",
    clock_out_time: "",
    project_id: "",
  });

  const yearsWithData = Array.from(
    new Set(availableWeeks.map(ws => ws.year()))
  ).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(() =>
    yearsWithData.length > 0 ? yearsWithData[0] : dayjs().year()
  );

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    if (entries.length > 0) {
      const weekStarts = Array.from(
        new Set(
          entries.map((e) =>
            getWeekStartFromDate(e.clock_in_time, weekStartDay).format("YYYY-MM-DD")
          )
        )
      ) // <-- close new Set here!
        .map((d) => dayjs(d))
        .sort((a, b) => b.unix() - a.unix());

      setAvailableWeeks(weekStarts);
      if (!weekStart && weekStarts.length > 0) {
        setWeekStart(weekStarts[0]);
      }
    }
  }, [entries, weekStartDay]);

  useEffect(() => {
    fetch(buildUrl(API_CONFIG.endpoints.projects))
      .then(res => res.json())
      .then(setProjects);
    
  }, []);

  const fetchEntries = async () => {
    const res = await fetch(buildUrl(API_CONFIG.endpoints.timeEntries));
    const data = await res.json();
    setEntries(data);
  };

  const getWeekStartFromDate = (dateStr, startDay) => {
    const date = dayjs(dateStr);
    const day = date.day();
    const offset = (7 + day - startDay) % 7;
    return date.subtract(offset, "day").startOf("day");
  };

  const getCustomWeekDays = () => {
    return Array(7).fill(null).map((_, i) => weekStart.add(i, "day"));
  };

  const getDuration = (start, end) => {
    if (!start || !end) return dayjs.duration(0);
    const diff = dayjs(end).diff(dayjs(start), "minute");
    return dayjs.duration(diff, "minute");
  };

  const formatDuration = (dur) => `${dur.hours()}h ${dur.minutes().toString().padStart(2, "0")}m`;

  const handleStatusChange = async (entryId, newStatus) => {
    try {
      const res = await fetch(buildUrl(`${API_CONFIG.endpoints.timeEntries}/${entryId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "admin",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchEntries();
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const openEditModal = (entry) => {
    setEditEntry(entry);
    setModalData({
      clock_in_time: dayjs.utc(entry.clock_in_time).tz("Europe/Athens").format("YYYY-MM-DDTHH:mm"),
      clock_out_time: dayjs.utc(entry.clock_out_time).tz("Europe/Athens").format("YYYY-MM-DDTHH:mm"),
      project_id: entry.project_id,
      status: entry.status,
    });

  };

  const closeModal = () => {
    setEditEntry(null);
    setModalData({});
  };

  // Add this helper if not already present:
  const hasOverlap = (entryId, userId, newStart, newEnd) => {
    const sameUserEntries = entries.filter(e => e.user_id === userId && e.id !== entryId);
    return sameUserEntries.some(e => {
      const existingStart = dayjs(e.clock_in_time);
      const existingEnd = dayjs(e.clock_out_time || existingStart);
      return dayjs(newStart).isBefore(existingEnd) && dayjs(newEnd).isAfter(existingStart);
    });
  };

  // In saveEdit:
  const saveEdit = async () => {
    const { clock_in_time, clock_out_time, project_id, status } = modalData;
    // Overlap check
    if (
      hasOverlap(
        editEntry.id,
        editEntry.user_id,
        clock_in_time,
        clock_out_time
      )
    ) {
      alert("This entry overlaps with another entry for this user.");
      return;
    }
    // Clock out after clock in check
    if (dayjs(clock_out_time).isBefore(dayjs(clock_in_time))) {
      alert("Clock out time cannot be before clock in time.");
      return;
    }

    const payload = {
      clock_in_time,
      clock_out_time,
      project_id: parseInt(project_id, 10),
      status,
    };

    try {
      const res = await fetch(buildUrl(`${API_CONFIG.endpoints.timeEntries}/${editEntry.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "admin",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchEntries();
        closeModal();
      } else {
        alert("Failed to update entry.");
      }
    } catch (err) {
      console.error(err);
      alert("Update failed.");
    }
  };

  const openAddModal = (user, date) => {
    setAddModal({ open: true, user, date });
    setAddData({
      clock_in_time: dayjs(date).format("YYYY-MM-DDT09:00"), // default 09:00
      clock_out_time: dayjs(date).format("YYYY-MM-DDT17:00"), // default 17:00
      project_id: "",
    });
  };

  const closeAddModal = () => {
    setAddModal({ open: false, user: null, date: null });
    setAddData({
      clock_in_time: "",
      clock_out_time: "",
      project_id: "",
    });
  };

  // User expansion handlers
  const toggleUserExpansion = (userId) => {
    setExpandedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Day expansion handlers
  const toggleDayExpansion = (userId, dayIndex) => {
    const key = `${userId}-${dayIndex}`;
    setExpandedDays(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isDayExpanded = (userId, dayIndex) => {
    return expandedDays[`${userId}-${dayIndex}`] || false;
  };

  const saveAdd = async () => {
    const { clock_in_time, clock_out_time, project_id } = addData;
    if (!clock_in_time || !clock_out_time || !project_id) {
      alert("All fields are required.");
      return;
    }
    // Overlap check
    if (
      hasOverlap(
        null,
        addModal.user.id,
        dayjs(clock_in_time).toISOString(),
        dayjs(clock_out_time).toISOString()
      )
    ) {
      alert("This entry overlaps with another entry for this user.");
      return;
    }
    // Clock out after clock in check
    if (dayjs(clock_out_time).isBefore(dayjs(clock_in_time))) {
      alert("Clock out time cannot be before clock in time.");
      return;
    }
    const payload = {
      user_id: addModal.user.id,
      clock_in_time: dayjs(clock_in_time).toISOString(),
      clock_out_time: dayjs(clock_out_time).toISOString(),
      project_id: parseInt(project_id, 10),
      status: "pending",
    };
    console.log("Payload:", payload); // <-- Add this line here
    try {
      const res = await fetch(buildUrl(API_CONFIG.endpoints.timeEntries), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "admin",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchEntries();
        closeAddModal();
      } else {
        alert("Failed to add entry.");
      }
    } catch (err) {
      console.error(err);
      alert("Add failed.");
    }
  };

  const weekDays = weekStart ? getCustomWeekDays() : [];
  const entriesInWeek = entries.filter((e) => weekStart && dayjs(e.clock_in_time).isBetween(weekStart, weekStart.add(7, "day"), null, "[)"));

  const allUserIds = Array.from(new Set(entriesInWeek.map((e) => e.user_id)));
  const users = allUserIds.map((id) => {
    const userEntries = entriesInWeek.filter((e) => e.user_id === id);
    return {
      id,
      name: userEntries[0]?.user_name || id,
      department: userEntries[0]?.department_name || "Unknown",
      group: userEntries[0]?.group_name || "Unknown",
      entries: userEntries,
    };
  });

  const allDepartments = Array.from(new Set(users.map((u) => u.department)));
  const departmentSummary = allDepartments.map((dept) => {
    const deptUsers = users.filter((u) => u.department === dept);
    const summary = {
      department: dept,
      fullyApproved: 0,
      notFullyApproved: 0,
    };

    deptUsers.forEach((user) => {
      const allApproved = user.entries.every((e) => e.status === "approved");
      if (allApproved) {
        summary.fullyApproved += 1;
      } else {
        summary.notFullyApproved += 1;
      }
    });

    return summary;
  });
  const allGroups = Array.from(new Set(users.map((u) => u.group)));

  const filteredUsers = users
    .filter((u) =>
      (nameFilter === "all" || u.id === nameFilter) &&
      (departmentFilter === "all" || u.department === departmentFilter) &&
      (groupFilter === "all" || u.group === groupFilter)
    )
    .filter((u) => {
      if (approvalFilter === "all") return true;
      const allApproved = u.entries.every((e) => e.status === "approved");
      return approvalFilter === "fullyApproved"
        ? allApproved
        : !allApproved;
    });

  const groupedUsers = (() => {
    if (groupBy === "none") return [{ label: null, users: filteredUsers }];
    const grouped = {};
    filteredUsers.forEach((user) => {
      const key = groupBy === "department" ? user.department : user.group;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(user);
    });
    return Object.entries(grouped).map(([label, users]) => ({ label, users }));
  })();

  const filteredWeeks = availableWeeks.filter(ws => ws.year() === selectedYear);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
  <div>
    <label className="block text-sm mb-1">Select Week:</label>
    <select
      className="border px-2 py-1 rounded"
      value={weekStart?.format("YYYY-MM-DD") || ""}
      onChange={(e) => setWeekStart(dayjs(e.target.value))}
    >
      {filteredWeeks.map((ws, i) => (
        <option key={i} value={ws.format("YYYY-MM-DD")}>Week of {ws.format("ddd DD/MM/YYYY")}</option>
      ))}
    </select>
    {weekStart && (
      <div className="text-xs text-gray-500 mt-1">
        Week starts: {weekStart.format("dddd DD/MM/YYYY")}
      </div>
    )}
  </div>

  <div>
    <label className="block text-sm mb-1">Week Starts On:</label>
    <select
      className="border px-2 py-1 rounded"
      value={weekStartDay}
      onChange={(e) => setWeekStartDay(Number(e.target.value))}
    >
      {WEEKDAYS.map((day, i) => (
        <option key={i} value={i}>{day}</option>
      ))}
    </select>
  </div>

  <div>
    <label className="block text-sm mb-1">Filter by User:</label>
    <select
      className="border px-2 py-1 rounded"
      value={nameFilter}
      onChange={(e) => setNameFilter(e.target.value)}
    >
      <option value="all">All</option>
      {users.map((u, i) => (
        <option key={i} value={u.id}>{u.name}</option>
      ))}
    </select>
  </div>

  <div>
    <label className="block text-sm mb-1">Filter by Department:</label>
    <select
      className="border px-2 py-1 rounded"
      value={departmentFilter}
      onChange={(e) => setDepartmentFilter(e.target.value)}
    >
      <option value="all">All</option>
      {allDepartments.map((d, i) => (
        <option key={i} value={d}>{d}</option>
      ))}
    </select>
  </div>

  <div>
    <label className="block text-sm mb-1">Filter by Group:</label>
    <select
      className="border px-2 py-1 rounded"
      value={groupFilter}
      onChange={(e) => setGroupFilter(e.target.value)}
    >
      <option value="all">All</option>
      {allGroups.map((g, i) => (
        <option key={i} value={g}>{g}</option>
      ))}
    </select>
  </div>

  <div>
    <label className="block text-sm mb-1">Group by:</label>
    <select
      className="border px-2 py-1 rounded"
      value={groupBy}
      onChange={(e) => setGroupBy(e.target.value)}
    >
      <option value="none">None</option>
      <option value="department">Department</option>
      <option value="group">Group</option>
    </select>
  </div>

  <div>
    <button
      className="bg-gray-200 px-3 py-1 rounded text-sm mt-6"
      onClick={() => {
        setNameFilter("all");
        setDepartmentFilter("all");
        setGroupFilter("all");
        setGroupBy("none");
        setApprovalFilter("all");
      }}
    >
      Clear All Filters
    </button>
  </div>
  <div className="flex gap-2 mt-6">
    <Button
      variant={approvalFilter === "fullyApproved" ? "default" : "outline"}
      onClick={() => setApprovalFilter("fullyApproved")}
    >
      Fully Approved
    </Button>
    <Button
      variant={approvalFilter === "notFullyApproved" ? "default" : "outline"}
      onClick={() => setApprovalFilter("notFullyApproved")}
    >
      Not Fully Approved
    </Button>
    <Button
      variant={approvalFilter === "all" ? "default" : "outline"}
      onClick={() => setApprovalFilter("all")}
    >
      Show All
    </Button>
  </div>
  <div>
  <button
    className="bg-gray-200 px-3 py-1 rounded text-sm mt-6"
    onClick={() => {
      if (isAllExpanded) {
        setExpandedUsers([]);
        setIsAllExpanded(false);
      } else {
        const allIds = users.map(u => u.id);
        setExpandedUsers(allIds);
        setIsAllExpanded(true);
      }
    }}
  >
    {isAllExpanded ? "Collapse All" : "Expand All"}
  </button>
</div>
<div className="mt-4">
  <Button
    variant="outline"
    onClick={() => setShowSummary(!showSummary)}
  >
    {showSummary ? "Hide Department Summary" : "Show Department Summary"}
  </Button>
</div>
{showSummary && (
  <Card className="w-full mt-4">
    <CardContent>
      <h2 className="text-lg font-semibold mb-2">Department Summary (This Week)</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead className="text-center">Fully Approved</TableHead>
            <TableHead className="text-center">Not Fully Approved</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departmentSummary.map((dept, i) => (
            <TableRow key={i}>
              <TableCell>{dept.department}</TableCell>
              <TableCell className="text-center">{dept.fullyApproved}</TableCell>
              <TableCell className="text-center">{dept.notFullyApproved}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)}
</div>
      {groupedUsers.map((section, sIdx) => (
        <div key={sIdx}>
          {section.label && <h2 className="text-xl font-semibold mb-4">{groupBy === "department" ? "Department" : "Group"}: {section.label}</h2>}
          {section.users.map((user) => (
            <Card key={user.id} className="mb-6">
              <CardContent>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <button
                    onClick={() => toggleUserExpansion(user.id)}
                    className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-sm font-bold"
                    title={expandedUsers.includes(user.id) ? "Collapse user" : "Expand user"}
                  >
                    {expandedUsers.includes(user.id) ? "−" : "+"}
                  </button>
                  {user.name}
                  <span className="ml-2 flex gap-1">
                    {weekDays.map((day, idx) => (
                      <button
                        key={idx}
                        className="bg-gray-100 border px-2 py-0.5 rounded text-xs hover:bg-blue-200"
                        title={`Add entry for ${day.format("ddd DD/MM/YYYY")}`}
                        onClick={() => openAddModal(user, day)}
                        type="button"
                      >
                        {day.format("ddd")[0]}{day.format("ddd")[1]}{day.format("ddd")[2]}
                      </button>
                    ))}
                  </span>
                </h3>
                {expandedUsers.includes(user.id) && (
                  <div className="space-y-2">
                    {weekDays.map((day, idx) => {
                      const dayEntries = user.entries.filter((e) =>
                        dayjs(e.clock_in_time).isSame(day, "day")
                      );
                      if (dayEntries.length === 0) return null;

                      const totalDuration = dayEntries.reduce(
                        (acc, e) => acc.add(getDuration(e.clock_in_time, e.clock_out_time)),
                        dayjs.duration(0)
                      );

                      const dayExpanded = isDayExpanded(user.id, idx);

                      return (
                        <div key={idx} className="border rounded-lg">
                          <button
                            onClick={() => toggleDayExpansion(user.id, idx)}
                            className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center"
                          >
                            <span>
                              {day.format("ddd DD/MM/YYYY")} — {dayEntries.length} entries
                            </span>
                            <span className="text-sm text-gray-600">
                              Total: {formatDuration(totalDuration)}
                            </span>
                          </button>
                          {dayExpanded && (
                            <div className="p-3 pt-0 border-t bg-gray-50">
                              <Table className="table-fixed w-full">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[50px]">Edit</TableHead>
                                    <TableHead className="w-[80px]">Clock In</TableHead>
                                    <TableHead className="w-[80px]">Clock Out</TableHead>
                                    <TableHead className="w-[90px]">Duration</TableHead>
                                    <TableHead className="w-[240px]">Project</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {dayEntries.map((entry, j) => (
                                    <TableRow key={j}>
                                      <TableCell className="w-[50px]">
                                        <button
                                          onClick={() => openEditModal(entry)}
                                          title="Edit"
                                        >
                                          ✏️
                                        </button>
                                      </TableCell>
                                      <TableCell className="w-[80px]">
                                        {dayjs
                                          .utc(entry.clock_in_time)
                                          .tz("Europe/Athens")
                                          .format("HH:mm")}
                                      </TableCell>
                                      <TableCell className="w-[80px]">
                                        {entry.clock_out_time
                                          ? dayjs
                                              .utc(entry.clock_out_time)
                                              .tz("Europe/Athens")
                                              .format("HH:mm")
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="w-[90px]">
                                        {entry.clock_out_time
                                          ? formatDuration(
                                              getDuration(
                                                dayjs.utc(entry.clock_in_time).tz("Europe/Athens"),
                                                dayjs.utc(entry.clock_out_time).tz("Europe/Athens")
                                              )
                                            )
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="w-[240px]">
                                        {entry.project_id} - {entry.project_name}
                                      </TableCell>
                                      <TableCell className="w-[100px]">
                                        <button
                                          onClick={() =>
                                            handleStatusChange(
                                              entry.id,
                                              entry.status === "approved" ? "pending" : "approved"
                                            )
                                          }
                                          className={`px-3 py-1 rounded text-sm font-semibold ${
                                            entry.status === "approved"
                                              ? "bg-blue-600 text-white"
                                              : "bg-gray-300 text-gray-800"
                                          }`}
                                        >
                                          {entry.status === "approved" ? "Approved" : "Pending"}
                                        </button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {editEntry && (
        <Dialog open onOpenChange={closeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit Entry for {editEntry.user_name} ({editEntry.user_id}) on {dayjs(editEntry.clock_in_time).format("dddd DD/MM/YYYY")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <label>Date</label>
              <Input value={dayjs(editEntry.clock_in_time).format("YYYY-MM-DD")} disabled />
              <label>Clock In</label>
              <Input
  type="time"
  value={dayjs(modalData.clock_in_time).format("HH:mm")}
  onChange={(e) => {
    const [hour, minute] = e.target.value.split(":").map(Number);
    const updated = dayjs(modalData.clock_in_time)
      .hour(hour)
      .minute(minute)
      .format("YYYY-MM-DDTHH:mm");
    setModalData((prev) => ({
      ...prev,
      clock_in_time: updated,
    }));
  }}
/>

              <label>Clock Out</label>
 <Input
  type="time"
  value={dayjs(modalData.clock_out_time).format("HH:mm")}
  onChange={(e) => {
    const [hour, minute] = e.target.value.split(":").map(Number);
    const updated = dayjs(modalData.clock_out_time)
      .hour(hour)
      .minute(minute)
      .format("YYYY-MM-DDTHH:mm");
    setModalData((prev) => ({
      ...prev,
      clock_out_time: updated,
    }));
  }}
/>


              <label>Project</label>
              <Input
                placeholder="Type to filter projects"
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="mb-2"
              />
              <select
                value={modalData.project_id}
                onChange={e => setModalData(prev => ({ ...prev, project_id: parseInt(e.target.value) }))}
                className="border px-2 py-1 rounded w-full"
              >
                <option value="">Select a project</option>
                {projects
                  .filter(
                    p =>
                      `${p.id} - ${p.title}`.toLowerCase().includes(projectFilter.toLowerCase())
                  )
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.title}
                    </option>
                  ))}
              </select>
              
              <label>Status</label>
              <select
                value={modalData.status}
                onChange={e => setModalData(prev => ({ ...prev, status: e.target.value }))}
                className="border px-2 py-1 rounded w-full"
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <DialogFooter className="mt-6 flex justify-between items-end">
              <div>
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                  onClick={async () => {
                    if (window.confirm("Are you sure you want to delete this entry?")) {
                      try {
                        const res = await fetch(buildUrl(`${API_CONFIG.endpoints.timeEntries}/${editEntry.id}`), {
                          method: "DELETE",
                          headers: {
                            "X-User-Id": "admin",
                          },
                        });
                        if (res.ok) {
                          fetchEntries();
                          closeModal();
                        } else {
                          alert("Failed to delete entry.");
                        }
                      } catch (err) {
                        alert("Delete failed.");
                      }
                    }
                  }}
                >
                  <span role="img" aria-label="delete">🗑️</span> Delete
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={closeModal} variant="outline">Cancel</Button>
                <Button onClick={saveEdit} className="bg-blue-600 text-white">
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {addModal.open && (
        <Dialog open onOpenChange={closeAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add Time Entry for {addModal.user.name} on {dayjs(addModal.date).format("dddd DD/MM/YYYY")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <label>Date</label>
              <Input value={dayjs(addModal.date).format("YYYY-MM-DD")} disabled />
              <label>Clock In</label>
              <Input
                type="time"
                value={dayjs(addData.clock_in_time).format("HH:mm")}
                onChange={e =>
                  setAddData(prev => ({
                    ...prev,
                    clock_in_time: dayjs(addModal.date)
                      .hour(Number(e.target.value.split(":")[0]))
                      .minute(Number(e.target.value.split(":")[1]))
                      .format("YYYY-MM-DDTHH:mm"),
                  }))
                }
              />
              <label>Clock Out</label>
              <Input
                type="time"
                value={dayjs(addData.clock_out_time).format("HH:mm")}
                onChange={e =>
                  setAddData(prev => ({
                    ...prev,
                    clock_out_time: dayjs(addModal.date)
                      .hour(Number(e.target.value.split(":")[0]))
                      .minute(Number(e.target.value.split(":")[1]))
                      .format("YYYY-MM-DDTHH:mm"),
                  }))
                }
              />
              <label>Project</label>
              <Input
                placeholder="Type to filter projects"
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="mb-2"
              />
              <select
                value={addData.project_id}
                onChange={e => setAddData(prev => ({ ...prev, project_id: parseInt(e.target.value) }))}
                className="border px-2 py-1 rounded w-full"
              >
                <option value="">Select a project</option>
                {projects
                  .filter(
                    p =>
                      `${p.id} - ${p.title}`.toLowerCase().includes(projectFilter.toLowerCase())
                  )
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.title}
                    </option>
                  ))}
              </select>
              
            </div>
            <DialogFooter>
              <Button onClick={closeAddModal} variant="outline">Cancel</Button>
              <Button onClick={saveAdd} className="bg-blue-600 text-white">
                Save Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
