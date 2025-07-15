// TimeEntriesPanel.jsx — full updated version with Edit modal & overlap validation
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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

dayjs.extend(isoWeek);
dayjs.extend(duration);
dayjs.extend(isBetween);

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
  const [workTypes, setWorkTypes] = useState([]);
  const [projectFilter, setProjectFilter] = useState("");

  const [addModal, setAddModal] = useState({ open: false, user: null, date: null });
  const [addData, setAddData] = useState({
    clock_in_time: "",
    clock_out_time: "",
    project_id: "",
    work_type_id: "",
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
    fetch("http://localhost:3000/webProjects")
      .then(res => res.json())
      .then(setProjects);
    fetch("http://localhost:3000/work-types") // <-- fix here
      .then(res => res.json())
      .then(setWorkTypes);
  }, []);

  const fetchEntries = async () => {
    const res = await fetch(`http://localhost:3000/web-timeentries`);
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
      const res = await fetch(`http://localhost:3000/web-timeentries/${entryId}`, {
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
      clock_in_time: entry.clock_in_time,
      clock_out_time: entry.clock_out_time,
      project_id: entry.project_id,
      work_type_id: entry.work_type_id,
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
    const { clock_in_time, clock_out_time, project_id, work_type_id, status } = modalData;
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
      work_type_id: parseInt(work_type_id, 10),
      status,
    };

    try {
      const res = await fetch(`http://localhost:3000/web-timeentries/${editEntry.id}`, {
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
      work_type_id: "",
    });
  };

  const closeAddModal = () => {
    setAddModal({ open: false, user: null, date: null });
    setAddData({
      clock_in_time: "",
      clock_out_time: "",
      project_id: "",
      work_type_id: "",
    });
  };

  const saveAdd = async () => {
    const { clock_in_time, clock_out_time, project_id, work_type_id } = addData;
    if (!clock_in_time || !clock_out_time || !project_id || !work_type_id) {
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
      work_type_id: parseInt(work_type_id, 10),
      status: "pending",
    };
    console.log("Payload:", payload); // <-- Add this line here
    try {
      const res = await fetch("http://localhost:3000/web-timeentries", {
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
  const allGroups = Array.from(new Set(users.map((u) => u.group)));

  const filteredUsers = users.filter((u) =>
    (nameFilter === "all" || u.id === nameFilter) &&
    (departmentFilter === "all" || u.department === departmentFilter) &&
    (groupFilter === "all" || u.group === groupFilter)
  );

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
      }}
    >
      Clear All Filters
    </button>
  </div>
</div>
      {groupedUsers.map((section, sIdx) => (
        <div key={sIdx}>
          {section.label && <h2 className="text-xl font-semibold mb-4">{groupBy === "department" ? "Department" : "Group"}: {section.label}</h2>}
          {section.users.map((user) => (
            <Card key={user.id} className="mb-6">
              <CardContent>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
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
                <Accordion type="multiple">
                  {weekDays.map((day, idx) => {
                    const dayEntries = user.entries.filter((e) => dayjs(e.clock_in_time).isSame(day, "day"));
                    if (dayEntries.length === 0) return null;
                    const totalDuration = dayEntries.reduce((acc, e) => acc.add(getDuration(e.clock_in_time, e.clock_out_time)), dayjs.duration(0));
                    return (
                      <AccordionItem key={idx} value={`day-${user.id}-${idx}`}>
                        <AccordionTrigger>
                          <div className="flex justify-between w-full">
                            <span>{day.format("ddd DD/MM/YYYY")} — {dayEntries.length} entries</span>
                            <span className="text-sm text-gray-600">Total: {formatDuration(totalDuration)}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Edit</TableHead>
                                <TableHead>Clock In</TableHead>
                                <TableHead>Clock Out</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Work Type</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dayEntries.map((entry, j) => (
                                <TableRow key={j}>
                                  <TableCell>
                                    <button onClick={() => openEditModal(entry)} title="Edit">✏️</button>
                                  </TableCell>
                                  <TableCell>{dayjs(entry.clock_in_time).format("HH:mm")}</TableCell>
                                  <TableCell>{entry.clock_out_time ? dayjs(entry.clock_out_time).format("HH:mm") : "—"}</TableCell>
                                  <TableCell>{entry.clock_out_time ? formatDuration(getDuration(entry.clock_in_time, entry.clock_out_time)) : "—"}</TableCell>
                                  <TableCell>{entry.project_id} - {entry.project_name}</TableCell>
                                  <TableCell>{entry.work_type_name}</TableCell>
                                  <TableCell>
                                    <select value={entry.status} onChange={(e) => handleStatusChange(entry.id, e.target.value)} className="border px-2 py-1 rounded text-sm">
                                      <option value="approved">Approved</option>
                                      <option value="pending">Pending</option>
                                    </select>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
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
                onChange={e =>
                  setModalData(prev => ({
                    ...prev,
                    clock_in_time: dayjs(editEntry.clock_in_time)
                      .hour(Number(e.target.value.split(":")[0]))
                      .minute(Number(e.target.value.split(":")[1]))
                      .format("YYYY-MM-DDTHH:mm"),
                  }))
                }
              />
              <label>Clock Out</label>
              <Input
                type="time"
                value={dayjs(modalData.clock_out_time).format("HH:mm")}
                onChange={e =>
                  setModalData(prev => ({
                    ...prev,
                    clock_out_time: dayjs(editEntry.clock_in_time)
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
              <label>Work Type</label>
              <select
                value={modalData.work_type_id}
                onChange={e => setModalData(prev => ({ ...prev, work_type_id: parseInt(e.target.value) }))}
                className="border px-2 py-1 rounded w-full"
              >
                <option value="">Select a work type</option>
                {workTypes
                  .filter(wt => wt.is_active)
                  .map(wt => (
                    <option key={wt.id} value={wt.id}>
                      {wt.title}
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
                        const res = await fetch(`http://localhost:3000/web-timeentries/${editEntry.id}`, {
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
              <label>Work Type</label>
              <select
                value={addData.work_type_id}
                onChange={e => setAddData(prev => ({ ...prev, work_type_id: parseInt(e.target.value) }))}
                className="border px-2 py-1 rounded w-full"
              >
                <option value="">Select a work type</option>
                {workTypes
                  .filter(wt => wt.is_active)
                  .map(wt => (
                    <option key={wt.id} value={wt.id}>
                      {wt.title}
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
