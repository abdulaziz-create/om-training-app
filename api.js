import axios from 'axios';
const API_BASE = 'https://om-training-backend.onrender.com/api'; // Render backend URL

export async function fetchCenters(governorate){
  const res = await axios.get(`${API_BASE}/centers${governorate?('?governorate='+governorate):''}`);
  return res.data;
}
export async function fetchCenter(id){
  const res = await axios.get(`${API_BASE}/centers/${id}`);
  return res.data;
}
export async function fetchCourse(id){
  const res = await axios.get(`${API_BASE}/courses/${id}`);
  return res.data;
}
export async function createEnrollment(payload){
  const res = await axios.post(`${API_BASE}/enrollments`, payload);
  return res.data;
}
