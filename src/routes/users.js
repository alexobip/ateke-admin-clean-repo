// Frontend: calls the backend API 
import axios from "axios";
import API_CONFIG, { buildUrl } from "../config/api";

export async function fetchUsers() {
  const response = await axios.get(buildUrl(API_CONFIG.endpoints.users));
  return response.data;
}
