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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"; // Υπόθεση ότι υπάρχει
import { Edit2 } from "lucide-react"; // εικονίδιο μολυβιού
import Modal from "@/components/ui/modal";

function ProjectFormModal({ isOpen, onClose, project, onSave }) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [code, setCode] = useState(project?.code ?? "");
  const [isActive, setIsActive] = useState(
    project ? project.is_active : true
  );

  // Καθάρισμα όταν ανοίγει άλλο project
  useEffect(() => {
    setTitle(project?.title ?? "");
    setCode(project?.code ?? "");
    setIsActive(project ? project.is_active : true);
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title,
      code,
      is_active: isActive,
    };

    try {
      if (project?.id) {
        // Edit
        const res = await fetch(
          `https://timesheets-api-clean-dyfga7dfe2h8fkh6.westeurope-01.azurewebsites.net/webProjects/${project.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) throw new Error("Failed to update project");
      } else {
        // Add new
        const res = await fetch(
          `https://timesheets-api-clean-dyfga7dfe2h8fkh6.westeurope-01.azurewebsites.net/webProjects`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) throw new Error("Failed to create project");
      }

      onSave();
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? "Edit Project" : "Add Project"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {project?.id && (
          <div>
            <label className="block font-semibold mb-1">Project ID (read-only)</label>
            <input
              type="text"
              value={project.id}
              readOnly
              className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
            />
          </div>
        )}
        <div>
          <label className="block font-semibold mb-1" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1" htmlFor="code">
            Code
          </label>
          <input
            id="code"
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="flex items-center space-x-2">
          <label className="font-semibold">Active</label>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="black" type="submit">
            {project ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectsPanel() {
  const [projects, setProjects] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [idFilter, setIdFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [sortColumn, setSortColumn] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const fetchProjects = () => {
    fetch(
      "https://timesheets-api-clean-dyfga7dfe2h8fkh6.westeurope-01.azurewebsites.net/webProjects"
    )
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        setCurrentPage(1);
      })
      .catch((err) => console.error("Error loading projects:", err));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    let data = [...projects];

    if (idFilter.trim()) {
      data = data.filter((p) => p.id.toString().includes(idFilter.trim()));
    }
    if (titleFilter.trim()) {
      data = data.filter((p) =>
        p.title.toLowerCase().includes(titleFilter.toLowerCase())
      );
    }
    if (codeFilter.trim()) {
      data = data.filter((p) =>
        p.code.toLowerCase().includes(codeFilter.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      data = data.filter((p) => p.is_active === (statusFilter === "active"));
    }
    if (fromDate) {
      data = data.filter((p) => new Date(p.created_at) >= new Date(fromDate));
    }
    if (toDate) {
      data = data.filter((p) => new Date(p.created_at) <= new Date(toDate));
    }

    data.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setFiltered(data);
  }, [
    idFilter,
    titleFilter,
    codeFilter,
    statusFilter,
    fromDate,
    toDate,
    sortColumn,
    sortDirection,
    projects,
  ]);

  const toggleSort = (col) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setIdFilter("");
    setTitleFilter("");
    setCodeFilter("");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
  };

  const handleToggleActive = async (id) => {
    const res = await fetch(
      `https://timesheets-api-clean-dyfga7dfe2h8fkh6.westeurope-01.azurewebsites.net/webProjects/${id}/toggle`,
      { method: "PATCH" }
    );
    if (res.ok) {
      fetchProjects();
    }
  };

  const openAddModal = () => {
    setEditingProject(null);
    setModalOpen(true);
  };

  const openEditModal = (project) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleSave = () => {
    fetchProjects();
  };

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={clearFilters}>
            Καθαρισμός Φίλτρων
          </Button>
          <Button variant="black" onClick={openAddModal}>
            + Add Project
          </Button>
        </div>
      </div>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell />
                <TableCell
                  className="cursor-pointer"
                  onClick={() => toggleSort("id")}
                >
                  ID {sortColumn === "id" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </TableCell>
                <TableCell
                  className="cursor-pointer"
                  onClick={() => toggleSort("title")}
                >
                  Title {sortColumn === "title" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </TableCell>
                <TableCell
                  className="cursor-pointer"
                  onClick={() => toggleSort("code")}
                >
                  Code {sortColumn === "code" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </TableCell>
                <TableCell
                  className="cursor-pointer"
                  onClick={() => toggleSort("is_active")}
                >
                  Status {sortColumn === "is_active" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </TableCell>
                <TableCell
                  className="cursor-pointer"
                  onClick={() => toggleSort("created_at")}
                >
                  Created At {sortColumn === "created_at" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
              <TableRow>
                <TableCell />
                <TableCell>
                  <Input
                    placeholder="Filter"
                    value={idFilter}
                    onChange={(e) => setIdFilter(e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Filter"
                    value={titleFilter}
                    onChange={(e) => setTitleFilter(e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    placeholder="Filter"
                    value={codeFilter}
                    onChange={(e) => setCodeFilter(e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={fromDate}
                      placeholder="From"
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-1/2"
                    />
                    <Input
                      type="date"
                      value={toDate}
                      placeholder="To"
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-1/2"
                    />
                  </div>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(project)}
                      title="Edit Project"
                      className="text-black"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell>{project.id}</TableCell>
                  <TableCell>{project.title}</TableCell>
                  <TableCell>{project.code}</TableCell>
                  <TableCell>
                    <Switch
                      checked={project.is_active}
                      onCheckedChange={() => handleToggleActive(project.id)}
                      title="Toggle Active"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(project.created_at), "yyyy-MM-dd HH:mm")}
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end items-center gap-4 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="text-black"
            >
              Previous
            </Button>
            <span>
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="text-black"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProjectFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        project={editingProject}
        onSave={handleSave}
      />
    </div>
  );
}
