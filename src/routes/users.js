// Frontend: calls the backend API via ngrok
import axios from "axios";

const API_BASE_URL = "http://localhost:3000"; // Replace with your ngrok URL if needed

export async function fetchUsers() {
  const response = await axios.get(`${API_BASE_URL}/api/users`);
  return response.data;
}
