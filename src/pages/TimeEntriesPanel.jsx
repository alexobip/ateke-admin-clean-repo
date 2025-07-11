import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import duration from "dayjs/plugin/duration";
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

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimeEntriesPanel() {
  const [entries, setEntries] = useState([]);
  const [weekStart, setWeekStart] = useState(dayjs().startOf("isoWeek"));
  const [weekStartDay, setWeekStartDay] = useState(4); // Thursday
  const [nameFilter, setNameFilter] = useState("all");
  const [groupBy, setGroupBy] = useState("none"); // none | department | group

  useEffect(() => {
    fetchEntries();
  }, [weekStart]);

  const fetchEntries = async () => {
    const res = await fetch(
      `http://localhost:3000/web-timeentries?week=${weekStart.format("YYYY-MM-DD")}`
    );
    const data = await res.json();
    setEntries(data);
  };

  const getCustomWeekDays = () => {
    const start = dayjs(weekStart).startOf("isoWeek");
    const base = start.day() <= weekStartDay
      ? start.add(weekStartDay - start.day(), "day")
      : start.add(7 - (start.day() - weekStartDay), "day");

    return Array(7)
      .fill(null)
      .map((_, i) => base.add(i, "day"));
  };

  const getDuration = (start, end) => {
    if (!start || !end) return dayjs.duration(0);
    const diff = dayjs(end).diff(dayjs(start), "minute");
    return dayjs.duration(diff, "minute");
  };

  const formatDuration = (dur) => {
    return `${dur.hours()}h ${dur.minutes().toString().padStart(2, "0")}m`;
  };

  const allUserIds = Array.from(new Set(entries.map((e) => e.user_id)));
  const users = allUserIds.map((id) => {
    const userEntries = entries.filter((e) => e.user_id === id);
    return {
      id,
      name: userEntries[0]?.user_name || id,
      department: userEntries[0]?.department_name || "Unknown",
      group: userEntries[0]?.group_name || "Unknown",
      entries: userEntries,
    };
  });

  const groupedUsers = (() => {
    if (groupBy === "none") {
      return [{ label: null, users }];
    }

    const grouped = {};
    users.forEach((user) => {
      const key = groupBy === "department" ? user.department : user.group;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(user);
    });

    return Object.entries(grouped).map(([label, users]) => ({ label, users }));
  })();

  const weekDays = getCustomWeekDays();

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm mb-1">Select Week:</label>
          <select
            className="border px-2 py-1 rounded"
            onChange={(e) => setWeekStart(dayjs(e.target.value))}
          >
            <option value={dayjs().startOf("isoWeek").format("YYYY-MM-DD")}>This Week</option>
            <option value={dayjs().subtract(1, "week").startOf("isoWeek").format("YYYY-MM-DD")}>
              Last Week
            </option>
            <option value="2025-07-07">Week of July 7, 2025</option>
          </select>
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
      </div>

      {/* Display */}
      {groupedUsers.map((section, sIdx) => (
        <div key={sIdx}>
          {section.label && (
            <h2 className="text-xl font-semibold mt-8 mb-4">{groupBy === "department" ? "Department" : "Group"}: {section.label}</h2>
          )}

          {section.users
            .filter(u => nameFilter === "all" || u.id === nameFilter)
            .map((user, uIdx) => (
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

                      const totalDuration = dayEntries.reduce((acc, e) => {
                        return acc.add(getDuration(e.clock_in_time, e.clock_out_time));
                      }, dayjs.duration(0));

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
                            {dayEntries.length === 0 ? (
                              <p className="text-gray-500 pl-2">No entries</p>
                            ) : (
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
                                      <TableCell className="capitalize">{entry.status}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
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
