import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
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
import { PencilIcon } from "lucide-react";
import Modal from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import API_CONFIG, { buildUrl } from "../config/api";

export default function ProjectsPanel() {
  const [projects, setProjects] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [idFilter, setIdFilter] = useState("");
  const [titleFilter, setTitleFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const fetchProjects = () => {
    fetch(buildUrl(API_CONFIG.endpoints.projects, true))
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        setCurrentPage(1);
      })
      .catch((err) => alert("Failed to load projects: " + err.message));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    let data = [...projects];

    if (idFilter.trim()) data = data.filter((p) => p.id.toString().includes(idFilter.trim()));
    if (titleFilter.trim()) data = data.filter((p) => p.title.toLowerCase().includes(titleFilter.toLowerCase()));
    if (codeFilter.trim()) data = data.filter((p) => p.code.toLowerCase().includes(codeFilter.toLowerCase()));
    if (statusFilter !== "all") data = data.filter((p) => p.is_active === (statusFilter === "active"));
    if (fromDate) data = data.filter((p) => new Date(p.created_at) >= new Date(fromDate));
    if (toDate) data = data.filter((p) => new Date(p.created_at) <= new Date(toDate));

    data.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === "created_at") {
        valA = new Date(valA);
        valB = new Date(valB);
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFiltered(data);
  }, [idFilter, titleFilter, codeFilter, statusFilter, fromDate, toDate, projects, sortBy, sortOrder]);

  const clearFilters = () => {
    setIdFilter("");
    setTitleFilter("");
    setCodeFilter("");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const res = await fetch(buildUrl(`${API_CONFIG.endpoints.projects}/${id}/toggle`, true), { method: "PATCH" });
      if (!res.ok) throw new Error("Toggle failed");
      fetchProjects();
      alert("Project status toggled successfully.");
    } catch (err) {
      alert("Error toggling project: " + err.message);
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
    setModalOpen(false);
  };

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function ProjectFormModal({ isOpen, onClose, project, onSave }) {
    const [title, setTitle] = useState(project?.title ?? "");
    const [code, setCode] = useState(project?.code ?? "");
    const [isActive, setIsActive] = useState(project?.is_active ?? true);
    const [id, setId] = useState(project?.id ?? "");

    useEffect(() => {
      setTitle(project?.title ?? "");
      setCode(project?.code ?? "");
      setIsActive(project?.is_active ?? true);
      setId(project?.id ?? "");
    }, [project]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!title.trim() || !code.trim()) {
        alert("Please fill in all required fields.");
        return;
      }
      if (!project && (!/^\d{5,6}$/.test(id))) {
        alert("Project ID must be a 5 or 6 digit integer.");
        return;
      }

      const payload = { title, code, is_active: isActive };
      const fullPayload = project ? payload : { ...payload, id: Number(id) };

      try {
        let res;
        if (project) {
          res = await fetch(buildUrl(`${API_CONFIG.endpoints.projects}/${id}`, true), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } else {
          res = await fetch(buildUrl(API_CONFIG.endpoints.projects, true), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fullPayload),
          });
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Error saving project");
        }
        alert("Project saved successfully.");
        onSave();
        onClose();
      } catch (err) {
        alert("Error: " + err.message);
      }
    };

    return (
      <Modal isOpen={isOpen} onClose={onClose} title={project ? "Edit Project" : "Add Project"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {project ? (
            <div>
              <label className="block font-semibold mb-1">Project ID (read-only)</label>
              <input
                type="text"
                value={id}
                readOnly
                className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
              />
            </div>
          ) : (
            <div>
              <label className="block font-semibold mb-1" htmlFor="id">Project ID (5-6 digit integer)</label>
              <input
                id="id"
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1" htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1" htmlFor="code">Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1" htmlFor="is_active">Status</label>
            <select
              id="is_active"
              value={isActive ? "true" : "false"}
              onChange={(e) => setIsActive(e.target.value === "true")}
              className="w-full p-2 border rounded"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button variant="black" type="submit">{project ? "Save" : "Add"}</Button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={clearFilters}>Καθαρισμός Φίλτρων</Button>
          <Button variant="black" onClick={openAddModal}>+ Add Project</Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                {["id", "title", "code", "is_active", "created_at"].map((col) => (
                  <TableHead
                    key={col}
                    onClick={() => handleSort(col)}
                    className="cursor-pointer select-none font-semibold"
                  >
                    {col === "id" && "ID"}
                    {col === "title" && "Title"}
                    {col === "code" && "Code"}
                    {col === "is_active" && "Status"}
                    {col === "created_at" && "Created At"}
                    {sortBy === col && (sortOrder === "asc" ? " ▲" : " ▼")}
                  </TableHead>
                ))}
                <TableHead>Status</TableHead>
              </TableRow>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>
                  <Input placeholder="Φίλτρο" value={idFilter} onChange={(e) => setIdFilter(e.target.value)} />
                </TableHead>
                <TableHead>
                  <Input placeholder="Φίλτρο" value={titleFilter} onChange={(e) => setTitleFilter(e.target.value)} />
                </TableHead>
                <TableHead>
                  <Input placeholder="Φίλτρο" value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} />
                </TableHead>
                <TableHead>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Κατάσταση" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Όλες</SelectItem>
                      <SelectItem value="active">Ενεργές</SelectItem>
                      <SelectItem value="inactive">Ανενεργές</SelectItem>
                    </SelectContent>
                  </Select>
                </TableHead>
                <TableHead>
                  <div className="flex gap-2">
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-1/2" />
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-1/2" />
                  </div>
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginated.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(project)} title="Edit Project">
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell>{project.id}</TableCell>
                  <TableCell>{project.title}</TableCell>
                  <TableCell>{project.code}</TableCell>
                  <TableCell>
                    {project.is_active ? (
                      <span className="text-green-600 font-semibold">Ενεργό</span>
                    ) : (
                      <span className="text-red-600 font-semibold">Ανενεργό</span>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(project.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Σελίδα {currentPage} από {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                Προηγούμενη
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              >
                Επόμενη
              </Button>
            </div>
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
