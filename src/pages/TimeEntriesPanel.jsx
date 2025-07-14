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
      )
        .map((d) => dayjs(d))
        .sort((a, b) => b.unix() - a.unix());

      setAvailableWeeks(weekStarts);
      if (!weekStart && weekStarts.length > 0) {
        setWeekStart(weekStarts[0]);
      }
    }
  }, [entries, weekStartDay]);

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
    const base = weekStart;
    return Array(7).fill(null).map((_, i) => base.add(i, "day"));
  };

  const getDuration = (start, end) => {
    if (!start || !end) return dayjs.duration(0);
    const diff = dayjs(end).diff(dayjs(start), "minute");
    return dayjs.duration(diff, "minute");
  };

  const formatDuration = (dur) =>
    `${dur.hours()}h ${dur.minutes().toString().padStart(2, "0")}m`;

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
      } else {
        console.error("Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const weekDays = weekStart ? getCustomWeekDays() : [];
  const entriesInWeek = entries.filter((e) =>
    weekStart &&
    dayjs(e.clock_in_time).isBetween(weekStart, weekStart.add(7, "day"), null, "[)")
  );

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

  const clearFilters = () => {
    setNameFilter("all");
    setDepartmentFilter("all");
    setGroupFilter("all");
    setGroupBy("none");
  };

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
            {availableWeeks.map((ws, i) => (
              <option key={i} value={ws.format("YYYY-MM-DD")}>
                Week of {ws.format("ddd DD/MM/YYYY")}
              </option>
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
            onClick={clearFilters}
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Results */}
      {groupedUsers.map((section, sIdx) => (
        <div key={sIdx}>
          {section.label && (
            <h2 className="text-xl font-semibold mt-8 mb-4">
              {groupBy === "department" ? "Department" : "Group"}: {section.label}
            </h2>
          )}

          {section.users.map((user, uIdx) => (
            <Card key={uIdx} className="mb-6">
              <CardContent className="pt-4">
                <h3 className="text-lg font-semibold mb-2">{user.name}</h3>

                <Accordion type="multiple">
                  {weekDays.map((day, dIdx) => {
                    const dayEntries = user.entries
                      .filter((e) => dayjs(e.clock_in_time).isSame(day, "day"))
                      .sort((a, b) =>
                        dayjs(a.clock_in_time).isBefore(dayjs(b.clock_in_time)) ? -1 : 1
                      );

                    if (dayEntries.length === 0) return null;

                    const totalDuration = dayEntries.reduce((acc, e) =>
                      acc.add(getDuration(e.clock_in_time, e.clock_out_time)),
                      dayjs.duration(0)
                    );

                    return (
                      <AccordionItem key={dIdx} value={`day-${user.id}-${dIdx}`}>
                        <AccordionTrigger className="flex justify-between text-left font-medium py-2">
                          <div className="flex justify-between w-full">
                            <span>{day.format("ddd DD/MM/YYYY")} — {dayEntries.length} entries</span>
                            <span className="text-sm text-gray-600">
                              Total: {formatDuration(totalDuration)}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
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
                                  <TableCell>{dayjs(entry.clock_in_time).format("HH:mm")}</TableCell>
                                  <TableCell>
                                    {entry.clock_out_time
                                      ? dayjs(entry.clock_out_time).format("HH:mm")
                                      : "—"}
                                  </TableCell>
                                  <TableCell>
                                    {entry.clock_out_time
                                      ? formatDuration(getDuration(entry.clock_in_time, entry.clock_out_time))
                                      : "—"}
                                  </TableCell>
                                  <TableCell>{entry.project_id} - {entry.project_name}</TableCell>
                                  <TableCell>{entry.work_type_name}</TableCell>
                                  <TableCell>
                                    <select
                                      value={entry.status}
                                      className="border px-2 py-1 rounded text-sm"
                                      onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                                    >
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
    </div>
  );
}
